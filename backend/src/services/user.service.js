// User service — tìm kiếm, xem/sửa profile, upload avatar/cover, E2EE key.

import User from "../models/User.js";
import Block from "../models/Block.js";
import Friendship from "../models/Friendship.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadService } from "./upload.service.js";

const publicProjection = "-hashedPassword -email";

const isBlockedEitherWay = async (a, b) => {
  const found = await Block.findOne({
    $or: [
      { blocker: a, blocked: b },
      { blocker: b, blocked: a },
    ],
  });
  return !!found;
};

export const userService = {
  async getMe(userId) {
    const user = await User.findById(userId).select(publicProjection);
    if (!user) throw new ApiError(404, "Người dùng không tồn tại");
    return user;
  },

  async getById(viewerId, targetId) {
    if (await isBlockedEitherWay(viewerId, targetId)) {
      throw new ApiError(403, "Không thể xem hồ sơ này");
    }
    const user = await User.findById(targetId).select(publicProjection);
    if (!user) throw new ApiError(404, "Người dùng không tồn tại");
    return user;
  },

  async search(viewerId, q, limit = 20) {
    if (!q || q.trim().length < 2) return [];
    const blocked = await Block.find({
      $or: [{ blocker: viewerId }, { blocked: viewerId }],
    }).select("blocker blocked");
    const blockedIds = new Set();
    blocked.forEach((b) => {
      if (b.blocker) blockedIds.add(b.blocker.toString());
      if (b.blocked) blockedIds.add(b.blocked.toString());
    });
    blockedIds.add(viewerId.toString());

    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    // Tìm theo: username, displayName, fullName, email
    const users = await User.find({
      _id: { $nin: Array.from(blockedIds) },
      $or: [
        { username: { $regex: regex } },
        { displayName: { $regex: regex } },
        { fullName: { $regex: regex } },
        { email: { $regex: regex } },
      ],
    })
      .select("username displayName fullName email avatarUrl isOnline country city school workplace")
      .limit(limit);
    return users;
  },

  async updateProfile(userId, payload) {
    // Cho phép cập nhật: tên hiển thị, tiểu sử, SĐT, country, city, school, workplace, username
    const basicAllowed = [
      "displayName",
      "bio",
      "phone",
      "country",
      "city",
      "school",
      "workplace",
    ];
    const update = {};
    for (const k of basicAllowed) {
      if (payload[k] !== undefined) {
        update[k] = String(payload[k] || "").slice(0, 120);
      }
    }

    // Xử lý đổi username: cooldown 7 ngày
    if (payload.username && payload.username.trim()) {
      const newUsername = payload.username
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, 30);
      if (newUsername.length < 3) {
        throw new ApiError(400, "Username phải có ít nhất 3 ký tự");
      }
      const current = await User.findById(userId).select(
        "username usernameLastChanged"
      );
      if (!current) throw new ApiError(404, "Người dùng không tồn tại");
      if (current.username !== newUsername) {
        if (current.usernameLastChanged) {
          const days =
            (Date.now() - new Date(current.usernameLastChanged).getTime()) /
            (1000 * 60 * 60 * 24);
          if (days < 7) {
            const remain = Math.ceil(7 - days);
            throw new ApiError(
              429,
              `Bạn chỉ có thể đổi username sau ${remain} ngày nữa`
            );
          }
        }
        // Check trùng
        const exist = await User.findOne({
          username: newUsername,
          _id: { $ne: userId },
        });
        if (exist) throw new ApiError(409, "Username đã được sử dụng");
        update.username = newUsername;
        update.usernameLastChanged = new Date();
      }
    }

    const user = await User.findByIdAndUpdate(userId, update, {
      new: true,
      runValidators: true,
    }).select(publicProjection);
    if (!user) throw new ApiError(404, "Người dùng không tồn tại");
    return user;
  },

  /** Xóa tài khoản vĩnh viễn (soft delete + xóa dữ liệu liên quan) */
  async deleteAccount(userId) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "Người dùng không tồn tại");

    // 1) Soft delete user
    user.isDeleted = true;
    user.deletedAt = new Date();
    // Xóa thông tin nhạy cảm nhưng giữ record để tránh trùng email
    user.hashedPassword = "DELETED";
    user.email = `deleted_${userId}_${Date.now()}@deleted.local`;
    user.fullName = "[Đã xóa]";
    user.displayName = "[Đã xóa]";
    user.avatarUrl = "";
    user.coverUrl = "";
    user.bio = "";
    user.phone = "";
    user.country = "";
    user.city = "";
    user.school = "";
    user.workplace = "";
    await user.save();

    // 2) Xóa các quan hệ bạn bè
    await Friendship.deleteMany({
      $or: [{ requester: userId }, { recipient: userId }],
    });

    // 3) Xóa block
    await Block.deleteMany({
      $or: [{ blocker: userId }, { blocked: userId }],
    });

    // 4) Xóa OTP đã dùng
    try {
      const OtpVerification = (await import("../models/OtpVerification.js"))
        .default;
      await OtpVerification.deleteMany({ userId });
    } catch {}

    return { success: true };
  },

  async updatePreferences(userId, { theme, soundEnabled, soundTheme }) {
    const update = {};
    if (theme) update.theme = theme;
    if (soundEnabled !== undefined) update.soundEnabled = soundEnabled;
    if (soundTheme) update.soundTheme = soundTheme;
    const user = await User.findByIdAndUpdate(userId, update, {
      new: true,
    }).select(publicProjection);
    if (!user) throw new ApiError(404, "Người dùng không tồn tại");
    return user;
  },

  async uploadAvatar(userId, file) {
    if (!file) throw ApiError.badRequest("Thiếu file ảnh");
    const { url, key } = await uploadService.uploadFile({
      buffer: file.buffer,
      originalName: file.originalname,
      mimetype: file.mimetype,
      folder: "avatars",
      userId,
    });
    // Xoá ảnh cũ nếu có
    const old = await User.findById(userId).select("avatarId");
    if (old?.avatarId) await uploadService.deleteFile(old.avatarId);
    const user = await User.findByIdAndUpdate(
      userId,
      { avatarUrl: url, avatarId: key },
      { new: true }
    ).select(publicProjection);
    return user;
  },

  async uploadCover(userId, file) {
    if (!file) throw ApiError.badRequest("Thiếu file ảnh");
    const { url, key } = await uploadService.uploadFile({
      buffer: file.buffer,
      originalName: file.originalname,
      mimetype: file.mimetype,
      folder: "covers",
      userId,
    });
    const old = await User.findById(userId).select("coverId");
    if (old?.coverId) await uploadService.deleteFile(old.coverId);
    const user = await User.findByIdAndUpdate(
      userId,
      { coverUrl: url, coverId: key },
      { new: true }
    ).select(publicProjection);
    return user;
  },

  async setE2EEKeys(userId, { publicKey, ecdhPublicKey }) {
    const update = {};
    if (publicKey) update.e2eePublicKey = publicKey;
    if (ecdhPublicKey) update.e2eeEcdhPublicKey = ecdhPublicKey;
    const user = await User.findByIdAndUpdate(userId, update, {
      new: true,
    }).select(publicProjection);
    return user;
  },
};
