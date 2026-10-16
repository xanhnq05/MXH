// Schema User — đã mở rộng đầy đủ cho MXH: avatar, cover, E2EE public key, theme, sound...

import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9_]+$/, // chỉ cho phép chữ thường, số, gạch dưới
    },
    hashedPassword: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    usernameLastChanged: {
      type: Date,
      default: null,
    },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    birthday: {
      type: Date,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    // Thông tin bổ sung cho gợi ý bạn bè & tìm kiếm
    country: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    school: { type: String, trim: true, default: "" },
    workplace: { type: String, trim: true, default: "" },
    // Geo/IP — dùng cho gợi ý theo quốc gia
    lastLoginIp: { type: String, default: "" },
    lastLoginCountry: { type: String, default: "" },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    avatarUrl: { type: String },
    avatarId: { type: String }, // public_id trên Supabase
    coverUrl: { type: String },
    coverId: { type: String },
    bio: { type: String, maxlength: 500 },

    // Presence (cập nhật khi socket connect/disconnect)
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },

    // Cài đặt cá nhân
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "system",
    },
    soundEnabled: { type: Boolean, default: true },
    soundTheme: {
      type: String,
      enum: ["default", "bell", "chime"],
      default: "default",
    },

    // E2EE public key (RSA-OAEP 2048, base64) — server lưu, KHÔNG lưu private key
    e2eePublicKey: { type: String },
    e2eeEcdhPublicKey: { type: String }, // ECDH P-256 public key (JWK hoặc base64)
  },
  { timestamps: true }
);

// Index phục vụ search
userSchema.index({ username: "text", displayName: "text" });

export default mongoose.model("User", userSchema);
