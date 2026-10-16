import { notificationService } from "../services/notification.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const notificationController = {
  list: asyncHandler(async (req, res) => {
    res.json(
      await notificationService.list(req.user._id, {
        ...req.query,
        unreadOnly: req.query.unread === "true",
      })
    );
  }),

  unreadCount: asyncHandler(async (req, res) => {
    res.json({ count: await notificationService.unreadCount(req.user._id) });
  }),

  markRead: asyncHandler(async (req, res) => {
    await notificationService.markRead(req.user._id, req.params.id);
    res.status(204).end();
  }),

  markAllRead: asyncHandler(async (req, res) => {
    await notificationService.markAllRead(req.user._id);
    res.json({ message: "Đã đánh dấu tất cả đã đọc" });
  }),
};
