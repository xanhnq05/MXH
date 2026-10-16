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

    // Tags để filter bài viết (lowercase, không dấu, kebab-style)
    tags: {
      type: [String],
      default: [],
      index: true,
    },

    // Soft delete: bài xoá vẫn giữ để thread comment không gãy
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1, _id: -1 });
postSchema.index({ authorId: 1, createdAt: -1 });
// Index phục vụ filter theo tag
postSchema.index({ tags: 1, createdAt: -1 });
// Index phục vụ filter theo năm (sử dụng createdAt)

postSchema.methods.toClient = function (meId = null) {
  const isLiked = meId
    ? this.likes.some((id) => id.toString() === meId.toString())
    : false;
  return {
    _id: this._id,
    author: this.authorId,
    content: this.content,
    media: this.media,
    visibility: this.visibility,
    likeCount: this.likeCount,
    commentCount: this.commentCount,
    shareCount: this.shareCount,
    tags: this.tags || [],
    isLiked,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export default mongoose.model("Post", postSchema);
