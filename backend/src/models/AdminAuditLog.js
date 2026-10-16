// AdminAuditLog — ghi log mọi hành động của admin (CRUD trên user/media/report/...).
// Không thể xoá từ API; chỉ MongoDB admin mới có quyền truncate.

import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    adminEmail: { type: String, default: "" },
    adminRole: { type: String, default: "admin" },
    action: { type: String, required: true, index: true },
    // vd: 'user.ban', 'user.unban', 'user.warn', 'media.delete', 'report.resolve'
    targetType: { type: String, default: null, index: true },
    // 'user' | 'media' | 'report' | 'post' | 'comment' | 'system' | null
    targetId: { type: String, default: null },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ adminId: 1, createdAt: -1 });

export default mongoose.model("AdminAuditLog", auditLogSchema);
