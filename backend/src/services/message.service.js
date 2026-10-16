// Message service — list messages, đánh dấu đã đọc, ghim/xoá, xử lý file upload.

import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import Block from "../models/Block.js";
import { ApiError } from "../utils/ApiError.js";
import { paginate } from "../utils/pagination.js";
import { uploadService } from "./upload.service.js";
import { emitToConversation, emitToUser } from "../libs/socket.js";
import { notificationService } from "./notification.service.js";
import { checkMediaRateLimit } from "./mediaRateLimit.service.js";
import { assertNotBlocked } from "../utils/blockGuard.js";

const assertMember = async (meId, convId) => {
  const conv = await Conversation.findById(convId);
  if (!conv) throw new ApiError(404, "Hội thoại không tồn tại");
  if (!conv.members.some((m) => m.userId.toString() === meId.toString()))
    throw new ApiError(403, "Bạn không phải thành viên");
  return conv;
};

/**
 * Với conv direct (2 người), check block 2 chiều giữa me và other.
 * Nếu 1 trong 2 chặn nhau → từ chối gửi/nhận.
 */
const assertNotBlockedInConversation = async (meId, conv) => {
  if (conv.type !== "direct") return;
  const other = conv.members.find(
    (m) => m.userId.toString() !== meId.toString()
  );
  if (!other) return;
  await assertNotBlocked(meId, other.userId, { strict: true });
};

export const messageService = {
  async list(meId, convId, { cursor, limit = 30 } = {}) {
    const conv = await assertMember(meId, convId);
    await assertNotBlockedInConversation(meId, conv);
    const { items, nextCursor } = await paginate({
      model: Message,
      filter: { conversationId: convId, deletedAt: null },
      cursor,
      limit,
      populate: [
        {
          path: "senderId",
          select: "username displayName avatarUrl",
        },
        { path: "replyTo" },
        // Populate deliveries.userId để frontend hiển thị "xem chi tiết"
        { path: "deliveries.userId", select: "username displayName avatarUrl" },
      ],
    });
    return { items, nextCursor };
  },

  async markRead(meId, convId, lastMessageId) {
    const conv = await assertMember(meId, convId);
    const me = conv.members.find((m) => m.userId.toString() === meId.toString());
    me.lastReadMessageId = lastMessageId;
    await conv.save();

    const readAt = new Date();
    // Update tất cả message từ trước đến lastMessageId:
    // - Thêm delivered+read vào deliveries (nếu chưa có)
    const result = await Message.updateMany(
      {
        conversationId: convId,
        _id: { $lte: lastMessageId },
        "deliveries.userId": { $ne: meId },
        senderId: { $ne: meId }, // không tự ghi read cho mình
      },
      {
        $push: {
          deliveries: {
            userId: meId,
            deliveredAt: readAt,
            readAt,
          },
        },
      }
    );

    // Lấy danh sách messageId bị ảnh hưởng (để thông báo sender)
    const affectedMessages = await Message.find({
      conversationId: convId,
      _id: { $lte: lastMessageId },
      "deliveries.userId": meId,
      senderId: { $ne: meId },
    })
      .select("_id senderId")
      .lean();

    // Broadcast read event cho cả conv (để các client cập nhật UI)
    emitToConversation(convId, "message:read", {
      conversationId: convId,
      userId: meId,
      lastMessageId,
      readAt: readAt.toISOString(),
    });

    // Đồng thời thông báo riêng cho từng sender (để update tick trong conversation list)
    const senderIds = new Set(affectedMessages.map((m) => m.senderId.toString()));
    for (const sid of senderIds) {
      emitToUser(sid, "message:read:by-user", {
        conversationId: convId,
        readerId: meId,
        readAt: readAt.toISOString(),
      });
    }

    return {
      success: true,
      updatedCount: result.modifiedCount || 0,
    };
  },

  /** Gửi tin nhắn — gọi từ socket (HTTP cũng có thể gọi) */
  async send(meId, payload) {
    const {
      conversationId,
      type = "text",
      content = "",
      fileUrl,
      fileKey,
      fileName,
      fileSize,
      mimeType,
      duration,
      stickerId,
      stickerUrl,
      postId,
      postUrl,
      replyTo,
      isEncrypted = false,
      iv,
      authTag,
      encryptedKeys,
    } = payload;

    const conv = await assertMember(meId, conversationId);
    await assertNotBlockedInConversation(meId, conv);

    // Rate limit cho sticker/GIF (chỉ áp dụng cho media, không ảnh hưởng text/file/image)
    if (type === "sticker" || type === "gif") {
      const rl = checkMediaRateLimit(meId.toString());
      if (!rl.allowed) {
        throw new ApiError(
          429,
          rl.reason || "Bạn gửi sticker/GIF quá nhanh. Vui lòng chờ một chút.",
          { retryAfterMs: rl.retryAfterMs }
        );
      }
    }

    const message = await Message.create({
      conversationId,
      senderId: meId,
      type,
      content,
      fileUrl,
      fileKey,
      fileName,
      fileSize,
      mimeType,
      duration,
      stickerId,
      stickerUrl,
      postId: type === "share_post" ? postId : undefined,
      postUrl: type === "share_post" ? postUrl : undefined,
      replyTo,
      isEncrypted,
      iv,
      authTag,
      encryptedKeys,
    });

    await message.populate("senderId", "username displayName avatarUrl");
    if (replyTo) await message.populate("replyTo");

    conv.lastMessage = message._id;
    conv.lastMessageAt = message.createdAt;
    await conv.save();

    // Invalidate conversation list cache (lastMessageAt thay doi)
    try {
      const cache = (await import("../libs/cache.js")).default;
      await Promise.allSettled(
        conv.members.map((m) =>
          cache.delPattern(`conversations:user:${m.userId.toString()}:*`)
        )
      );
    } catch {
      // Silent - cache optional
    }

    // Realtime broadcast
    emitToConversation(conversationId, "message:new", message);

    // Broadcast "delivered" event cho các thành viên (trừ sender) —
    // đây là tín hiệu server đã push message, không đợi client ack.
    // Frontend dùng event này để hiển thị 2 tick "đã nhận" cho sender.
    const memberIds = conv.members
      .map((m) => m.userId.toString())
      .filter((uid) => uid !== meId.toString());
    for (const uid of memberIds) {
      emitToUser(uid, "message:delivered", {
        messageId: message._id.toString(),
        conversationId: conversationId.toString(),
        recipientId: uid,
        deliveredAt: new Date().toISOString(),
      });
    }

    // Notification cho các thành viên khác (không gửi cho người mute)
    for (const m of conv.members) {
      const uid = m.userId.toString();
      if (uid === meId.toString()) continue;
      if (conv.mutedBy.some((id) => id.toString() === uid)) continue;
      await notificationService.push({
        recipientId: uid,
        senderId: meId,
        type: "new_message",
        refId: message._id,
        meta: { conversationId, type },
      });
    }
    return message;
  },

  /**
   * Upload file lên storage, KHÔNG tạo message.
   * Trả về metadata để client dùng kèm socket emit `message:send`.
   * Đây là endpoint khuyến nghị: tránh double-upload và double-message.
   */
  async uploadOnly(meId, conversationId, file) {
    if (!file) throw new ApiError(400, "Thiếu file");
    const conv = await assertMember(meId, conversationId);
    await assertNotBlockedInConversation(meId, conv);
    const folder = `messages/${conversationId}`;
    const uploaded = await uploadService.uploadFile({
      buffer: file.buffer,
      originalName: file.originalname,
      mimetype: file.mimetype,
      folder,
      userId: meId,
    });
    return {
      url: uploaded.url,
      key: uploaded.key,
      size: uploaded.size,
      mimeType: file.mimetype,
      originalName: file.originalname,
    };
  },

  /**
   * Legacy: upload file rồi tạo message ngay (1-step).
   * Tồn tại để tương thích ngược. Khuyến nghị dùng uploadOnly + message:send.
   * @deprecated
   */
  async uploadAndSend(meId, conversationId, file, payload = {}) {
    if (!file) throw new ApiError(400, "Thiếu file");
    const folder = `messages/${conversationId}`;
    const uploaded = await uploadService.uploadFile({
      buffer: file.buffer,
      originalName: file.originalname,
      mimetype: file.mimetype,
      folder,
      userId: meId,
    });
    const type = file.mimetype.startsWith("video")
      ? "voice"
      : file.mimetype.startsWith("image")
        ? "image"
        : "file";
    return this.send(meId, {
      conversationId,
      type,
      content: payload.content || "",
      fileUrl: uploaded.url,
      fileKey: uploaded.key,
      fileName: file.originalname,
      fileSize: uploaded.size,
      mimeType: file.mimetype,
      duration: payload.duration,
      replyTo: payload.replyTo,
    });
  },

  async pinMessage(meId, convId, messageId) {
    const conv = await assertMember(meId, convId);
    const m = conv.members.find((u) => u.userId.toString() === meId.toString());
    if (conv.type === "group" && !["owner", "admin"].includes(m.role))
      throw new ApiError(403, "Chỉ owner/admin mới được ghim");
    const idx = conv.pinnedMessages.findIndex(
      (id) => id.toString() === messageId.toString()
    );
    if (idx !== -1) throw new ApiError(409, "Tin nhắn đã được ghim");
    if (conv.pinnedMessages.length >= 5)
      throw new ApiError(400, "Tối đa 5 tin nhắn được ghim");
    conv.pinnedMessages.push(messageId);
    await conv.save();
    emitToConversation(convId, "message:pinned", { messageId, conversationId: convId });
    return { success: true };
  },

  async unpinMessage(meId, convId, messageId) {
    const conv = await assertMember(meId, convId);
    const idx = conv.pinnedMessages.findIndex(
      (id) => id.toString() === messageId.toString()
    );
    if (idx === -1) throw new ApiError(404, "Tin nhắn chưa được ghim");
    conv.pinnedMessages.splice(idx, 1);
    await conv.save();
    emitToConversation(convId, "message:unpinned", { messageId, conversationId: convId });
    return { success: true };
  },

  async softDelete(meId, messageId) {
    const m = await Message.findById(messageId);
    if (!m) throw new ApiError(404, "Tin nhắn không tồn tại");
    if (m.senderId.toString() !== meId.toString())
      throw new ApiError(403, "Chỉ xoá được tin nhắn của mình");
    m.deletedAt = new Date();
    m.content = "[đã xoá]";
    m.fileUrl = null;
    m.fileKey = null;
    await m.save();
    emitToConversation(m.conversationId, "message:deleted", { messageId });
    return { success: true };
  },
};
