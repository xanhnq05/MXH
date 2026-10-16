// Hook gợi ý GIF theo text đang nhập. Debounce 300ms, query API /api/gifs/search.

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { useDebounce } from "./useDebounce";

export interface GifSuggestion {
  id: string;
  url: string;
  category: string;
  categoryName: string;
  icon: string;
  tags: string[];
}

export const useGifSuggest = (text: string) => {
  const debounced = useDebounce(text, 300);
  const [suggestions, setSuggestions] = useState<GifSuggestion[]>([]);
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
        if (!cancelled) setSuggestions(res.data.gifs || []);
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
