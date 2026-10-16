// Message — tin nhắn.
// type: text | image | file | voice | sticker | system | share_post
// Nếu isEncrypted = true, content chứa ciphertext (base64), iv + authTag đi kèm.
// Server KHÔNG đọc plaintext khi E2EE.

import mongoose from "mongoose";

const deliveryStatusSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deliveredAt: { type: Date, default: Date.now },
    readAt: { type: Date, default: null },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "text",
        "image",
        "file",
        "voice",
        "sticker",
        "gif",
        "system",
        "share_post",
      ],
      default: "text",
    },
    content: { type: String, default: "" }, // text hoặc caption cho ảnh/file

    // File/voice/image
    fileUrl: { type: String },
    fileKey: { type: String },
    fileName: { type: String },
    fileSize: { type: Number }, // bytes
    mimeType: { type: String },
    duration: { type: Number }, // voice (giây)

    // Sticker / GIF
    stickerId: { type: String },
    stickerUrl: { type: String },

    // E2EE
    isEncrypted: { type: Boolean, default: false },
    iv: { type: String }, // base64
    authTag: { type: String }, // base64
    encryptedKeys: [
      {
        // map: userId → encryptedAES key
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        encryptedKey: { type: String },
      },
    ],

    // Reply
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },

    // Trạng thái gửi/nhận/đọc
    deliveries: { type: [deliveryStatusSchema], default: [] },

    // Ghim
    isPinned: { type: Boolean, default: false },
    pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    pinnedAt: { type: Date },

    // Xoá
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: -1, _id: -1 });
messageSchema.index({ conversationId: 1, isPinned: 1 });

export default mongoose.model("Message", messageSchema);
