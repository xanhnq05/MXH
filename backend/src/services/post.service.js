// Post service — CRUD post, like, newsfeed.

import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Friendship from "../models/Friendship.js";
import Block from "../models/Block.js";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadService } from "./upload.service.js";
import { paginate } from "../utils/pagination.js";
import { notificationService } from "./notification.service.js";
import cache from "../libs/cache.js";

const stripDeleted = (post) => {
  if (post.deletedAt) {
    return { _id: post._id, deleted: true, deletedAt: post.deletedAt };
  }
  return post;
};

export const postService = {
  async create(authorId, { content, visibility, files }) {
    if (!content && (!files || files.length === 0)) {
      throw new ApiError(400, "Bài viết phải có nội dung hoặc media");
    }
    const media = [];
    if (files && files.length) {
      const uploaded = await uploadService.uploadMany({
        files,
        folder: "posts",
        userId: authorId,
      });
      for (let i = 0; i < uploaded.length; i++) {
        const f = uploaded[i];
        const orig = files[i];
        media.push({
          type: orig.mimetype.startsWith("video") ? "video" : "image",
          url: f.url,
          storageKey: f.key,
          size: f.size,
        });
      }
    }
    const post = await Post.create({
      authorId,
      content: content || "",
      media,
      visibility: visibility || "public",
    });
    await post.populate("authorId", "username displayName avatarUrl");

    // Invalidate feed cache cua author (de bai moi xuat hien ngay)
    await cache.delPattern(`feed:user:${authorId.toString()}:*`);

    return post.toClient();
  },

  async getById(meId, postId) {
    const post = await Post.findById(postId).populate(
      "authorId",
      "username displayName avatarUrl"
    );
    if (!post || post.deletedAt) throw new ApiError(404, "Bài viết không tồn tại");

    // Check quyền xem
    await this._assertCanView(meId, post);

    return stripDeleted(post);
  },

  async _assertCanView(meId, post) {
    if (post.authorId._id.toString() === meId.toString()) return;
    if (post.visibility === "private")
      throw new ApiError(403, "Không có quyền xem bài viết này");
    if (post.visibility === "friends") {
      const isFriend = await Friendship.findOne({
        $or: [
          { requester: meId, recipient: post.authorId._id, status: "accepted" },
          { requester: post.authorId._id, recipient: meId, status: "accepted" },
        ],
      });
      if (!isFriend) throw new ApiError(403, "Bài viết chỉ dành cho bạn bè");
    }
  },

  async update(meId, postId, payload) {
    const post = await Post.findById(postId);
    if (!post || post.deletedAt) throw new ApiError(404, "Bài viết không tồn tại");
    if (post.authorId.toString() !== meId.toString())
      throw new ApiError(403, "Không có quyền sửa bài viết này");
    if (payload.content !== undefined) post.content = payload.content;
    if (payload.visibility) post.visibility = payload.visibility;
    await post.save();
    await post.populate("authorId", "username displayName avatarUrl");
    return post.toClient();
  },

  async softDelete(meId, postId) {
    const post = await Post.findById(postId);
    if (!post || post.deletedAt) throw new ApiError(404, "Bài viết không tồn tại");
    if (post.authorId.toString() !== meId.toString())
      throw new ApiError(403, "Không có quyền xoá");
    post.deletedAt = new Date();
    post.content = "";
    post.media = [];
    await post.save();
    return { success: true };
  },

  /** Like / Unlike — toggle */
  async likePost(meId, postId) {
    const post = await Post.findOneAndUpdate(
      { _id: postId, deletedAt: null, likes: { $ne: meId } },
      { $addToSet: { likes: meId }, $inc: { likeCount: 1 } },
      { new: true }
    );
    if (!post) {
      // Co the post khong ton tai, hoac da like roi (idempotent - tra ve likeCount hien tai)
      const existing = await Post.findOne({ _id: postId, deletedAt: null }).select(
        "likeCount likes"
      );
      if (!existing) throw new ApiError(404, "Bài viết không tồn tại");
      const alreadyLiked = existing.likes.some(
        (id) => id.toString() === meId.toString()
      );
      if (alreadyLiked) {
        // Idempotent: user da like roi -> tra ve trang thai hien tai, khong bao loi
        return { liked: true, likeCount: existing.likeCount };
      }
      throw new ApiError(404, "Bài viết không tồn tại");
    }
    await notificationService.push({
      recipientId: post.authorId,
      senderId: meId,
      type: "post_like",
      refId: post._id,
    });
    return { liked: true, likeCount: post.likeCount };
  },

  async unlikePost(meId, postId) {
    const post = await Post.findOneAndUpdate(
      { _id: postId, deletedAt: null, likes: meId },
      { $pull: { likes: meId }, $inc: { likeCount: -1 } },
      { new: true }
    );
    if (!post) {
      // Idempotent: chua like cung khong loi
      const existing = await Post.findOne({ _id: postId, deletedAt: null }).select(
        "likeCount likes"
      );
      if (!existing) throw new ApiError(404, "Bài viết không tồn tại");
      const stillLiked = existing.likes.some(
        (id) => id.toString() === meId.toString()
      );
      if (!stillLiked) {
        return { liked: false, likeCount: existing.likeCount };
      }
      throw new ApiError(404, "Bài viết không tồn tại");
    }
    return { liked: false, likeCount: Math.max(0, post.likeCount) };
  },

  // ================== NEWSFEED ==================
  async getFeed(meId, { cursor, limit = 20 } = {}) {
    // Cache 60s: feed user thuong doi it, query friends+blocks+posts ton time
    const cacheKey = `feed:user:${meId.toString()}:cursor:${cursor || "first"}:limit:${limit}`;
    if (!cursor) {
      // Cache chi ap dung cho trang dau (cursor=null)
      const cached = await cache.get(cacheKey);
      if (cached) return cached;
    }

    // Bạn bè
    const friends = await Friendship.find({
      $or: [{ requester: meId }, { recipient: meId }],
      status: "accepted",
    });
    const friendIds = new Set();
    friends.forEach((f) => {
      friendIds.add(f.requester.toString());
      friendIds.add(f.recipient.toString());
    });

    // User đã chặn / bị chặn → loại khỏi feed
    const blocks = await Block.find({
      $or: [{ blocker: meId }, { blocked: meId }],
    });
    const blockedIds = new Set();
    blocks.forEach((b) => {
      blockedIds.add(b.blocker.toString());
      blockedIds.add(b.blocked.toString());
    });

    const friendIdList = Array.from(friendIds).filter(
      (id) => !blockedIds.has(id) && id !== meId.toString()
    );

    const filter = {
      deletedAt: null,
      $or: [
        { authorId: meId }, // bài của mình
        { authorId: { $in: friendIdList }, visibility: "friends" },
        { authorId: { $in: friendIdList }, visibility: "public" },
        { visibility: "public", authorId: { $nin: Array.from(blockedIds) } },
      ],
    };

    const { items, nextCursor } = await paginate({
      model: Post,
      filter,
      cursor,
      limit,
      populate: [{ path: "authorId", select: "username displayName avatarUrl" }],
    });
    const cleaned = items.map((p) => p.toClient ? p.toClient() : p);
    const result = { items: cleaned, nextCursor };

    // Cache 60s cho trang dau
    if (!cursor) {
      await cache.set(cacheKey, result, 60);
    }
    return result;
  },

  async listByUser(meId, targetId, { cursor, limit = 20 } = {}) {
    // Xem bài của targetUser
    const isMe = meId.toString() === targetId.toString();
    const filter = { authorId: targetId, deletedAt: null };
    if (!isMe) {
      filter.$or = [
        { visibility: "public" },
        // bạn bè: kiểm tra riêng
      ];
    }
    const { items, nextCursor } = await paginate({
      model: Post,
      filter,
      cursor,
      limit,
      populate: [{ path: "authorId", select: "username displayName avatarUrl" }],
    });

    let result = items;
    if (!isMe) {
      const isFriend = await Friendship.findOne({
        $or: [
          { requester: meId, recipient: targetId, status: "accepted" },
          { requester: targetId, recipient: meId, status: "accepted" },
        ],
      });
      result = isFriend
        ? items.filter(
            (p) => p.visibility === "public" || p.visibility === "friends"
          )
        : items.filter((p) => p.visibility === "public");
    }

    return {
      items: result.map((p) => (p.toClient ? p.toClient() : p)),
      nextCursor,
    };
  },
};
