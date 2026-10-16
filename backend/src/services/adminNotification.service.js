// Admin Notification service — gửi thông báo từ admin.
// Hỗ trợ 3 mode:
//   - broadcast: gửi tới TẤT CẢ user (active, chưa bị cấm)
//   - filter:   gửi theo bộ lọc (country, isBanned, ...)
//   - targeted: gửi tới 1 hoặc nhiều userId cụ thể
//
// Mỗi notif sẽ được insert vào Notification collection (giống notification thường)
// + emit realtime socket notification:new cho từng user.

import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { emitToUser } from "../libs/socket.js";

const NOTIFICATION_ICONS = {
  admin_announcement: "📢",
  admin_warning: "⚠️",
  admin_promo: "🎁",
  admin_maintenance: "🛠️",
};

const HUMAN_TEXT = {
  admin_announcement: "Thông báo từ Admin",
  admin_warning: "Cảnh báo từ Admin",
  admin_promo: "Khuyến mãi từ Admin",
  admin_maintenance: "Bảo trì hệ thống",
};

/**
 * Tạo notification cho 1 user (không emit realtime).
 * Trả về document notification.
 */
async function buildOne({ recipientId, senderId, type, title, message, link }) {
  const meta = {
    title,
    message,
    icon: NOTIFICATION_ICONS[type] || "📢",
    link: link || null,
    fromAdmin: true,
  };
  return Notification.create({
    recipientId,
    senderId,
    type,
    meta,
  });
}

/** Emit realtime notification:new tới 1 user */
function emitOne(userId, notif, { title, message, link, type }) {
  emitToUser(userId.toString(), "notification:new", {
    _id: notif._id,
    type: notif.type,
    senderId: notif.senderId,
    refId: notif.refId,
    meta: notif.meta,
    icon: NOTIFICATION_ICONS[type] || "📢",
    text: title || HUMAN_TEXT[type] || "Thông báo từ Admin",
    senderName: "Quản trị viên",
    senderAvatar: "",
    title,
    message,
    link: link || null,
    isRead: false,
    createdAt: notif.createdAt,
  });
}

export const adminNotificationService = {
  /**
   * Gửi broadcast - tới toàn bộ user active (không bị banned, không bị xoá).
   * @param {Object} params
   * @param {String} params.type      - admin_announcement | admin_warning | admin_promo | admin_maintenance
   * @param {String} params.title     - tiêu đề
   * @param {String} params.message   - nội dung
   * @param {String} [params.link]    - link tuỳ chọn
   * @param {ObjectId} params.senderId - admin id
   */
  async broadcast({ type, title, message, link, senderId }) {
    const userIds = await User.find({
      isDeleted: { $ne: true },
      isBanned: { $ne: true },
    })
      .select("_id")
      .lean();

    if (!userIds.length) {
      return { sent: 0, totalUsers: 0 };
    }

    // Insert hàng loạt
    const docs = userIds.map((u) => ({
      recipientId: u._id,
      senderId,
      type,
      meta: {
        title,
        message,
        icon: NOTIFICATION_ICONS[type] || "📢",
        link: link || null,
        fromAdmin: true,
      },
    }));

    const result = await Notification.insertMany(docs, { ordered: false });

    // Emit realtime cho từng user
    result.forEach((notif, idx) => {
      emitOne(userIds[idx]._id, notif, { type, title, message, link });
    });

    return { sent: result.length, totalUsers: userIds.length };
  },

  /**
   * Gửi theo filter (country, isBanned, ...).
   */
  async sendByFilter({ type, title, message, link, senderId, filter = {} }) {
    const query = { ...filter, isDeleted: { $ne: true } };
    const userIds = await User.find(query).select("_id").lean();

    if (!userIds.length) return { sent: 0, totalUsers: 0 };

    const docs = userIds.map((u) => ({
      recipientId: u._id,
      senderId,
      type,
      meta: {
        title,
        message,
        icon: NOTIFICATION_ICONS[type] || "📢",
        link: link || null,
        fromAdmin: true,
      },
    }));

    const result = await Notification.insertMany(docs, { ordered: false });
    result.forEach((notif, idx) => {
      emitOne(userIds[idx]._id, notif, { type, title, message, link });
    });

    return { sent: result.length, totalUsers: userIds.length };
  },

  /**
   * Gửi tới 1 hoặc nhiều user cụ thể.
   * @param {String[]} userIds
   */
  async sendToUsers({ type, title, message, link, senderId, userIds }) {
    if (!Array.isArray(userIds) || !userIds.length) {
      return { sent: 0, totalUsers: 0 };
    }

    // Loại bỏ trùng
    const uniqueIds = [...new Set(userIds.map(String))];

    // Verify users tồn tại
    const users = await User.find({
      _id: { $in: uniqueIds },
      isDeleted: { $ne: true },
    })
      .select("_id")
      .lean();

    if (!users.length) return { sent: 0, totalUsers: 0 };

    const docs = users.map((u) => ({
      recipientId: u._id,
      senderId,
      type,
      meta: {
        title,
        message,
        icon: NOTIFICATION_ICONS[type] || "📢",
        link: link || null,
        fromAdmin: true,
      },
    }));

    const result = await Notification.insertMany(docs, { ordered: false });
    result.forEach((notif, idx) => {
      emitOne(users[idx]._id, notif, { type, title, message, link });
    });

    return { sent: result.length, totalUsers: users.length };
  },

  /**
   * Lịch sử gửi notification từ admin (group theo meta.title + meta.fromAdmin).
   * Trả về các "campaign" đã gửi với stats.
   */
  async history({ page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;
    const pipeline = [
      { $match: { "meta.fromAdmin": true } },
      {
        $group: {
          _id: {
            title: "$meta.title",
            message: "$meta.message",
            type: "$type",
            link: "$meta.link",
          },
          count: { $sum: 1 },
          firstSent: { $min: "$createdAt" },
          lastSent: { $max: "$createdAt" },
        },
      },
      { $sort: { lastSent: -1 } },
      {
        $facet: {
          items: [{ $skip: skip }, { $limit: Number(limit) }],
          total: [{ $count: "count" }],
        },
      },
    ];

    const [res] = await Notification.aggregate(pipeline);
    const items = (res?.items || []).map((c) => ({
      _id: `${c._id.type}_${c.firstSent.getTime()}`,
      type: c._id.type,
      title: c._id.title,
      message: c._id.message,
      link: c._id.link,
      recipientCount: c.count,
      sentAt: c.lastSent,
    }));

    return { items, total: res?.total?.[0]?.count || 0 };
  },

  /** Lấy 1 campaign kèm danh sách user đã nhận (dùng để xem chi tiết) */
  async campaignDetail({ type, title, message, link, sentAt, page = 1, limit = 50 }) {
    const filter = this.buildCampaignFilter({ type, title, message, link, sentAt });

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("recipientId", "username displayName email avatarUrl")
        .select("recipientId isRead createdAt")
        .lean(),
      Notification.countDocuments(filter),
    ]);

    return { items, total };
  },

  /**
   * Build filter object cho campaign từ query params (dùng chung).
   * Match cả khi meta.link = null hoặc = "" (vì 2 lần gửi có thể khác nhau).
   */
  buildCampaignFilter({ type, title, message, link, sentAt }) {
    const filter = {
      "meta.fromAdmin": true,
      type,
      "meta.title": title,
      "meta.message": message,
    };
    // Match cả null và "" - dùng $or
    if (link === null || link === "" || link === undefined) {
      filter.$or = [
        { "meta.link": null },
        { "meta.link": "" },
        { "meta.link": { $exists: false } },
      ];
    } else {
      filter["meta.link"] = link;
    }
    if (sentAt) {
      const t = new Date(sentAt);
      filter.createdAt = {
        $gte: new Date(t.getTime() - 60000),
        $lte: new Date(t.getTime() + 60000),
      };
    }
    return filter;
  },

  /**
   * Đếm số notification của 1 campaign (preview trước khi xóa).
   */
  async countByCampaign({ type, title, message, link, sentAt }) {
    const filter = this.buildCampaignFilter({ type, title, message, link, sentAt });
    const total = await Notification.countDocuments(filter);
    const unread = await Notification.countDocuments({ ...filter, isRead: false });
    return { total, unread };
  },

  /**
   * Xóa 1 campaign - xóa tất cả notification thuộc campaign đó
   * khỏi DB của từng user.
   * Trả về { deleted } - số notif đã xóa.
   */
  async deleteCampaign({ type, title, message, link, sentAt }) {
    const filter = this.buildCampaignFilter({ type, title, message, link, sentAt });

    // Lấy danh sách notification sẽ bị xóa để emit realtime cho user
    const notifs = await Notification.find(filter)
      .select("_id recipientId")
      .lean();

    if (!notifs.length) {
      return { deleted: 0 };
    }

    // Xóa trong DB
    const result = await Notification.deleteMany(filter);

    // Emit realtime "notification:deleted" cho từng user để FE remove khỏi list
    const grouped = new Map();
    for (const n of notifs) {
      const key = n.recipientId.toString();
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(n._id.toString());
    }
    for (const [userId, ids] of grouped.entries()) {
      emitToUser(userId, "notification:deleted", { ids });
    }

    return { deleted: result.deletedCount || 0 };
  },
};
