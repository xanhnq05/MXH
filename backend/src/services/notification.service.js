// Notification service — push vào DB + bắn realtime qua socket.

import Notification from "../models/Notification.js";
import { emitToUser } from "../libs/socket.js";

const NOTIFICATION_ICONS = {
  friend_request: "👋",
  friend_accept: "🤝",
  post_like: "❤️",
  post_comment: "💬",
  comment_reply: "↩️",
  new_message: "✉️",
  added_to_group: "👥",
  call_missed: "📞",
  system: "ℹ️",
};

const HUMAN_TEXT = {
  friend_request: "đã gửi lời mời kết bạn",
  friend_accept: "đã chấp nhận lời mời kết bạn",
  post_like: "đã thích bài viết của bạn",
  post_comment: "đã bình luận bài viết của bạn",
  comment_reply: "đã trả lời bình luận của bạn",
  new_message: "đã gửi cho bạn một tin nhắn",
  added_to_group: "đã thêm bạn vào nhóm",
  call_missed: "đã gọi cho bạn (cuộc gọi nhỡ)",
  system: "thông báo hệ thống",
};

export const notificationService = {
  /** Tạo notification mới + đẩy realtime */
  async push({ recipientId, senderId, type, refId, meta }) {
    if (recipientId.toString() === senderId?.toString()) return null; // không tự gửi cho mình

    // Lấy thông tin người gửi để hiển thị
    let senderName = "Một người";
    let senderAvatar = "";
    try {
      const { default: User } = await import("../models/User.js");
      const sender = await User.findById(senderId).select("displayName avatarUrl username").lean();
      if (sender) {
        senderName = sender.displayName || sender.username || senderName;
        senderAvatar = sender.avatarUrl || "";
      }
    } catch {}

    const notif = await Notification.create({
      recipientId,
      senderId,
      type,
      refId,
      meta,
    });
    const payload = {
      _id: notif._id,
      type: notif.type,
      senderId: notif.senderId,
      refId: notif.refId,
      meta: notif.meta,
      icon: NOTIFICATION_ICONS[type] || "🔔",
      text: HUMAN_TEXT[type] || "có thông báo mới",
      senderName,
      senderAvatar,
      isRead: false,
      createdAt: notif.createdAt,
    };
    emitToUser(recipientId.toString(), "notification:new", payload);
    return notif;
  },

  async list(meId, { cursor, limit = 20, unreadOnly = false } = {}) {
    const filter = { recipientId: meId };
    if (unreadOnly) filter.isRead = false;

    const { paginate } = await import("../utils/pagination.js");
    const { items, nextCursor } = await paginate({
      model: Notification,
      filter,
      cursor,
      limit,
      populate: [
        { path: "senderId", select: "username displayName avatarUrl" },
      ],
    });
    return { items, nextCursor };
  },

  async markRead(meId, notifId) {
    const n = await Notification.findOneAndUpdate(
      { _id: notifId, recipientId: meId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!n) throw new Error("Không tìm thấy thông báo");
    return n;
  },

  async markAllRead(meId) {
    await Notification.updateMany(
      { recipientId: meId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return { success: true };
  },

  async unreadCount(meId) {
    return Notification.countDocuments({ recipientId: meId, isRead: false });
  },
};
