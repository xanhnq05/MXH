// Admin Notification controller — gửi & lịch sử thông báo từ admin.

import { adminNotificationService } from "../services/adminNotification.service.js";
import { auditService } from "../services/audit.service.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const ALLOWED_TYPES = [
  "admin_announcement",
  "admin_warning",
  "admin_promo",
  "admin_maintenance",
];

export const adminNotificationController = {
  /**
   * POST /admin/notifications/broadcast
   * Body: { type, title, message, link? }
   * Gửi tới TẤT CẢ user active.
   */
  broadcast: asyncHandler(async (req, res) => {
    const { type, title, message, link } = req.body;
    if (!type || !ALLOWED_TYPES.includes(type)) {
      throw new ApiError(400, `type không hợp lệ. Phải là một trong: ${ALLOWED_TYPES.join(", ")}`);
    }
    if (!title?.trim()) throw new ApiError(400, "title là bắt buộc");
    if (!message?.trim()) throw new ApiError(400, "message là bắt buộc");

    const result = await adminNotificationService.broadcast({
      type,
      title: title.trim(),
      message: message.trim(),
      link: link || null,
      senderId: req.user._id,
    });

    // Ghi audit log
    await auditService.log({
      req,
      action: "notification.broadcast",
      targetType: "notification",
      targetId: null,
      after: { type, title, message, link, ...result },
    });

    res.json({
      success: true,
      message: `Đã gửi thông báo tới ${result.sent}/${result.totalUsers} người dùng`,
      ...result,
    });
  }),

  /**
   * POST /admin/notifications/targeted
   * Body: { type, title, message, link?, userIds: [string] }
   * Gửi tới 1 hoặc nhiều user cụ thể.
   */
  targeted: asyncHandler(async (req, res) => {
    const { type, title, message, link, userIds } = req.body;
    if (!type || !ALLOWED_TYPES.includes(type)) {
      throw new ApiError(400, `type không hợp lệ. Phải là một trong: ${ALLOWED_TYPES.join(", ")}`);
    }
    if (!title?.trim()) throw new ApiError(400, "title là bắt buộc");
    if (!message?.trim()) throw new ApiError(400, "message là bắt buộc");
    if (!Array.isArray(userIds) || !userIds.length) {
      throw new ApiError(400, "userIds phải là mảng có ít nhất 1 user");
    }
    if (userIds.length > 1000) {
      throw new ApiError(400, "Tối đa 1000 user mỗi lần gửi");
    }

    const result = await adminNotificationService.sendToUsers({
      type,
      title: title.trim(),
      message: message.trim(),
      link: link || null,
      senderId: req.user._id,
      userIds,
    });

    await auditService.log({
      req,
      action: "notification.targeted",
      targetType: "notification",
      targetId: null,
      after: { type, title, message, link, userIds, ...result },
    });

    res.json({
      success: true,
      message: `Đã gửi thông báo tới ${result.sent}/${userIds.length} user`,
      ...result,
    });
  }),

  /**
   * POST /admin/notifications/filter
   * Body: { type, title, message, link?, filter: { country?, isBanned? } }
   * Gửi theo bộ lọc.
   */
  sendByFilter: asyncHandler(async (req, res) => {
    const { type, title, message, link, filter = {} } = req.body;
    if (!type || !ALLOWED_TYPES.includes(type)) {
      throw new ApiError(400, `type không hợp lệ. Phải là một trong: ${ALLOWED_TYPES.join(", ")}`);
    }
    if (!title?.trim()) throw new ApiError(400, "title là bắt buộc");
    if (!message?.trim()) throw new ApiError(400, "message là bắt buộc");

    const result = await adminNotificationService.sendByFilter({
      type,
      title: title.trim(),
      message: message.trim(),
      link: link || null,
      senderId: req.user._id,
      filter,
    });

    await auditService.log({
      req,
      action: "notification.filter",
      targetType: "notification",
      targetId: null,
      after: { type, title, message, link, filter, ...result },
    });

    res.json({
      success: true,
      message: `Đã gửi thông báo tới ${result.sent}/${result.totalUsers} user khớp filter`,
      ...result,
    });
  }),

  /**
   * GET /admin/notifications/history?page=1&limit=20
   */
  history: asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const data = await adminNotificationService.history({
      page: Number(page) || 1,
      limit: Math.min(Number(limit) || 20, 100),
    });
    res.json(data);
  }),

  /**
   * GET /admin/notifications/campaign-detail?type=&title=&message=&link=&sentAt=
   */
  campaignDetail: asyncHandler(async (req, res) => {
    const { type, title, message, link, sentAt, page = 1, limit = 50 } = req.query;
    if (!type || !title || !message) {
      throw new ApiError(400, "type, title, message là bắt buộc");
    }
    const data = await adminNotificationService.campaignDetail({
      type,
      title,
      message,
      link: link || "",
      sentAt,
      page: Number(page) || 1,
      limit: Math.min(Number(limit) || 50, 200),
    });
    res.json(data);
  }),

  /**
   * GET /admin/notifications/campaign-count?type=&title=&message=&link=&sentAt=
   * Đếm số notif của 1 campaign (preview trước khi xóa).
   */
  campaignCount: asyncHandler(async (req, res) => {
    const { type, title, message, link, sentAt } = req.query;
    if (!type || !title || !message) {
      throw new ApiError(400, "type, title, message là bắt buộc");
    }
    const data = await adminNotificationService.countByCampaign({
      type,
      title,
      message,
      link: link || "",
      sentAt,
    });
    res.json(data);
  }),

  /**
   * DELETE /admin/notifications/campaign
   * Body: { type, title, message, link, sentAt }
   * Xóa toàn bộ notification của 1 campaign khỏi DB user.
   * Emit realtime notification:deleted để user FE xóa khỏi danh sách.
   */
  deleteCampaign: asyncHandler(async (req, res) => {
    const { type, title, message, link, sentAt } = req.body;
    if (!type || !title || !message) {
      throw new ApiError(400, "type, title, message là bắt buộc");
    }

    // Preview trước khi xóa
    const counts = await adminNotificationService.countByCampaign({
      type,
      title,
      message,
      link: link || "",
      sentAt,
    });

    if (counts.total === 0) {
      throw new ApiError(404, "Không tìm thấy campaign này (có thể đã bị xóa trước đó)");
    }

    const result = await adminNotificationService.deleteCampaign({
      type,
      title,
      message,
      link: link || "",
      sentAt,
    });

    // Ghi audit log
    await auditService.log({
      req,
      action: "notification.delete_campaign",
      targetType: "notification",
      targetId: null,
      before: { type, title, message, link, sentAt, ...counts },
      after: { deleted: result.deleted },
    });

    res.json({
      success: true,
      message: `Đã xóa ${result.deleted} thông báo của campaign "${title}"`,
      ...result,
    });
  }),
};
