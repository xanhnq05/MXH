// ban.service — cấm / gỡ cấm user. Đồng bộ với User.isBanned + User.bannedUntil.

import Ban from "../models/Ban.js";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";

const syncUserBanState = async (userId) => {
  // Tìm ban active còn hiệu lực
  const now = new Date();
  const activeBan = await Ban.findOne({
    userId,
    isActive: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  }).sort({ createdAt: -1 });

  if (activeBan) {
    await User.findByIdAndUpdate(userId, {
      isBanned: true,
      bannedUntil: activeBan.expiresAt || null,
      bannedAt: activeBan.createdAt,
      bannedReason: activeBan.reason,
    });
  } else {
    // Hết hạn hoặc không còn active ban
    await User.findByIdAndUpdate(userId, {
      isBanned: false,
      bannedUntil: null,
      bannedAt: null,
      bannedReason: "",
    });
  }
};

export const banService = {
  /** Ban user — tạo record Ban + sync User.isBanned. Nếu user đang bị ban active thì cập nhật ban cũ. */
  async ban({ userId, bannedBy, reason, category, scope, expiresAt, evidenceReportIds = [] }) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "Người dùng không tồn tại");

    // Lift tất cả active ban trước đó (nếu có) — superseded by ban mới
    await Ban.updateMany(
      { userId, isActive: true },
      { isActive: false, liftedAt: new Date(), liftReason: "Superseded by new ban" }
    );

    const ban = await Ban.create({
      userId,
      bannedBy,
      reason,
      category,
      scope: Array.isArray(scope) && scope.length ? scope : ["login", "chat", "post", "comment", "message"],
      expiresAt: expiresAt || null,
      evidenceReportIds,
    });

    await syncUserBanState(userId);
    return ban;
  },

  /** Unban user — lift active ban + sync state. */
  async unban({ userId, liftedBy, liftReason = "" }) {
    const result = await Ban.updateMany(
      { userId, isActive: true },
      { isActive: false, liftedBy, liftedAt: new Date(), liftReason }
    );
    await syncUserBanState(userId);
    return result;
  },

  /** Lấy danh sách ban của 1 user. */
  async listByUser(userId) {
    return Ban.find({ userId })
      .sort({ createdAt: -1 })
      .populate("bannedBy", "email displayName username")
      .populate("liftedBy", "email displayName username");
  },

  /** Lấy danh sách user đang bị ban — cho admin list. */
  async listActiveBans({ page = 1, limit = 20, search = "" } = {}) {
    const now = new Date();
    const match = {
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    };
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      match.$or = [
        { reason: rx },
        { category: rx },
      ];
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Ban.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "email displayName username avatarUrl isBanned bannedUntil")
        .populate("bannedBy", "email displayName username"),
      Ban.countDocuments(match),
    ]);
    return { items, total, page, limit };
  },
};

export default banService;
