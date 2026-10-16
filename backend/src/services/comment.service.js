// Comment service.

import Comment from "../models/Comment.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { notificationService } from "./notification.service.js";
import { paginate } from "../utils/pagination.js";
import { emitToUser } from "../libs/socket.js";
import cache from "../libs/cache.js";

export const commentService = {
  async create(meId, postId, { content, parentId }) {
    const post = await Post.findOne({ _id: postId, deletedAt: null });
    if (!post) throw new ApiError(404, "Bài viết không tồn tại");

    if (parentId) {
      const parent = await Comment.findById(parentId);
      if (!parent) throw new ApiError(404, "Bình luận cha không tồn tại");
      if (parent.postId.toString() !== postId)
        throw new ApiError(400, "Bình luận cha không thuộc bài viết này");
    }

    const comment = await Comment.create({
      postId,
      authorId: meId,
      parentId: parentId || null,
      content,
    });

    post.commentCount += 1;
    await post.save();

    await comment.populate("authorId", "username displayName avatarUrl");

    // Invalidate feed + comment list cache
    await cache.delPattern(`feed:user:${post.authorId.toString()}:*`);
    await cache.delPattern(`comments:post:${postId}:*`);

    // Realtime broadcast
    emitToUser(post.authorId.toString(), "post:comment", {
      postId: post._id.toString(),
      comment: comment.toObject ? comment.toObject() : comment,
      commentCount: post.commentCount,
    });
    if (parentId) {
      const parent = await Comment.findById(parentId);
      if (parent && parent.authorId.toString() !== meId.toString()) {
        await notificationService.push({
          recipientId: parent.authorId,
          senderId: meId,
          type: "comment_reply",
          refId: comment._id,
          meta: { postId },
        });
        emitToUser(parent.authorId.toString(), "comment:reply", {
          postId,
          comment: comment.toObject ? comment.toObject() : comment,
        });
      }
    } else {
      if (post.authorId.toString() !== meId.toString()) {
        await notificationService.push({
          recipientId: post.authorId,
          senderId: meId,
          type: "post_comment",
          refId: comment._id,
          meta: { postId },
        });
      }
    }

    return comment;
  },

  async list(postId, { cursor, limit = 20, parentId = null } = {}) {
    // Cache 60s cho trang dau, moi post
    if (!cursor) {
      const cacheKey = `comments:post:${postId}:parent:${parentId || "root"}`;
      const cached = await cache.get(cacheKey);
      if (cached) return cached;
      const result = await this._fetchComments(postId, cursor, limit, parentId);
      await cache.set(cacheKey, result, 60);
      return result;
    }
    return this._fetchComments(postId, cursor, limit, parentId);
  },

  async _fetchComments(postId, cursor, limit, parentId) {
    const filter = { postId, parentId, deletedAt: null };
    const { items, nextCursor } = await paginate({
      model: Comment,
      filter,
      cursor,
      limit,
      populate: [{ path: "authorId", select: "username displayName avatarUrl" }],
    });
    return { items, nextCursor };
  },

  async update(meId, commentId, { content }) {
    const c = await Comment.findById(commentId);
    if (!c || c.deletedAt) throw new ApiError(404, "Bình luận không tồn tại");
    if (c.authorId.toString() !== meId.toString())
      throw new ApiError(403, "Không có quyền sửa");
    c.content = content;
    await c.save();
    await c.populate("authorId", "username displayName avatarUrl");
    return c;
  },

  async softDelete(meId, commentId) {
    const c = await Comment.findById(commentId);
    if (!c || c.deletedAt) throw new ApiError(404, "Bình luận không tồn tại");
    if (c.authorId.toString() !== meId.toString())
      throw new ApiError(403, "Không có quyền xoá");
    c.deletedAt = new Date();
    c.content = "[đã xoá]";
    await c.save();
    await Post.findByIdAndUpdate(c.postId, { $inc: { commentCount: -1 } });
    return { success: true };
  },
};
