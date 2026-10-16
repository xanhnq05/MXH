// Post — bài viết. likeCount/commentCount là số đếm lưu sẵn.
import mongoose from "mongoose";

const mediaItemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["image", "video"], required: true },
    url: { type: String, required: true },
    storageKey: { type: String, required: true }, // path trên Supabase
    width: { type: Number },
    height: { type: Number },
    duration: { type: Number }, // chỉ video
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: { type: String, maxlength: 5000 },
    media: { type: [mediaItemSchema], default: [] },
    visibility: {
      type: String,
      enum: ["public", "friends", "private"],
      default: "public",
      index: true,
    },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },

    // Danh sách userId đã like — dùng cho toggle nhanh + check "đã like chưa"
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Soft delete: bài xoá vẫn giữ để thread comment không gãy
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1, _id: -1 });
postSchema.index({ authorId: 1, createdAt: -1 });

postSchema.methods.toClient = function () {
  return {
    _id: this._id,
    author: this.authorId,
    content: this.content,
    media: this.media,
    visibility: this.visibility,
    likeCount: this.likeCount,
    commentCount: this.commentCount,
    shareCount: this.shareCount,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export default mongoose.model("Post", postSchema);
