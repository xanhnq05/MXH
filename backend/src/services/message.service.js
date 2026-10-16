// Message service — list messages, đánh dấu đã đọc, ghim/xoá, xử lý file upload.

import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import { ApiError } from "../utils/ApiError.js";
import { paginate } from "../utils/pagination.js";
import { uploadService } from "./upload.service.js";
import { emitToConversation, emitToUser } from "../libs/socket.js";
import { notificationService } from "./notification.service.js";
import { checkMediaRateLimit } from "./mediaRateLimit.service.js";

const assertMember = async (meId, convId) => {
  const conv = await Conversation.findById(convId);
  if (!conv) throw new ApiError(404, "Hội thoại không tồn tại");
  if (!conv.members.some((m) => m.userId.toString() === meId.toString()))
    throw new ApiError(403, "Bạn không phải thành viên");
  return conv;
};

export const messageService = {
  async list(meId, convId, { cursor, limit = 30 } = {}) {
    await assertMember(meId, convId);
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
      ],
    });
    return { items, nextCursor };
  },

  async markRead(meId, convId, lastMessageId) {
    const conv = await assertMember(meId, convId);
    const me = conv.members.find((m) => m.userId.toString() === meId.toString());
    me.lastReadMessageId = lastMessageId;
    await conv.save();

    await Message.updateMany(
      {
        conversationId: convId,
        _id: { $lte: lastMessageId },
        "deliveries.userId": { $ne: meId },
      },
      { $push: { deliveries: { userId: meId, deliveredAt: new Date(), readAt: new Date() } } }
    );

    emitToConversation(convId, "message:read", {
      conversationId: convId,
      userId: meId,
      lastMessageId,
    });
    return { success: true };
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
      replyTo,
      isEncrypted = false,
      iv,
      authTag,
      encryptedKeys,
    } = payload;

    const conv = await assertMember(meId, conversationId);

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

    // Realtime broadcast
    emitToConversation(conversationId, "message:new", message);

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
    await assertMember(meId, conversationId);
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
