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

  upload: asyncHandler(async (req, res) => {
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
