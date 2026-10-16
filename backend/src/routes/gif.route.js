// routes cho GIF trending — đọc file JSON tĩnh.
import { Router } from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { protectedRoute } from "../middlewares/auth.middleware.js";

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
const getTrending = () => {
  if (!cached) {
    cached = JSON.parse(readFileSync(TRENDING_PATH, "utf-8"));
  }
  return cached;
};

const router = Router();
router.use(protectedRoute);

router.get("/trending", (req, res) => {
  res.json(getTrending());
});

/**
 * GET /api/gifs/search?q=...
 * Tìm GIF theo từ khoá. Đơn giản: quét tất cả categories, so khớp tag.
 */
router.get("/search", (req, res) => {
  const q = (req.query.q || "").toLowerCase().trim();
  if (!q) return res.json({ gifs: [] });
  const { categories } = getTrending();
  const results = [];
  for (const cat of categories) {
    for (const gif of cat.gifs) {
      if (gif.tags.some((t) => t.toLowerCase().includes(q))) {
        results.push({
          ...gif,
          category: cat.key,
          categoryName: cat.name,
          icon: cat.icon,
        });
      }
    }
  }
  res.json({ gifs: results });
});

export default router;
