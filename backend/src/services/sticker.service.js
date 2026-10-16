// Sticker service — metadata + search theo tag.
// Dữ liệu thực tế sẽ seed vào DB (StickerPack + StickerItem) khi chạy seeder.

import StickerPack from "../models/StickerPack.js";
import { ApiError } from "../utils/ApiError.js";
import cache from "../libs/cache.js";

const STICKER_PACK_TTL = 600; // 10 phut - metadata it thay doi

export const stickerService = {
  async listPacks() {
    const cacheKey = "sticker:packs:list";
    if (cache.isAvailable()) {
      const cached = await cache.get(cacheKey);
      if (cached) return cached;
    }
    const data = await StickerPack.find().select("-stickers").sort({ order: 1 });
    if (cache.isAvailable()) await cache.set(cacheKey, data, STICKER_PACK_TTL);
    return data;
  },

  async getPack(key) {
    const cacheKey = `sticker:pack:${key}`;
    if (cache.isAvailable()) {
      const cached = await cache.get(cacheKey);
      if (cached) return cached;
    }
    const data = await StickerPack.findOne({ key });
    if (!data) throw new ApiError(404, "Không tìm thấy bộ sticker");
    if (cache.isAvailable()) await cache.set(cacheKey, data, STICKER_PACK_TTL);
    return data;
  },

  async searchStickers(q, { limit = 20 } = {}) {
    if (!q || q.trim().length < 1) return [];
    const cacheKey = `sticker:search:${q.trim().toLowerCase()}:${limit}`;
    if (cache.isAvailable()) {
      const cached = await cache.get(cacheKey);
      if (cached) return cached;
    }
    const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const packs = await StickerPack.find({ "stickers.tags": regex }).limit(5);
    const results = [];
    for (const pack of packs) {
      for (const s of pack.stickers) {
        if (
          s.tags?.some((t) => regex.test(t)) ||
          regex.test(s.name) ||
          regex.test(pack.name)
        ) {
          results.push({
            ...s.toObject(),
            packKey: pack.key,
            packName: pack.name,
            thumbnailUrl: pack.thumbnailUrl,
          });
          if (results.length >= limit) {
            if (cache.isAvailable()) await cache.set(cacheKey, results, 300);
            return results;
          }
        }
      }
    }
    if (cache.isAvailable()) await cache.set(cacheKey, results, 300);
    return results;
  },
};
