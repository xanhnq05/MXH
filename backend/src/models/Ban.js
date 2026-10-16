// Ban — lịch sử cấm tài khoản.
// Mỗi lần admin ban là tạo 1 record Ban mới. Cùng user có thể có nhiều ban
// (active cũ sẽ được đánh dấu lifted khi ban mới được tạo hoặc khi unban).

import mongoose from "mongoose";

const banSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: { type: String, required: true, maxlength: 500 },
    category: {
      type: String,
      enum: ["spam", "abuse", "hate", "nsfw", "scam", "impersonation", "other"],
      required: true,
    },
    scope: {
      type: [String],
      enum: ["login", "chat", "post", "comment", "message"],
      default: ["login", "chat", "post", "comment", "message"],
    },
    expiresAt: { type: Date, default: null }, // null = vĩnh viễn
    isActive: { type: Boolean, default: true, index: true },
    liftedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    liftedAt: { type: Date, default: null },
    liftReason: { type: String, default: "" },
    evidenceReportIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Report" },
    ],
  },
  { timestamps: true }
);

banSchema.index({ userId: 1, isActive: 1, expiresAt: 1 });
banSchema.index({ createdAt: -1 });

export default mongoose.model("Ban", banSchema);
