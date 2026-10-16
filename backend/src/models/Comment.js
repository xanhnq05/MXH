// Comment — 1 cấp reply (parentId). Hỗ trợ text, sticker, gif.
// Mỗi comment chỉ chứa 1 loại nội dung (text XOR sticker XOR gif).

import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    // Loại nội dung: text | sticker | gif
    type: {
      type: String,
      enum: ["text", "sticker", "gif"],
      default: "text",
    },
    // Nội dung text (chỉ dùng khi type=text). Max 500 ký tự.
    content: { type: String, maxlength: 500, default: "" },
    // Sticker (dùng khi type=sticker)
    stickerId: { type: String, default: null },
    stickerUrl: { type: String, default: null },
    // GIF (dùng khi type=gif) — dùng id từ Giphy để client render
    gifId: { type: String, default: null },
    gifUrl: { type: String, default: null },
    likeCount: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

commentSchema.index({ postId: 1, createdAt: 1 });
commentSchema.index({ postId: 1, parentId: 1, createdAt: 1 });

// Validation: đúng 1 loại nội dung
commentSchema.pre("validate", function (next) {
  if (this.type === "text") {
    if (!this.content || !this.content.trim()) {
      return next(new Error("Nội dung bình luận không được trống"));
    }
    this.stickerId = null;
    this.stickerUrl = null;
    this.gifId = null;
    this.gifUrl = null;
  } else if (this.type === "sticker") {
    if (!this.stickerId || !this.stickerUrl) {
      return next(new Error("Thiếu thông tin sticker"));
    }
    this.content = "";
    this.gifId = null;
    this.gifUrl = null;
  } else if (this.type === "gif") {
    if (!this.gifId || !this.gifUrl) {
      return next(new Error("Thiếu thông tin gif"));
    }
    this.content = "";
    this.stickerId = null;
    this.stickerUrl = null;
  }
  next();
});

export default mongoose.model("Comment", commentSchema);
