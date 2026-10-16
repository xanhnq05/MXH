import { messageService } from "../services/message.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const messageController = {
  list: asyncHandler(async (req, res) => {
    res.json(
      await messageService.list(req.user._id, req.params.conversationId, req.query)
    );
  }),

  /** Gửi qua HTTP (FE có thể dùng khi socket chưa connect hoặc để fallback) */
  send: asyncHandler(async (req, res) => {
    const m = await messageService.send(req.user._id, {
      conversationId: req.params.conversationId,
      ...req.body,
    });
    res.status(201).json({ message: m });
  }),

  /**
   * Upload file (ảnh/tệp/voice) chỉ để lấy metadata.
   * KHÔNG tạo message. Client phải gọi tiếp `socket.emit("message:send", { type, fileUrl, ... })`
   * để tạo message. Tránh double-upload / double-message.
   */
  upload: asyncHandler(async (req, res) => {
    const result = await messageService.uploadOnly(
      req.user._id,
      req.params.conversationId,
      req.file
    );
    res.status(201).json({ file: result });
  }),

  /**
   * Legacy: upload + tạo message trong 1 bước.
   * Vẫn hoạt động để tương thích ngược, khuyến nghị dùng upload + message:send.
   * @deprecated
   */
  uploadAndSend: asyncHandler(async (req, res) => {
    const m = await messageService.uploadAndSend(
      req.user._id,
      req.params.conversationId,
      req.file,
      { content: req.body.content, duration: Number(req.body.duration) || undefined }
    );
    res.status(201).json({ message: m });
  }),

  markRead: asyncHandler(async (req, res) => {
    res.json(
      await messageService.markRead(
        req.user._id,
        req.params.conversationId,
        req.body.lastMessageId
      )
    );
  }),

  remove: asyncHandler(async (req, res) => {
    await messageService.softDelete(req.user._id, req.params.id);
    res.status(204).end();
  }),
};
