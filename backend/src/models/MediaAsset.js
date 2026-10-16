// MediaAsset — gộp sticker + GIF trong 1 model.
// Lưu trong Supabase Storage (đã có sẵn ở project), thay thế cho JSON tĩnh trending.json
// và bổ sung cho StickerPack hiện tại (giữ StickerPack để tương thích ngược).

import mongoose from "mongoose";

const mediaAssetSchema = new mongoose.Schema(
  {
    mediaType: {
      type: String,
      enum: ["sticker", "gif"],
      required: true,
      index: true,
    },
    packKey: { type: String, default: null, index: true }, // liên kết với StickerPack
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: "", maxlength: 500 },

    // File / storage
    url: { type: String, required: true },
    storageKey: { type: String, required: true },
    thumbnailUrl: { type: String, default: null },
    thumbnailKey: { type: String, default: null },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true }, // bytes
    width: { type: Number, default: null },
    height: { type: Number, default: null },

    // Metadata cho tìm kiếm
    category: { type: String, default: "", index: true },
    tags: { type: [String], default: [] }, // tag ngắn: ["vui", "happy", "cười"]
    keywords: { type: [String], default: [] }, // từ khoá EN/VN ngắn
    synonyms: { type: [String], default: [] }, // cụm từ tương đương: "sn", "sinh nhật"
    phrases: { type: [String], default: [] }, // cụm nhiều từ: "chúc mừng sinh nhật"
    language: { type: String, default: "vi", index: true },
    sentiment: {
      type: String,
      enum: ["positive", "negative", "neutral", "love", "angry", "sad", "funny", ""],
      default: "",
    },

    // Trạng thái
    isActive: { type: Boolean, default: true, index: true },
    isLegacy: { type: Boolean, default: false }, // đánh dấu asset cũ từ JSON Giphy
    priority: { type: Number, default: 0, index: true },
    usageCount: { type: Number, default: 0 },

    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Index cho search: dùng regex an toàn ở application layer
mediaAssetSchema.index({ name: 1 });
mediaAssetSchema.index({ tags: 1 });
mediaAssetSchema.index({ keywords: 1 });
// Compound index cho query production: { isActive, mediaType, language }
mediaAssetSchema.index({ isActive: 1, mediaType: 1, language: 1, priority: -1 });

// Normalize chuỗi tiếng Việt: bỏ dấu, lowercase. Dùng để match khi search.
// Hỗ trợ tìm "sinh nhật" khớp "sinh nat", v.v.
export const normalizeVi = (s) => {
  if (!s) return "";
  return String(s)
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // bỏ dấu
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export default mongoose.model("MediaAsset", mediaAssetSchema);
