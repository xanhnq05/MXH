// Admin route — chỉ admin mới truy cập (admin.middleware.js enforce).
// Bao gồm: media (sticker + gif), users, reports, analytics, audit, cache.

import { Router } from "express";
import { mediaService } from "../services/media.service.js";
import { protectedRoute } from "../middlewares/auth.middleware.js";
import { adminOnly } from "../middlewares/admin.middleware.js";
import { uploadMiddleware } from "../middlewares/upload.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import cache from "../libs/cache.js";

import { adminUsersController } from "../controllers/adminUsers.controller.js";
import { reportsController } from "../controllers/reports.controller.js";
import { analyticsController } from "../controllers/analytics.controller.js";
import { auditController } from "../controllers/audit.controller.js";
import { adminNotificationController } from "../controllers/adminNotification.controller.js";

const router = Router();

// Tất cả route admin yêu cầu đăng nhập + quyền admin
router.use(protectedRoute, adminOnly);

// ===== Cache metrics =====
router.get(
  "/cache/stats",
  asyncHandler(async (_req, res) => {
    res.json(cache.getMetrics());
  })
);
router.post(
  "/cache/reset-metrics",
  asyncHandler(async (_req, res) => {
    cache.resetMetrics();
    res.json({ success: true, ...cache.getMetrics() });
  })
);

// ===== Analytics =====
router.get("/analytics/overview", analyticsController.overview);
router.get("/analytics/user-growth", analyticsController.userGrowth);
router.get("/analytics/message-volume", analyticsController.messageVolume);
router.get("/analytics/reports-by-category", analyticsController.reportsByCategory);
router.get("/analytics/reports-by-status", analyticsController.reportsByStatus);
router.get("/analytics/top-reporters", analyticsController.topReporters);
router.get("/analytics/top-reported-users", analyticsController.topReportedUsers);

// ===== Users =====
router.get("/users", adminUsersController.list);
router.get("/users/:id", adminUsersController.get);
router.patch("/users/:id", adminUsersController.update);
router.post("/users/:id/warn", adminUsersController.warn);
router.post("/users/:id/ban", adminUsersController.ban);
router.post("/users/:id/unban", adminUsersController.unban);
router.delete("/users/:id", adminUsersController.softDelete);

// ===== Reports =====
router.get("/reports/counts", reportsController.counts);
router.get("/reports", reportsController.list);
router.get("/reports/:id", reportsController.get);
router.patch("/reports/:id/assign", reportsController.assign);
router.post("/reports/:id/resolve", reportsController.resolve);
router.post("/reports/:id/dismiss", reportsController.dismiss);

// ===== Audit Log =====
router.get("/audit-logs", auditController.list);

// ===== Notifications (Admin broadcast) =====
router.post("/notifications/broadcast", adminNotificationController.broadcast);
router.post("/notifications/targeted", adminNotificationController.targeted);
router.post("/notifications/filter", adminNotificationController.sendByFilter);
router.get("/notifications/history", adminNotificationController.history);
router.get("/notifications/campaign-detail", adminNotificationController.campaignDetail);
router.get("/notifications/campaign-count", adminNotificationController.campaignCount);
router.delete("/notifications/campaign", adminNotificationController.deleteCampaign);

// ===== Media (Sticker + GIF) =====
router.get(
  "/media",
  asyncHandler(async (req, res) => {
    const { page, limit, mediaType, category, isActive, search } = req.query;
    const data = await mediaService.list({
      page: Number(page) || 1,
      limit: Math.min(Number(limit) || 20, 100),
      mediaType,
      category,
      isActive:
        isActive === undefined ? undefined : isActive === "true" || isActive === true,
      search,
    });
    res.json(data);
  })
);
router.get(
  "/media/:id",
  asyncHandler(async (req, res) => {
    res.json({ asset: await mediaService.getById(req.params.id) });
  })
);
router.post(
  "/media",
  uploadMiddleware.single("file"),
  asyncHandler(async (req, res) => {
    let meta = {};
    try {
      meta = req.body.meta ? JSON.parse(req.body.meta) : req.body;
    } catch {
      meta = req.body;
    }
    if (!meta.name) meta.name = (req.file?.originalname || "asset").replace(/\.[^.]+$/, "");
    if (!meta.mediaType) {
      meta.mediaType = req.file?.mimetype === "image/gif" ? "gif" : "sticker";
    }
    const asset = await mediaService.create({ meta, file: req.file, userId: req.user._id });
    res.status(201).json({ asset });
  })
);
router.patch(
  "/media/:id",
  asyncHandler(async (req, res) => {
    const asset = await mediaService.update(req.params.id, req.body, req.user._id);
    res.json({ asset });
  })
);
router.patch(
  "/media/:id/active",
  asyncHandler(async (req, res) => {
    const asset = await mediaService.setActive(
      req.params.id,
      !!req.body.isActive,
      req.user._id
    );
    res.json({ asset });
  })
);
router.delete(
  "/media/:id",
  asyncHandler(async (req, res) => {
    await mediaService.softDelete(req.params.id, req.user._id);
    res.json({ success: true });
  })
);
router.delete(
  "/media/:id/hard",
  asyncHandler(async (req, res) => {
    await mediaService.hardDelete(req.params.id);
    res.json({ success: true });
  })
);

export default router;
