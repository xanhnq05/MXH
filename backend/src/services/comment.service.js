// Comment service.

import Comment from "../models/Comment.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { notificationService } from "./notification.service.js";
import { paginate } from "../utils/pagination.js";

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
