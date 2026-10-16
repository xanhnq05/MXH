// Post service — CRUD post, like, newsfeed.

import mongoose from "mongoose";
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
import { emitToUser } from "../libs/socket.js";
import { assertNotBlocked } from "../utils/blockGuard.js";

const stripDeleted = (post) => {
  if (post.deletedAt) {
    return { _id: post._id, deleted: true, deletedAt: post.deletedAt };
  }
  return post;
};

export const postService = {
  async create(authorId, { content, visibility, files, tags }) {
    if (!content && (!files || files.length === 0)) {
      throw new ApiError(400, "Bài viết phải có nội dung hoặc media");
    }
    const media = [];
    const uploadedKeys = []; // track de cleanup neu DB fail
    try {
      if (files && files.length) {
        const uploaded = await uploadService.uploadMany({
          files,
          folder: "posts",
          userId: authorId,
        });
        for (let i = 0; i < uploaded.length; i++) {
          const f = uploaded[i];
          const orig = files[i];
          uploadedKeys.push(f.key);
          media.push({
            type: orig.mimetype.startsWith("video") ? "video" : "image",
            url: f.url,
            storageKey: f.key,
            size: f.size,
          });
        }
      }
      // Sanitize tags: lowercase, trim, bỏ rỗng, dedupe, max 10 tag
      const cleanTags = Array.isArray(tags)
        ? [
            ...new Set(
              tags
                .map((t) =>
                  String(t)
                    .toLowerCase()
                    .trim()
                    .replace(/^#/, "")
                )
                .filter((t) => t.length > 0 && t.length <= 30)
            ),
          ].slice(0, 10)
        : [];
      const post = await Post.create({
        authorId,
        content: content || "",
        media,
        visibility: visibility || "public",
        tags: cleanTags,
      });
      await post.populate("authorId", "username displayName avatarUrl");

      // Invalidate feed cache cua author (de bai moi xuat hien ngay)
      await cache.delPattern(`feed:user:${authorId.toString()}:*`);

      return post.toClient(authorId);
    } catch (err) {
      // Cleanup: neu DB create fail, xoa file da upload (orphan)
      if (uploadedKeys.length) {
        console.warn(
          `[post.create] DB fail, cleaning up ${uploadedKeys.length} uploaded file(s):`,
          err.message
        );
        await Promise.allSettled(
          uploadedKeys.map((k) => uploadService.deleteFile(k))
        );
      }
      throw err;
    }
  },

  async getById(meId, postId) {
    const post = await Post.findById(postId).populate(
      "authorId",
      "username displayName avatarUrl"
    );
    if (!post || post.deletedAt) throw new ApiError(404, "Bài viết không tồn tại");

    // Check quyền xem
    await this._assertCanView(meId, post);

    // Block guard: nếu 1 trong 2 chặn nhau → 403
    await assertNotBlocked(meId, post.authorId._id, { strict: true });

    return post.toClient(meId);
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
    if (Array.isArray(payload.tags)) {
      post.tags = [
        ...new Set(
          payload.tags
            .map((t) =>
              String(t)
                .toLowerCase()
                .trim()
                .replace(/^#/, "")
            )
            .filter((t) => t.length > 0 && t.length <= 30)
        ),
      ].slice(0, 10);
    }
    await post.save();
    await post.populate("authorId", "username displayName avatarUrl");
    return post.toClient(meId);
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
        return { liked: true, isLiked: true, likeCount: existing.likeCount };
      }
      throw new ApiError(404, "Bài viết không tồn tại");
    }
    // Invalidate feed cache cua cac user nhan duoc bai nay
    await this._invalidateFeedCacheForPost(postId);
    // Broadcast realtime
    emitToUser(post.authorId.toString(), "post:like", {
      postId: post._id.toString(),
      likeCount: post.likeCount,
      userId: meId.toString(),
    });
    await notificationService.push({
      recipientId: post.authorId,
      senderId: meId,
      type: "post_like",
      refId: post._id,
    });
    return { liked: true, isLiked: true, likeCount: post.likeCount };
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
        return { liked: false, isLiked: false, likeCount: existing.likeCount };
      }
      throw new ApiError(404, "Bài viết không tồn tại");
    }
    await this._invalidateFeedCacheForPost(postId);
    emitToUser(post.authorId.toString(), "post:unlike", {
      postId: post._id.toString(),
      likeCount: Math.max(0, post.likeCount),
      userId: meId.toString(),
    });
    return { liked: false, isLiked: false, likeCount: Math.max(0, post.likeCount) };
  },

  /**
   * Invalidate feed cache cua user nao co the dang xem bai nay trong feed.
   * De don gian: xoa feed cua author (vi author always xem duoc bai cua minh)
   * va pattern feed:user:*:cursor:first (trang dau co bai nay).
   * Trade-off: invalidate nhieu hon can, nhung dam bao consistency.
   */
  async _invalidateFeedCacheForPost(postId) {
    const post = await Post.findById(postId).select("authorId");
    if (!post) return;
    // Trang dau cua feed cua author (de ho xem likeCount moi)
    await cache.delPattern(`feed:user:${post.authorId.toString()}:*`);
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
    const cleaned = items.map((p) => (p.toClient ? p.toClient(meId) : p));
    const result = { items: cleaned, nextCursor };

    // Cache 60s cho trang dau
    if (!cursor) {
      await cache.set(cacheKey, result, 60);
    }
    return result;
  },

  async listByUser(meId, targetId, { cursor, limit = 20, year, tag, authorId: filterAuthorId } = {}) {
    // Xem bài của targetUser
    const isMe = meId.toString() === targetId.toString();
    if (!isMe) {
      // Block guard strict: nếu 2 chiều chặn → từ chối
      await assertNotBlocked(meId, targetId, { strict: true });
    }
    const filter = { authorId: targetId, deletedAt: null };
    if (!isMe) {
      filter.$or = [
        { visibility: "public" },
        // bạn bè: kiểm tra riêng
      ];
    }
    // Filter theo năm (dùng createdAt)
    if (year) {
      const yearNum = parseInt(year, 10);
      if (!isNaN(yearNum)) {
        const start = new Date(Date.UTC(yearNum, 0, 1));
        const end = new Date(Date.UTC(yearNum + 1, 0, 1));
        filter.createdAt = { $gte: start, $lt: end };
      }
    }
    // Filter theo tag
    if (tag) {
      filter.tags = String(tag).toLowerCase().replace(/^#/, "");
    }
    // Filter theo tác giả cụ thể (khi list của admin, có thể filter trong cùng 1 user)
    if (filterAuthorId) {
      filter.authorId = filterAuthorId;
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
      items: result.map((p) => (p.toClient ? p.toClient(meId) : p)),
      nextCursor,
    };
  },

  /**
   * Lấy danh sách user đã thích bài viết
   * - Cursor pagination
   * - Chỉ author mới xem được
   */
  async getLikers(meId, postId, { cursor, limit = 50 } = {}) {
    const post = await Post.findOne({ _id: postId, deletedAt: null }).select(
      "authorId likes"
    );
    if (!post) throw new ApiError(404, "Bài viết không tồn tại");
    // Tác giả xem được toàn bộ. Người khác cũng có thể xem (giống IG)
    // Nhưng check quyền xem bài viết trước:
    await this._assertCanView(meId, post);

    // Lấy paginated list user từ likes
    const likeIds = post.likes || [];
    const User = (await import("../models/User.js")).default;
    // Reverse để user mới like lên đầu
    const reversed = likeIds.slice().reverse();
    let start = 0;
    if (cursor) {
      const idx = reversed.findIndex(
        (id) => id.toString() === cursor.toString()
      );
      if (idx >= 0) start = idx + 1;
    }
    const page = reversed.slice(start, start + limit);
    const users = await User.find({ _id: { $in: page } }).select(
      "username displayName avatarUrl"
    );
    // Map _id -> user
    const map = new Map(users.map((u) => [u._id.toString(), u]));
    const ordered = page
      .map((id) => map.get(id.toString()))
      .filter(Boolean);
    const nextCursor = start + limit < reversed.length ? page[page.length - 1] : null;

    return {
      total: likeIds.length,
      items: ordered.map((u) => ({
        _id: u._id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
      })),
      nextCursor,
    };
  },

  /**
   * Lấy danh sách năm có bài viết của user (dùng cho filter)
   */
  async getUserPostYears(targetId) {
    const years = await Post.aggregate([
      { $match: { authorId: new mongoose.Types.ObjectId(targetId), deletedAt: null } },
      {
        $group: {
          _id: { $year: "$createdAt" },
        },
      },
      { $sort: { _id: -1 } },
    ]);
    return years.map((y) => y._id);
  },

  /**
   * Lấy tất cả tags của user (unique, sorted by count desc)
   */
  async getUserTags(targetId) {
    const tags = await Post.aggregate([
      { $match: { authorId: new mongoose.Types.ObjectId(targetId), deletedAt: null, tags: { $exists: true, $ne: [] } } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]);
    return tags.map((t) => ({ tag: t._id, count: t.count }));
  },

  /**
   * Tìm kiếm bài viết theo nội dung / hashtag / tác giả.
   * Tính điểm liên quan:
   *  - match exact hashtag: cao nhất
   *  - match content (regex escape): trung bình
   *  - author là bạn bè: tăng điểm
   * Áp dụng filter quyền xem theo visibility (private/friends/public).
   * Nếu user truyền q có prefix "#" thì chỉ filter theo tag đó.
   */
  async search(meId, rawQ, { cursor, limit = 20, type } = {}) {
    const q = String(rawQ || "").trim();
    if (!q) return { items: [], nextCursor: null };
    if (q.length < 2) return { items: [], nextCursor: null };

    // Bạn bè
    const friends = await Friendship.find({
      $or: [{ requester: meId }, { recipient: meId }],
      status: "accepted",
    }).select("requester recipient");
    const friendIdSet = new Set();
    friends.forEach((f) => {
      friendIdSet.add(f.requester.toString());
      friendIdSet.add(f.recipient.toString());
    });
    friendIdSet.delete(meId.toString());

    // Block
    const blocks = await Block.find({
      $or: [{ blocker: meId }, { blocked: meId }],
    }).select("blocker blocked");
    const blockedSet = new Set();
    blocks.forEach((b) => {
      blockedSet.add(b.blocker.toString());
      blockedSet.add(b.blocked.toString());
    });

    // ===== Build filter =====
    const filter = { deletedAt: null };

    // Quyền xem:
    // - public: ai cũng thấy (trừ block)
    // - friends: chỉ bạn bè + chính chủ
    // - private: chỉ chính chủ
    filter.$or = [
      { authorId: meId, visibility: { $in: ["public", "friends", "private"] } },
      { visibility: "public", authorId: { $nin: Array.from(blockedSet) } },
      { visibility: "friends", authorId: { $in: Array.from(friendIdSet) } },
    ];

    // Tag-only search khi bắt đầu bằng "#"
    if (q.startsWith("#")) {
      const tag = q.slice(1).toLowerCase().trim();
      if (!tag) return { items: [], nextCursor: null };
      filter.tags = tag;
    } else {
      // Tìm theo nội dung
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const contentRegex = new RegExp(escaped, "i");
      // Hoặc theo tag (substring match nếu user gõ không có #)
      filter.$and = [
        {
          $or: [
            { content: { $regex: contentRegex } },
            { tags: { $regex: `^${escaped}$`, $options: "i" } },
          ],
        },
      ];
    }

    // Lọc theo type (nếu frontend yêu cầu): 'all' | 'hashtag' | 'user'
    // Hiện tại 'all' = cả 2; frontend sẽ tự nhóm.

    const { items, nextCursor } = await paginate({
      model: Post,
      filter,
      cursor,
      limit,
      sort: { createdAt: -1, _id: -1 },
      populate: [{ path: "authorId", select: "username displayName avatarUrl" }],
    });

    // Tính relevance score cho từng post
    const lcQ = q.toLowerCase().replace(/^#/, "");
    const scored = items.map((p) => {
      let score = 0;
      const content = (p.content || "").toLowerCase();
      if (p.tags?.some((t) => t.toLowerCase() === lcQ)) score += 50;
      if (p.tags?.some((t) => t.toLowerCase().includes(lcQ))) score += 20;
      if (content === lcQ) score += 40;
      else if (content.includes(lcQ)) score += 15;
      if (friendIdSet.has(p.authorId._id.toString())) score += 10;
      return { post: p, score };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.post.createdAt) - new Date(a.post.createdAt);
    });

    return {
      items: scored.map((s) =>
        s.post.toClient ? s.post.toClient(meId) : s.post
      ),
      nextCursor,
    };
  },
};
