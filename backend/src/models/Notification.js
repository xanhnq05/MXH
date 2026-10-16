// Notification — thông báo.
// type: friend_request | friend_accept | post_like | post_comment | comment_reply |
//       new_message | added_to_group | call_missed | system

import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    type: { type: String, required: true },
    refId: { type: mongoose.Schema.Types.ObjectId }, // tham chiếu tuỳ type (postId, messageId, conversationId, ...)
    meta: { type: mongoose.Schema.Types.Mixed }, // payload bổ sung
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
