// Sticker service — metadata + search theo tag.
// Dữ liệu thực tế sẽ seed vào DB (StickerPack + StickerItem) khi chạy seeder.

import StickerPack from "../models/StickerPack.js";
import { ApiError } from "../utils/ApiError.js";

export const stickerService = {
  async listPacks() {
    return StickerPack.find().select("-stickers").sort({ order: 1 });
  },

  async getPack(key) {
    const pack = await StickerPack.findOne({ key });
    if (!pack) throw new ApiError(404, "Không tìm thấy bộ sticker");
    return pack;
  },

  async searchStickers(q, { limit = 20 } = {}) {
    if (!q || q.trim().length < 1) return [];
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
          if (results.length >= limit) return results;
        }
      }
    }
    return results;
  },
};
