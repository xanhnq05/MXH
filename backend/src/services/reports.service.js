// reports.service — quản lý report (admin).

import Report from "../models/Report.js";
import { ApiError } from "../utils/ApiError.js";

export const reportsService = {
  async list({ page = 1, limit = 20, status, targetType, category, priority, search } = {}) {
    const filter = {};
    if (status) filter.status = status;
    if (targetType) filter.targetType = targetType;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ description: rx }];
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("reporterId", "username displayName avatarUrl")
        .populate("assignedTo", "username displayName email")
        .populate("resolvedBy", "username displayName email"),
      Report.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  },

  async getById(id) {
    const report = await Report.findById(id)
      .populate("reporterId", "username displayName avatarUrl email")
      .populate("assignedTo", "username displayName email")
      .populate("resolvedBy", "username displayName email")
      .populate("evidenceReportIds");
    if (!report) throw new ApiError(404, "Report không tồn tại");
    return report;
  },

  async assign(id, adminId) {
    const report = await Report.findByIdAndUpdate(
      id,
      { assignedTo: adminId, status: "reviewing" },
      { new: true }
    );
    if (!report) throw new ApiError(404, "Report không tồn tại");
    return report;
  },

  async resolve(id, { resolution, resolutionNote, resolvedBy }) {
    const report = await Report.findByIdAndUpdate(
      id,
      {
        status: "resolved",
        resolution,
        resolutionNote: resolutionNote || "",
        resolvedBy,
        resolvedAt: new Date(),
      },
      { new: true }
    );
    if (!report) throw new ApiError(404, "Report không tồn tại");
    return report;
  },

  async dismiss(id, { resolutionNote, resolvedBy }) {
    const report = await Report.findByIdAndUpdate(
      id,
      {
        status: "dismissed",
        resolution: "no_action",
        resolutionNote: resolutionNote || "",
        resolvedBy,
        resolvedAt: new Date(),
      },
      { new: true }
    );
    if (!report) throw new ApiError(404, "Report không tồn tại");
    return report;
  },

  async getCounts() {
    const [open, reviewing, resolved, dismissed] = await Promise.all([
      Report.countDocuments({ status: "open" }),
      Report.countDocuments({ status: "reviewing" }),
      Report.countDocuments({ status: "resolved" }),
      Report.countDocuments({ status: "dismissed" }),
    ]);
    return { open, reviewing, resolved, dismissed, total: open + reviewing + resolved + dismissed };
  },
};

export default reportsService;
