import { Router } from "express";
import { mediaService } from "../services/media.service.js";
import { protectedRoute } from "../middlewares/auth.middleware.js";
import { adminOnly } from "../middlewares/admin.middleware.js";
import { uploadMiddleware } from "../middlewares/upload.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import cache from "../libs/cache.js";

const router = Router();

// Tất cả route admin yêu cầu đăng nhập + quyền admin
router.use(protectedRoute, adminOnly);

// Cache metrics - hit/miss ratio de debug hieu nang
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

// List assets với phân trang + filter
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

// Upload + tạo mới
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
      // Mặc định: nếu mime là gif → gif, ngược lại sticker
      meta.mediaType = req.file?.mimetype === "image/gif" ? "gif" : "sticker";
    }
    const asset = await mediaService.create({ meta, file: req.file, userId: req.user._id });
    res.status(201).json({ asset });
  })
);

// Cập nhật metadata
router.patch(
  "/media/:id",
  asyncHandler(async (req, res) => {
    const asset = await mediaService.update(req.params.id, req.body, req.user._id);
    res.json({ asset });
  })
);

// Bật/tắt
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

// Xoá mềm
router.delete(
  "/media/:id",
  asyncHandler(async (req, res) => {
    await mediaService.softDelete(req.params.id, req.user._id);
    res.json({ success: true });
  })
);

// Xoá cứng — cần query ?hard=true
router.delete(
  "/media/:id/hard",
  asyncHandler(async (req, res) => {
    await mediaService.hardDelete(req.params.id);
    res.json({ success: true });
  })
);

export default router;
