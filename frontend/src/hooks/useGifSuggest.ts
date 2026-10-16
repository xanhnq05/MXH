// Hook gợi ý GIF/Sticker theo text đang nhập. Debounce 300ms, query /api/gifs/search.
// Lấy kết quả từ MediaAsset (asset active, đã upload local). Bỏ qua asset legacy nếu server
// đánh dấu isLegacy.

import { useEffect, useState } from "react";
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
}

const isLegacyAsset = (item: any): boolean => {
  if (typeof item?.isLegacy === "boolean") return item.isLegacy;
  // Detect Giphy external URL
  const url: string = item?.url || "";
  return /giphy\.com|tenor\.com|gstatic\.com/.test(url);
};

export const useMediaSuggest = (text: string) => {
  const debounced = useDebounce(text, 300);
  const [suggestions, setSuggestions] = useState<MediaSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = debounced.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    let cancelled = false;
    api
      .get(`/gifs/search?q=${encodeURIComponent(q)}`)
      .then((res) => {
        if (cancelled) return;
        // Response có thể trả `items` (mới) hoặc `gifs` (cũ)
        const raw: any[] = res.data.items || res.data.gifs || [];
        // Lọc legacy asset (Giphy URL) — không hiển thị trong suggestion production
        const filtered = raw
          .filter((a) => !isLegacyAsset(a))
          .map((a) => ({
            _id: a._id || a.id,
            mediaType: a.mediaType || (a.tags ? "gif" : "sticker"),
            name: a.name || a.tags?.[0] || "GIF",
            url: a.url || a.stickerUrl,
            storageKey: a.storageKey,
            thumbnailUrl: a.thumbnailUrl,
            tags: a.tags || [],
            category: a.category,
            isLegacy: false,
          }));
        setSuggestions(filtered);
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

  return { suggestions, loading };
};

// Backward compat — alias cho useGifSuggest cũ
export const useGifSuggest = (text: string) => {
  const { suggestions, loading } = useMediaSuggest(text);
  return {
    suggestions: suggestions.map((s) => ({
      id: s._id,
      url: s.url,
      category: s.category || "",
      categoryName: s.category || "",
      icon: "",
      tags: s.tags,
    })),
    loading,
  };
};
