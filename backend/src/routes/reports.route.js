// reports.route — public endpoint cho user gửi report.
// Admin dùng endpoint trong /api/admin/reports.

import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { protectedRoute } from "../middlewares/auth.middleware.js";
import Report from "../models/Report.js";
import { auditService } from "../services/audit.service.js";

const router = Router();

router.use(protectedRoute);

// User gửi report
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { targetType, targetId, category, description, targetSnapshot } = req.body;
    if (!targetType || !targetId || !category) {
      throw new ApiError(400, "Thiếu targetType, targetId hoặc category");
    }
    if (!["user", "post", "comment", "message", "sticker"].includes(targetType)) {
      throw new ApiError(400, "targetType không hợp lệ");
    }
    if (!["spam", "abuse", "hate", "nsfw", "scam", "impersonation", "other"].includes(category)) {
      throw new ApiError(400, "category không hợp lệ");
    }
    const report = await Report.create({
      reporterId: req.user._id,
      targetType,
      targetId,
      targetSnapshot: targetSnapshot || null,
      category,
      description: description || "",
    });
    res.status(201).json({ report });
  })
);

// User xem các report mình đã gửi
router.get(
  "/mine",
  asyncHandler(async (req, res) => {
    const items = await Report.find({ reporterId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ items });
  })
);

export default router;
