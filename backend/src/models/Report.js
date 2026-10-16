// Report — báo cáo vi phạm do user gửi.
// targetType: user | post | comment | message | sticker
// targetSnapshot: chụp nhanh thông tin target tại thời điểm report
// (phòng khi target bị xoá, admin vẫn thấy được nội dung report).

import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["user", "post", "comment", "message", "sticker"],
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    targetSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    category: {
      type: String,
      enum: ["spam", "abuse", "hate", "nsfw", "scam", "impersonation", "other"],
      required: true,
    },
    description: { type: String, default: "", maxlength: 1000 },
    status: {
      type: String,
      enum: ["open", "reviewing", "resolved", "dismissed"],
      default: "open",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "critical"],
      default: "normal",
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolution: {
      type: String,
      enum: ["ban_user", "delete_content", "warn", "no_action"],
      default: null,
    },
    resolutionNote: { type: String, default: "", maxlength: 500 },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });
reportSchema.index({ reporterId: 1, createdAt: -1 });

export default mongoose.model("Report", reportSchema);
