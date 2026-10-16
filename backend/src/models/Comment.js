// Comment — 1 cấp reply (parentId).
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
    content: { type: String, required: true, maxlength: 2000 },
    likeCount: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

commentSchema.index({ postId: 1, createdAt: 1 });
commentSchema.index({ postId: 1, parentId: 1, createdAt: 1 });

export default mongoose.model("Comment", commentSchema);
