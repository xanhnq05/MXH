// UserSettings — tuỳ chỉnh riêng cho từng user (đã có phần lớn trong User rồi, file này dùng cho phần mở rộng).
import mongoose from "mongoose";

const userSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    // Tắt thông báo theo conversation / user
    mutedConversations: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
    ],
    mutedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Ngôn ngữ
    language: { type: String, default: "vi" },
    // Tự động download media
    autoDownloadMedia: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("UserSettings", userSettingsSchema);
