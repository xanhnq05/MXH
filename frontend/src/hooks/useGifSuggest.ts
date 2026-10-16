// Hook gợi ý Sticker + GIF theo text đang nhập. Debounce 300ms.
// Lấy kết quả từ MediaAsset (asset active, đã upload local) + StickerPack.
// Bỏ qua asset legacy (Giphy/Tenor external URL).
// Hỗ trợ gợi ý cả sticker lẫn gif trong cùng 1 danh sách,
// rank theo relevance (exact name > starts with > includes > tag).

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/axios";
import { useDebounce } from "./useDebounce";

export interface MediaSuggestion {
  _id: string;
  mediaType: "sticker" | "gif";
  name: string;
  url: string;
  storageKey?: string;
  thumbnailUrl?: string;
  tags: string[];
  category?: string;
  isLegacy?: boolean;
  packKey?: string;
  packName?: string;
}

const isLegacyAsset = (item: any): boolean => {
  if (typeof item?.isLegacy === "boolean") return !!item.isLegacy;
  const url: string = item?.url || "";
  return /giphy\.com|tenor\.com|gstatic\.com/.test(url);
};

// Normalize tiếng Việt - bỏ dấu, lowercase
const normalize = (s: string) =>
  (s || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

// Tính điểm relevance - ưu tiên exact name match
const scoreMatch = (item: any, q: string, qNorm: string): number => {
  let score = 0;
  const name = (item.name || "").toLowerCase().trim();
  const nameNorm = normalize(item.name);
  if (name === q) return 1000;
  if (nameNorm === qNorm) return 950;
  if (name.startsWith(q)) return 500;
  if (nameNorm.startsWith(qNorm)) return 480;
  if (name.includes(q)) return 300;
  if (nameNorm.includes(qNorm)) return 280;
  for (const t of item.tags || []) {
    const tn = (t || "").toLowerCase();
    if (tn === q) return 400;
    if (normalize(t) === qNorm) return 380;
    if (tn.includes(q)) return 200;
  }
  for (const k of item.keywords || []) {
    if ((k || "").toLowerCase().includes(q)) return 150;
  }
  for (const p of item.phrases || []) {
    if (normalize(p).includes(qNorm)) return 250;
  }
  return 0;
};

export const useMediaSuggest = (text: string) => {
  const debounced = useDebounce(text, 300);
  const [suggestions, setSuggestions] = useState<MediaSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = debounced.trim();
    if (q.length < 1) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    let cancelled = false;
    // Gọi song song 2 endpoint - lấy cả sticker + gif
    Promise.all([
      api
        .get(`/gifs/search?q=${encodeURIComponent(q)}&limit=20`)
        .then((r) => r.data.items || r.data.gifs || [])
        .catch(() => []),
      api
        .get(`/stickers/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.data.stickers || [])
        .catch(() => []),
    ])
      .then(([gifs, stickers]) => {
        if (cancelled) return;
        const all = [...(gifs || []), ...(stickers || [])];
        const seen = new Set<string>();
        const merged: MediaSuggestion[] = [];
        for (const a of all) {
          if (isLegacyAsset(a)) continue;
          const url = a.url || a.stickerUrl;
          if (!url || seen.has(url)) continue;
          seen.add(url);
          merged.push({
            _id: a._id || a.id || url,
            mediaType: a.mediaType || (a.tags ? "gif" : "sticker"),
            name: a.name || a.tags?.[0] || "Media",
            url,
            storageKey: a.storageKey,
            thumbnailUrl: a.thumbnailUrl,
            tags: a.tags || [],
            category: a.category,
            isLegacy: false,
            packKey: a.packKey,
            packName: a.packName,
          });
        }
        // Rank theo relevance (cao -> thấp)
        const qNorm = normalize(q);
        merged.sort((x, y) => scoreMatch(y, q, qNorm) - scoreMatch(x, q, qNorm));
        setSuggestions(merged.slice(0, 16));
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  // Xóa tất cả suggestions ngay lập tức (dùng khi user gửi)
  const clear = useCallback(() => {
    setSuggestions([]);
    setLoading(false);
  }, []);

  return { suggestions, loading, clear };
};

// Backward compat - alias cho useGifSuggest cũ
export const useGifSuggest = (text: string) => {
  const { suggestions, loading, clear } = useMediaSuggest(text);
  return {
    suggestions: suggestions.map((s) => ({
      id: s._id,
      url: s.url,
      category: s.category || "",
      categoryName: s.category || "",
      icon: "",
      tags: s.tags,
      mediaType: s.mediaType,
      name: s.name,
    })),
    loading,
    clear,
  };
};
