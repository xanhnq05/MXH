// Media service — quản lý MediaAsset (sticker + gif) tự host.
// Thay thế dần cho JSON tĩnh trending.json. Hỗ trợ search, ranking, CRUD.

import MediaAsset, { normalizeVi } from "../models/MediaAsset.js";
import StickerPack from "../models/StickerPack.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadService } from "./upload.service.js";

const MAX_RESULTS = 50;

// Chuẩn hoá và tách phrase. Ưu tiên phrase > tag/keyword > synonym > name.
const rankScore = (asset, normalizedQuery, originalQuery) => {
  const q = normalizedQuery;
  const qLower = (originalQuery || "").toLowerCase().trim();
  let score = 0;

  // 1. Exact phrase (cao nhất)
  if (q.length >= 3) {
    for (const phrase of asset.phrases || []) {
      const np = normalizeVi(phrase);
      if (np === q) return 1000;
      if (np.includes(q)) score = Math.max(score, 800);
    }
  }

  // 2. Exact tag / keyword
  for (const t of asset.tags || []) {
    if (t.toLowerCase() === qLower) return 700;
    if (normalizeVi(t) === q) score = Math.max(score, 650);
    if (normalizeVi(t).includes(q)) score = Math.max(score, 500);
  }
  for (const k of asset.keywords || []) {
    if (k.toLowerCase() === qLower) return 600;
    if (normalizeVi(k) === q) score = Math.max(score, 550);
    if (normalizeVi(k).includes(q)) score = Math.max(score, 400);
  }

  // 3. Synonym
  for (const syn of asset.synonyms || []) {
    if (normalizeVi(syn) === q) score = Math.max(score, 350);
    if (normalizeVi(syn).includes(q)) score = Math.max(score, 200);
  }

  // 4. Name / category
  if (normalizeVi(asset.name) === q) score = Math.max(score, 300);
  if (normalizeVi(asset.name).includes(q)) score = Math.max(score, 150);
  if (normalizeVi(asset.category).includes(q)) score = Math.max(score, 100);

  // 5. Priority / usage nhỏ
  score += Math.min(asset.priority || 0, 50);
  score += Math.min(Math.floor((asset.usageCount || 0) / 10), 20);

  return score;
};

export const mediaService = {
  /** Search asset active theo query. Hỗ trợ tiếng Việt có dấu và không dấu. */
  async search(q, { mediaType, limit = 20 } = {}) {
    if (!q || !q.trim()) return [];
    const normalized = normalizeVi(q);
    if (!normalized || normalized.length < 2) return [];

    // Pull tập candidate để tránh query DB quá rộng
    const filter = { isActive: true };
    if (mediaType) filter.mediaType = mediaType;
    // Lấy tối đa 200 candidate để rank
    const candidates = await MediaAsset.find(filter)
      .limit(200)
      .sort({ priority: -1, createdAt: -1 });

    const scored = candidates
      .map((a) => ({ asset: a, score: rankScore(a, normalized, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(limit, MAX_RESULTS))
      .map((x) => x.asset);
    return scored;
  },

  /** List với phân trang + filter */
  async list({ page = 1, limit = 20, mediaType, category, isActive, search } = {}) {
    const filter = {};
    if (mediaType) filter.mediaType = mediaType;
    if (category) filter.category = category;
    if (typeof isActive === "boolean") filter.isActive = isActive;
    if (search) {
      const rx = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      filter.$or = [{ name: rx }, { tags: rx }, { keywords: rx }];
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      MediaAsset.find(filter)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      MediaAsset.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  },

  async getById(id) {
    const asset = await MediaAsset.findById(id);
    if (!asset) throw new ApiError(404, "Không tìm thấy asset");
    return asset;
  },

  /** Upload file mới (admin only) */
  async upload({ file, meta, userId }) {
    if (!file) throw new ApiError(400, "Thiếu file");
    const folder = meta.mediaType === "gif" ? "stickers/gifs" : "stickers/packs";
    const uploaded = await uploadService.uploadFile({
      buffer: file.buffer,
      originalName: file.originalname,
      mimetype: file.mimetype,
      folder,
      userId,
    });
    return uploaded; // { url, key, size, mimeType }
  },

  /** Tạo mới asset sau khi đã upload file */
  async create({ meta, file, userId }) {
    if (!file) throw new ApiError(400, "Thiếu file");
    // 1) Upload file
    const uploaded = await this.upload({ file, meta, userId });
    // 2) Tạo record
    const doc = await MediaAsset.create({
      ...meta,
      url: uploaded.url,
      storageKey: uploaded.key,
      mimeType: uploaded.mimeType,
      fileSize: uploaded.size,
      createdBy: userId,
      updatedBy: userId,
    });
    return doc;
  },

  /** Cập nhật metadata */
  async update(id, patch, userId) {
    const doc = await MediaAsset.findById(id);
    if (!doc) throw new ApiError(404, "Không tìm thấy asset");
    const allowed = [
      "name",
      "description",
      "category",
      "tags",
      "keywords",
      "synonyms",
      "phrases",
      "language",
      "sentiment",
      "isActive",
      "priority",
      "packKey",
    ];
    for (const k of allowed) {
      if (k in patch) doc[k] = patch[k];
    }
    // Normalize tags/keywords/synonyms: trim, unique
    for (const arr of ["tags", "keywords", "synonyms", "phrases"]) {
      if (Array.isArray(doc[arr])) {
        doc[arr] = Array.from(
          new Set(
            doc[arr]
              .map((x) => String(x).trim().toLowerCase())
              .filter(Boolean)
          )
        ).slice(0, 30);
      }
    }
    doc.updatedBy = userId;
    await doc.save();
    return doc;
  },

  /** Toggle active hoặc xoá mềm */
  async setActive(id, isActive, userId) {
    const doc = await MediaAsset.findById(id);
    if (!doc) throw new ApiError(404, "Không tìm thấy asset");
    doc.isActive = !!isActive;
    doc.updatedBy = userId;
    await doc.save();
    return doc;
  },

  /** Xoá mềm (chỉ tắt active) */
  async softDelete(id, userId) {
    return this.setActive(id, false, userId);
  },

  /** Xoá cứng (xoá DB + storage). Cẩn thận — không reversible. */
  async hardDelete(id) {
    const doc = await MediaAsset.findById(id);
    if (!doc) throw new ApiError(404, "Không tìm thấy asset");
    // Xoá storage object (best-effort)
    if (doc.storageKey) {
      await uploadService.deleteFile(doc.storageKey).catch(() => {});
    }
    if (doc.thumbnailKey) {
      await uploadService.deleteFile(doc.thumbnailKey).catch(() => {});
    }
    await doc.deleteOne();
    return { success: true };
  },

  /** Lấy danh sách packs cho StickerPicker (giữ tương thích) */
  async listPacks() {
    // Tổng hợp từ MediaAsset.packKey và StickerPack
    const packs = await StickerPack.find().select("-stickers").sort({ order: 1 });
    return packs;
  },
};
