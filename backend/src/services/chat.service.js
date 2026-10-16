// Chat service — Conversation: tạo direct, tạo/sửa/xoá nhóm, thêm/xoá/đổi role member.

import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import Block from "../models/Block.js";
import Friendship from "../models/Friendship.js";
import { ApiError } from "../utils/ApiError.js";
import { notificationService } from "./notification.service.js";
import { emitToUser, emitToConversation } from "../libs/socket.js";

const MIN_GROUP_MEMBERS = 3;
const MAX_GROUP_MEMBERS = 100;

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
    return conv;
  },

  /** Tạo nhóm chat */
  async createGroup(meId, { name, memberIds = [] }) {
    if (!name || name.trim().length === 0)
      throw new ApiError(400, "Tên nhóm không được để trống");

    const allIds = Array.from(new Set([meId.toString(), ...memberIds.map(String)]));
    if (allIds.length < MIN_GROUP_MEMBERS)
      throw new ApiError(400, `Nhóm phải có tối thiểu ${MIN_GROUP_MEMBERS} thành viên`);
    if (allIds.length > MAX_GROUP_MEMBERS)
      throw new ApiError(400, `Nhóm chỉ chứa tối đa ${MAX_GROUP_MEMBERS} thành viên`);

    const users = await User.find({ _id: { $in: allIds } });
    if (users.length !== allIds.length)
      throw new ApiError(404, "Có thành viên không tồn tại");

    const conv = await Conversation.create({
      type: "group",
      name: name.trim(),
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

  async listForUser(meId) {
    return Conversation.find({ "members.userId": meId })
      .sort({ lastMessageAt: -1 })
      .populate("members.userId", "username displayName avatarUrl isOnline lastSeen")
      .populate({
        path: "lastMessage",
        select: "type content senderId isEncrypted createdAt",
        populate: { path: "senderId", select: "username displayName" },
      });
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
    emitToConversation(convId, "conversation:updated", conv);
    return conv;
  },

  async deleteGroup(meId, convId) {
    const conv = await this._assertGroup(meId, convId, ["owner"]);
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
    // Nếu là owner rời → chuyển quyền cho admin đầu tiên
    const idx = conv.members.findIndex(
      (m) => m.userId.toString() === meId.toString()
    );
    if (conv.members[idx].role === "owner") {
      const newOwner = conv.members.find(
        (m) =>
          m.userId.toString() !== meId.toString() && m.role === "admin"
      ) || conv.members.find(
        (m) => m.userId.toString() !== meId.toString()
      );
      if (newOwner) newOwner.role = "owner";
    }
    conv.members.splice(idx, 1);
    await conv.save();
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
    const idx = conv.members.findIndex(
      (m) => m.userId.toString() === targetId.toString()
    );
    if (idx === -1) throw new ApiError(404, "Không tìm thấy thành viên");
    // Không cho kick owner; admin không thể kick admin khác
    const target = conv.members[idx];
    if (target.role === "owner")
      throw new ApiError(403, "Không thể xoá chủ nhóm");
    conv.members.splice(idx, 1);
    await conv.save();
    emitToConversation(convId, "conversation:member-removed", {
      conversationId: convId,
      userId: targetId,
    });
    return { success: true };
  },

  async changeRole(meId, convId, targetId, newRole) {
    if (!["owner", "admin", "member"].includes(newRole))
      throw new ApiError(400, "Role không hợp lệ");
    const conv = await this._assertGroup(meId, convId, ["owner"]);
    const target = conv.members.find(
      (m) => m.userId.toString() === targetId.toString()
    );
    if (!target) throw new ApiError(404, "Không tìm thấy thành viên");
    if (target.role === "owner" && newRole !== "owner") {
      // Cần chuyển owner trước
      throw new ApiError(400, "Hãy chuyển quyền chủ nhóm trước");
    }
    target.role = newRole;
    await conv.save();
    emitToConversation(convId, "conversation:updated", conv);
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
