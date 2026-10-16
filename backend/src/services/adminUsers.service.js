// adminUsers.service — list, get, update, warn, soft-delete users (admin view).

import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";

export const adminUsersService = {
  async list({ page = 1, limit = 20, search = "", status = "", isBanned, country, sort = "-createdAt" } = {}) {
    const filter = { isDeleted: false };
    if (typeof isBanned === "boolean") {
      filter.isBanned = isBanned;
    } else if (status === "banned") {
      filter.isBanned = true;
    }
    if (country) filter.country = country;
    if (status === "active") filter.isOnline = true;
    if (status === "deleted") filter.isDeleted = true;
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { username: rx },
        { email: rx },
        { displayName: rx },
      ];
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      User.find(filter)
        .select("-hashedPassword -e2eePrivateKey -e2eeEcdhPrivateKey")
        .sort(sort)
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  },

  async getById(id) {
    const user = await User.findById(id).select(
      "-hashedPassword -e2eePrivateKey -e2eeEcdhPrivateKey"
    );
    if (!user) throw new ApiError(404, "Người dùng không tồn tại");
    return user;
  },

  async update(id, patch) {
    const allowed = [
      "displayName",
      "bio",
      "country",
      "city",
      "school",
      "workplace",
      "phone",
    ];
    const safe = {};
    for (const k of allowed) if (k in patch) safe[k] = patch[k];
    const user = await User.findByIdAndUpdate(id, safe, { new: true }).select(
      "-hashedPassword"
    );
    if (!user) throw new ApiError(404, "Người dùng không tồn tại");
    return user;
  },

  async warn(id, reason, warnedBy) {
    const user = await User.findByIdAndUpdate(
      id,
      { $inc: { warningCount: 1 } },
      { new: true }
    ).select("-hashedPassword");
    if (!user) throw new ApiError(404, "Người dùng không tồn tại");
    return user;
  },

  async softDelete(id) {
    const user = await User.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!user) throw new ApiError(404, "Người dùng không tồn tại");
    return user;
  },
};

export default adminUsersService;
