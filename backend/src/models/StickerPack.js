// StickerPack — metadata bộ sticker. File thực tế lưu ở Supabase S3 hoặc local public folder.
import mongoose from "mongoose";

const stickerSchema = new mongoose.Schema(
  {
    packId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    tags: [{ type: String }],
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const stickerPackSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // 'moji-fun', 'cats', ...
    name: { type: String, required: true },
    description: { type: String, default: "" },
    thumbnailUrl: { type: String, required: true },
    isFree: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    stickers: { type: [stickerSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("StickerPack", stickerPackSchema);
