// routes cho media/sticker/gif (production): tất cả trỏ về mediaService.
// Legacy `trending.json` Giphy URL chỉ trả về kèm flag `isLegacy: true` để frontend
// biết mà không hiển thị trong suggestion production.

import { Router } from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { protectedRoute } from "../middlewares/auth.middleware.js";
import { mediaService } from "../services/media.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRENDING_PATH = path.join(
  __dirname,
  "..",
  "stickers",
  "gif",
  "trending.json"
);

let cached = null;
const getTrendingLegacy = () => {
  if (!cached) {
    try {
      cached = JSON.parse(readFileSync(TRENDING_PATH, "utf-8"));
    } catch {
      cached = { categories: [] };
    }
  }
  return cached;
};

const router = Router();
router.use(protectedRoute);

// ===== Media search (production): dùng MediaAsset =====
router.get("/search", async (req, res, next) => {
  try {
    const q = (req.query.q || "").toString();
    const mediaType = req.query.mediaType;
    const items = await mediaService.search(q, { mediaType, limit: 24 });
    // Trả về cả `items` (mới) và `gifs` (tương thích ngược với FE cũ)
    res.json({ items, gifs: items });
  } catch (e) {
    next(e);
  }
});

// ===== Sticker packs (giữ tương thích) =====
router.get("/packs", async (req, res, next) => {
  try {
    res.json({ packs: await mediaService.listPacks() });
  } catch (e) {
    next(e);
  }
});

// ===== Legacy trending.json (đánh dấu isLegacy) =====
router.get("/trending", (req, res) => {
  const data = getTrendingLegacy();
  // Trả về kèm isLegacy để client biết không dùng trong suggestion production
  res.json({ ...data, isLegacy: true });
});

// ===== Legacy search (JSON) — fallback =====
router.get("/search-legacy", (req, res) => {
  const q = (req.query.q || "").toLowerCase().trim();
  if (!q) return res.json({ gifs: [] });
  const { categories } = getTrendingLegacy();
  const results = [];
  for (const cat of categories) {
    for (const gif of cat.gifs) {
      if (gif.tags.some((t) => t.toLowerCase().includes(q))) {
        results.push({
          ...gif,
          category: cat.key,
          categoryName: cat.name,
          icon: cat.icon,
          isLegacy: true,
        });
      }
    }
  }
  res.json({ gifs: results });
});

export default router;
