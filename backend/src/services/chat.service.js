// Chat service — Conversation: tạo direct, tạo/sửa/xoá nhóm, thêm/xoá/đổi role member.

import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import Block from "../models/Block.js";
import Friendship from "../models/Friendship.js";
import { ApiError } from "../utils/ApiError.js";
import { notificationService } from "./notification.service.js";
import { emitToUser, emitToConversation } from "../libs/socket.js";
import { paginate } from "../utils/pagination.js";
import cache from "../libs/cache.js";

const MIN_GROUP_MEMBERS = 1;
const MAX_GROUP_MEMBERS = 50;

// Sinh slug base62 8 ký tự, đảm bảo unique trong DB
const generateJoinLink = async () => {
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const len = 8;
  for (let attempt = 0; attempt < 10; attempt++) {
    let s = "";
    for (let i = 0; i < len; i++) {
      s += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    // Check collision nhanh
    const exists = await Conversation.findOne({ joinLink: s }).lean();
    if (!exists) return s;
  }
  // Fallback: dùng timestamp hex
  return Date.now().toString(36).slice(-8);
};

const assertNotBlocked = async (a, b) => {
  const blocked = await Block.findOne({
    $or: [
      { blocker: a, blocked: b },
      { blocker: b, blocked: a },
    ],
  });
  if (blocked) throw new ApiError(403, "Không thể thực hiện với người dùng này");
};

const buildDirectMember = (userId, role = "member") => ({
  userId,
  role,
  joinedAt: new Date(),
  lastReadMessageId: null,
});

/** Invalidate conversation list cache cho 1 user (sau khi co update) */
const invalidateConvListCache = async (userId) => {
  if (!userId) return;
  try {
    await cache.delPattern(`conversations:user:${userId.toString()}:*`);
  } catch {
    // Silent - cache optional
  }
};

/** Invalidate cache cho tat ca member trong conversation */
const invalidateConvCacheForMembers = async (conv) => {
  if (!conv || !conv.members) return;
  await Promise.allSettled(
    conv.members.map((m) => invalidateConvListCache(m.userId))
  );
};

export const chatService = {
  /** Lấy hoặc tạo hội thoại direct 1-1 */
  async getOrCreateDirect(meId, otherId) {
    if (meId.toString() === otherId.toString())
      throw new ApiError(400, "Không thể chat với chính mình");
    await assertNotBlocked(meId, otherId);

    const other = await User.findById(otherId);
    if (!other) throw new ApiError(404, "Người dùng không tồn tại");

    // Tìm conversation direct chứa cả 2
    const existed = await Conversation.findOne({
      type: "direct",
      "members.userId": { $all: [meId, otherId] },
    });
    if (existed) return existed;

    const conv = await Conversation.create({
      type: "direct",
      members: [
        buildDirectMember(meId),
        buildDirectMember(otherId),
      ],
    });
    await invalidateConvCacheForMembers(conv);
    return conv;
  },

  /** Tạo nhóm chat */
  async createGroup(meId, { name, memberIds = [], joinType = "closed" } = {}) {
    if (!name || name.trim().length === 0)
      throw new ApiError(400, "Tên nhóm không được để trống");
    if (!["open", "closed"].includes(joinType))
      throw new ApiError(400, "joinType không hợp lệ");

    const allIds = Array.from(new Set([meId.toString(), ...memberIds.map(String)]));
    if (allIds.length < MIN_GROUP_MEMBERS)
      throw new ApiError(400, `Nhóm phải có tối thiểu ${MIN_GROUP_MEMBERS} thành viên`);
    if (allIds.length > MAX_GROUP_MEMBERS)
      throw new ApiError(400, `Nhóm chỉ chứa tối đa ${MAX_GROUP_MEMBERS} thành viên`);

    const users = await User.find({ _id: { $in: allIds } });
    if (users.length !== allIds.length)
      throw new ApiError(404, "Có thành viên không tồn tại");

    // Sinh joinLink chỉ khi nhóm mở
    const joinLink = joinType === "open" ? await generateJoinLink() : null;

    const conv = await Conversation.create({
      type: "group",
      name: name.trim(),
      joinType,
      joinLink,
      members: allIds.map((id) =>
        buildDirectMember(
          id,
          id === meId.toString() ? "owner" : "member"
        )
      ),
    });

    // Thông báo cho các thành viên khác
    for (const id of allIds) {
      if (id !== meId.toString()) {
        await notificationService.push({
          recipientId: id,
          senderId: meId,
          type: "added_to_group",
          refId: conv._id,
          meta: { conversationName: conv.name },
        });
      }
    }

    return conv;
  },

  /**
   * Vào nhóm mở qua link. Trả về conversation nếu thành công.
   * - Chỉ nhóm joinType=open mới join được
   * - Không cần là bạn bè
   * - Không vượt quá MAX_GROUP_MEMBERS
   */
  async joinByLink(meId, joinLink) {
    if (!joinLink || !String(joinLink).trim())
      throw new ApiError(400, "Thiếu link mời");
    const conv = await Conversation.findOne({ joinLink: String(joinLink).trim() });
    if (!conv) throw new ApiError(404, "Link mời không hợp lệ");
    if (conv.type !== "group")
      throw new ApiError(400, "Không phải nhóm");
    if (conv.joinType !== "open")
      throw new ApiError(403, "Nhóm này không cho phép vào qua link");
    if (conv.members.some((m) => m.userId.toString() === meId.toString()))
      throw new ApiError(409, "Bạn đã là thành viên");
    if (conv.members.length >= MAX_GROUP_MEMBERS)
      throw new ApiError(400, `Nhóm đã đầy (tối đa ${MAX_GROUP_MEMBERS} thành viên)`);

    conv.members.push(buildDirectMember(meId, "member"));
    conv.lastMessageAt = new Date();
    await conv.save();
    await invalidateConvCacheForMembers(conv);
    emitToConversation(conv._id.toString(), "conversation:updated", conv);
    return conv;
  },

  async listForUser(meId, { cursor, limit = 20 } = {}) {
    // Cache chi ap dung cho trang dau (cursor=null, limit default 20)
    // Trang sau se thay doi khi co tin nhan moi nen khong cache
    const cacheKey = `conversations:user:${meId.toString()}:limit:${limit}`;
    if (!cursor && limit === 20 && cache.isAvailable()) {
      const cached = await cache.get(cacheKey);
      if (cached) return cached;
      const result = await this._fetchConversations(meId, cursor, limit);
      await cache.set(cacheKey, result, 30);
      return result;
    }
    return this._fetchConversations(meId, cursor, limit);
  },

  async _fetchConversations(meId, cursor, limit) {
    const { items, nextCursor } = await paginate({
      model: Conversation,
      filter: { "members.userId": meId },
      cursor,
      limit,
      sort: { lastMessageAt: -1, _id: -1 },
      populate: [
        { path: "members.userId", select: "username displayName avatarUrl isOnline lastSeen" },
        {
          path: "lastMessage",
          select: "type content senderId isEncrypted createdAt",
          populate: { path: "senderId", select: "username displayName" },
        },
      ],
    });
    return { items, nextCursor };
  },

  async getById(meId, convId) {
    const conv = await Conversation.findById(convId)
      .populate("members.userId", "username displayName avatarUrl isOnline lastSeen e2eePublicKey e2eeEcdhPublicKey")
      .populate("pinnedMessages");
    if (!conv) throw new ApiError(404, "Hội thoại không tồn tại");
    if (!conv.members.some((m) => m.userId._id.toString() === meId.toString()))
      throw new ApiError(403, "Bạn không phải thành viên");
    return conv;
  },

  async updateGroup(meId, convId, { name, avatarUrl, avatarId }) {
    const conv = await this._assertGroup(meId, convId, ["owner", "admin"]);
    if (name) conv.name = name.trim();
    if (avatarUrl) conv.avatarUrl = avatarUrl;
    if (avatarId) conv.avatarId = avatarId;
    await conv.save();
    await invalidateConvCacheForMembers(conv);
    emitToConversation(convId, "conversation:updated", conv);
    return conv;
  },

  async deleteGroup(meId, convId) {
    const conv = await this._assertGroup(meId, convId, ["owner"]);
    await invalidateConvCacheForMembers(conv);
    await conv.deleteOne();
    emitToConversation(convId, "conversation:deleted", { conversationId: convId });
    return { success: true };
  },

  async leaveGroup(meId, convId) {
    const conv = await this._assertGroup(meId, convId, ["owner", "admin", "member"]);
    if (conv.members.length === 1) {
      // Người cuối rời → xoá nhóm
      await conv.deleteOne();
      return { success: true, deleted: true };
    }
    const idx = conv.members.findIndex(
      (m) => m.userId.toString() === meId.toString()
    );
    const myRole = conv.members[idx].role;

    if (myRole === "owner") {
      // Owner rời: bat buoc chuyen quyen truoc neu con admin khac
      const adminCount = conv.members.filter(
        (m) => m.role === "admin" && m.userId.toString() !== meId.toString()
      ).length;
      if (adminCount === 0) {
        // Khong con admin: phai chuyen owner cho member khac truoc
        throw new ApiError(
          400,
          "Hãy chỉ định chủ nhóm mới trước khi rời nhóm (POST /:id/transfer-ownership)"
        );
      }
      // Co admin: tu chuyen quyen cho admin dau tien
      const newOwner = conv.members.find(
        (m) =>
          m.userId.toString() !== meId.toString() && m.role === "admin"
      );
      if (newOwner) newOwner.role = "owner";
    }
    conv.members.splice(idx, 1);
    await conv.save();
    await invalidateConvCacheForMembers(conv);
    emitToConversation(convId, "conversation:member-left", {
      conversationId: convId,
      userId: meId,
    });
    return { success: true };
  },

  async addMembers(meId, convId, memberIds) {
    const conv = await this._assertGroup(meId, convId, ["owner", "admin"]);
    const newIds = memberIds.filter(
      (id) =>
        !conv.members.some((m) => m.userId.toString() === id.toString())
    );
    if (conv.members.length + newIds.length > MAX_GROUP_MEMBERS)
      throw new ApiError(400, `Nhóm chỉ chứa tối đa ${MAX_GROUP_MEMBERS} thành viên`);

    conv.members.push(...newIds.map((id) => buildDirectMember(id, "member")));
    await conv.save();
    await invalidateConvCacheForMembers(conv);

    for (const id of newIds) {
      await notificationService.push({
        recipientId: id,
        senderId: meId,
        type: "added_to_group",
        refId: conv._id,
        meta: { conversationName: conv.name },
      });
    }
    emitToConversation(convId, "conversation:updated", conv);
    return conv;
  },

  async removeMember(meId, convId, targetId) {
    const conv = await this._assertGroup(meId, convId, ["owner", "admin"]);
    if (meId.toString() === targetId.toString())
      throw new ApiError(400, "Không thể tự kick chính mình, hãy dùng /leave");
    const idx = conv.members.findIndex(
      (m) => m.userId.toString() === targetId.toString()
    );
    if (idx === -1) throw new ApiError(404, "Không tìm thấy thành viên");
    const target = conv.members[idx];
    if (target.role === "owner")
      throw new ApiError(403, "Không thể xoá chủ nhóm");
    // Admin không thể kick admin khác (chỉ owner mới có quyền)
    if (target.role === "admin" && conv.members.find((m) => m.userId.toString() === meId.toString())?.role !== "owner")
      throw new ApiError(403, "Chỉ chủ nhóm mới có thể xoá admin khác");
    conv.members.splice(idx, 1);
    await conv.save();
    await invalidateConvCacheForMembers(conv);
    emitToConversation(convId, "conversation:member-removed", {
      conversationId: convId,
      userId: targetId,
    });
    return { success: true };
  },

  async changeRole(meId, convId, targetId, newRole) {
    if (!["admin", "member"].includes(newRole))
      throw new ApiError(400, "Role không hợp lệ (chi ap dung admin/member)");
    const conv = await this._assertGroup(meId, convId, ["owner"]);
    const target = conv.members.find(
      (m) => m.userId.toString() === targetId.toString()
    );
    if (!target) throw new ApiError(404, "Không tìm thấy thành viên");
    if (target.role === "owner")
      throw new ApiError(400, "Hãy chuyển quyền chủ nhóm trước");
    target.role = newRole;
    await conv.save();
    await invalidateConvCacheForMembers(conv);
    emitToConversation(convId, "conversation:updated", conv);
    return conv;
  },

  /**
   * Transfer ownership: chi owner hien tai moi co quyen.
   * Tu dong demote owner cu thanh admin (de khong mat member).
   * Target phai la member hien tai va khong phai owner.
   * Idempotent: neu target da la owner -> throw 400.
   */
  async transferOwnership(meId, convId, newOwnerId) {
    const conv = await this._assertGroup(meId, convId, ["owner"]);
    if (meId.toString() === newOwnerId.toString())
      throw new ApiError(400, "Bạn đã là chủ nhóm");
    const target = conv.members.find(
      (m) => m.userId.toString() === newOwnerId.toString()
    );
    if (!target) throw new ApiError(404, "Người nhận không phải thành viên");
    if (target.role === "owner")
      throw new ApiError(400, "Người này đã là chủ nhóm");

    // Demote current owner -> admin (de giu quyen quan tri)
    const currentOwner = conv.members.find((m) => m.role === "owner");
    if (currentOwner) currentOwner.role = "admin";
    target.role = "owner";
    await conv.save();
    await invalidateConvCacheForMembers(conv);
    emitToConversation(convId, "conversation:ownership-transferred", {
      conversationId: convId,
      fromUserId: meId,
      toUserId: newOwnerId,
      conv: conv.toObject ? conv.toObject() : conv,
    });
    return conv;
  },

  async setNickname(meId, convId, nickname) {
    const conv = await Conversation.findById(convId);
    if (!conv) throw new ApiError(404, "Hội thoại không tồn tại");
    const me = conv.members.find(
      (m) => m.userId.toString() === meId.toString()
    );
    if (!me) throw new ApiError(403, "Bạn không phải thành viên");
    me.nickname = nickname ? nickname.trim().slice(0, 40) : null;
    await conv.save();
    await invalidateConvListCache(meId);
    emitToConversation(convId, "conversation:updated", conv);
    return conv;
  },

  async mute(meId, convId, mute) {
    const conv = await Conversation.findById(convId);
    if (!conv) throw new ApiError(404, "Hội thoại không tồn tại");
    const idx = conv.mutedBy.findIndex(
      (id) => id.toString() === meId.toString()
    );
    if (mute && idx === -1) conv.mutedBy.push(meId);
    if (!mute && idx !== -1) conv.mutedBy.splice(idx, 1);
    await conv.save();
    await invalidateConvListCache(meId);
    return { muted: mute };
  },

  async pinMessage(meId, convId, messageId, pin = true) {
    const conv = await this._assertGroup(meId, convId, ["owner", "admin"]);
    const idx = conv.pinnedMessages.findIndex(
      (id) => id.toString() === messageId.toString()
    );
    if (pin) {
      if (idx === -1) {
        if (conv.pinnedMessages.length >= 5)
          throw new ApiError(400, "Tối đa 5 tin nhắn được ghim");
        conv.pinnedMessages.push(messageId);
      }
    } else {
      if (idx !== -1) conv.pinnedMessages.splice(idx, 1);
    }
    await conv.save();
    emitToConversation(convId, "conversation:updated", conv);
    return conv;
  },

  async _assertGroup(meId, convId, allowedRoles) {
    const conv = await Conversation.findById(convId);
    if (!conv) throw new ApiError(404, "Hội thoại không tồn tại");
    if (conv.type !== "group")
      throw new ApiError(400, "Chỉ áp dụng cho nhóm");
    const me = conv.members.find(
      (m) => m.userId.toString() === meId.toString()
    );
    if (!me) throw new ApiError(403, "Bạn không phải thành viên");
    if (allowedRoles && !allowedRoles.includes(me.role))
      throw new ApiError(403, "Không đủ quyền");
    return conv;
  },
};
