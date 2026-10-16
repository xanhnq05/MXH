// audit.service — ghi log hành động admin.
// Gọi từ bất kỳ controller nào: await auditService.log(req, { action, ... })
// Không throw — log lỗi nếu ghi DB thất bại để không làm vỡ request chính.

import AdminAuditLog from "../models/AdminAuditLog.js";

export const auditService = {
  async log(req, { action, targetType = null, targetId = null, before = null, after = null, metadata = null } = {}) {
    try {
      await AdminAuditLog.create({
        adminId: req.user?._id,
        adminEmail: req.user?.email || "",
        adminRole: req.user?.role || "admin",
        action,
        targetType,
        targetId: targetId ? String(targetId) : null,
        before,
        after,
        metadata,
        ip: req.ip || req.headers["x-forwarded-for"] || req.connection?.remoteAddress || "",
        userAgent: req.headers["user-agent"] || "",
      });
    } catch (e) {
      console.error("[audit] failed to write log:", e.message);
    }
  },

  async list({ page = 1, limit = 50, adminId, action, targetType, from, to } = {}) {
    const filter = {};
    if (adminId) filter.adminId = adminId;
    if (action) filter.action = action;
    if (targetType) filter.targetType = targetType;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      AdminAuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("adminId", "email displayName username"),
      AdminAuditLog.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  },
};

export default auditService;
