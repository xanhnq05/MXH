// reports.controller — endpoints quản lý report (admin).

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { reportsService } from "../services/reports.service.js";
import { auditService } from "../services/audit.service.js";

export const reportsController = {
  list: asyncHandler(async (req, res) => {
    const { page, limit, status, targetType, category, priority, search } = req.query;
    const data = await reportsService.list({
      page: Number(page) || 1,
      limit: Math.min(Number(limit) || 20, 100),
      status,
      targetType,
      category,
      priority,
      search,
    });
    res.json(data);
  }),

  get: asyncHandler(async (req, res) => {
    const report = await reportsService.getById(req.params.id);
    res.json({ report });
  }),

  assign: asyncHandler(async (req, res) => {
    const report = await reportsService.assign(req.params.id, req.user._id);
    await auditService.log(req, {
      action: "report.assign",
      targetType: "report",
      targetId: report._id,
      after: { assignedTo: req.user._id },
    });
    res.json({ report });
  }),

  resolve: asyncHandler(async (req, res) => {
    const { resolution, resolutionNote } = req.body;
    if (!resolution) throw new ApiError(400, "Thiếu resolution");
    const report = await reportsService.resolve(req.params.id, {
      resolution,
      resolutionNote,
      resolvedBy: req.user._id,
    });
    await auditService.log(req, {
      action: "report.resolve",
      targetType: "report",
      targetId: report._id,
      after: { resolution, resolutionNote },
    });
    res.json({ report });
  }),

  dismiss: asyncHandler(async (req, res) => {
    const { resolutionNote } = req.body || {};
    const report = await reportsService.dismiss(req.params.id, {
      resolutionNote,
      resolvedBy: req.user._id,
    });
    await auditService.log(req, {
      action: "report.dismiss",
      targetType: "report",
      targetId: report._id,
      after: { resolutionNote },
    });
    res.json({ report });
  }),

  counts: asyncHandler(async (req, res) => {
    const counts = await reportsService.getCounts();
    res.json(counts);
  }),
};
