// SearchPage - Tìm kiếm bài viết (ưu tiên mức độ liên quan)
// - Gõ ký tự: match content / tag
// - Gõ "#tag": chỉ filter theo hashtag
// - Ưu tiên: bạn bè > match exact > match substring
// - Tôn trọng visibility: public, friends (chỉ bạn), private (chỉ chính chủ)
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  Search as SearchIcon,
  X,
  Hash,
  FileText,
  Loader2,
  Globe2,
  Users,
  Lock,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { postService } from "@/services/post.service";
import { useDebounce } from "@/hooks/useDebounce";
import type { Post } from "@/types/post";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useAuthStore } from "@/stores/useAuthStore";

const getInitials = (name?: string) =>
  (name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const VisibilityBadge = ({ v }: { v: "public" | "friends" | "private" }) => {
  if (v === "public")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
        <Globe2 className="h-3 w-3" /> Công khai
      </span>
    );
  if (v === "friends")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
        <Users className="h-3 w-3" /> Bạn bè
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
      <Lock className="h-3 w-3" /> Riêng tư
    </span>
  );
};

const SearchPage = () => {
  const [params, setParams] = useSearchParams();
  const initialQ = params.get("q") || "";
  const [q, setQ] = useState(initialQ);
  const debounced = useDebounce(q, 300);
  const [results, setResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { user: me } = useAuthStore();

  // Sync URL <-> input
  useEffect(() => {
    const urlQ = params.get("q") || "";
    if (urlQ !== q) setQ(urlQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()]);

  useEffect(() => {
    const urlQ = params.get("q") || "";
    if (urlQ !== debounced) {
      const next = new URLSearchParams(params);
      if (debounced) next.set("q", debounced);
      else next.delete("q");
      setParams(next, { replace: true });
    }
    if (!debounced || debounced.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setSearched(true);
    postService
      .search(debounced)
      .then((data) => {
        if (cancelled) return;
        setResults(Array.isArray(data?.items) ? data.items : []);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const isHashtag = debounced.trim().startsWith("#");
  const tagOnly = isHashtag ? debounced.trim().slice(1).toLowerCase() : "";

  // Stats để gợi ý tab
  const { tagCount, contentCount } = useMemo(() => {
    let tag = 0;
    let content = 0;
    results.forEach((p) => {
      const lc = (p.content || "").toLowerCase();
      const haystack = lc + " " + (p.tags || []).join(" ").toLowerCase();
      if (isHashtag) {
        if ((p.tags || []).some((t) => t.toLowerCase() === tagOnly)) tag++;
        else tag++;
      } else {
        if ((p.tags || []).some((t) => t.toLowerCase().includes(debounced.toLowerCase()))) tag++;
        if (lc.includes(debounced.toLowerCase())) content++;
      }
      // tránh cảnh báo unused
      void haystack;
    });
    return { tagCount: tag, contentCount: content };
  }, [results, debounced, isHashtag, tagOnly]);

  return (
    <div className="h-full overflow-y-auto bg-orange-50/30 dark:bg-slate-950">
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Tìm kiếm bài viết</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Tìm theo nội dung hoặc hashtag. Gõ <span className="font-mono">#tag</span> để chỉ tìm theo hashtag.
        </p>

        {/* Search bar */}
        <div className="relative mt-5 mb-4">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm bài viết... (vd: du lịch hoặc #travel)"
            className={cn(
              "w-full pl-10 pr-10 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-orange-200 dark:border-slate-700 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/30 outline-none",
              "border-orange-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition"
            )}
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 dark:text-slate-500 hover:bg-orange-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter tag badge */}
        {isHashtag && (
          <div className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">
            <Hash className="h-3 w-3" />
            Đang lọc theo hashtag: {tagOnly}
          </div>
        )}

        {/* Results */}
        <div className="space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-orange-500" />
            </div>
          )}

          {!loading && !searched && (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-orange-100 dark:border-slate-800">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-50 dark:bg-orange-500/20 flex items-center justify-center text-orange-400 mb-3">
                <SearchIcon className="h-8 w-8" />
              </div>
              <p className="font-semibold text-slate-700">Tìm bài viết</p>
              <p className="text-sm text-slate-500 mt-1">
                Nhập ít nhất 2 ký tự để bắt đầu
              </p>
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-orange-100 dark:border-slate-800">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-50 dark:bg-orange-500/20 flex items-center justify-center text-orange-400 mb-3">
                <FileText className="h-8 w-8" />
              </div>
              <p className="font-semibold text-slate-700">
                Không tìm thấy bài viết
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Thử từ khoá khác hoặc hashtag khác
              </p>
            </div>
          )}

          {/* Stats summary */}
          {!loading && results.length > 0 && (
            <div className="text-xs text-slate-500 px-1">
              {results.length} kết quả
              {!isHashtag && contentCount > 0 && tagCount > 0 && (
                <span> · {contentCount} theo nội dung · {tagCount} theo hashtag</span>
              )}
            </div>
          )}

          {results.map((p) => {
            const author =
              typeof p.author === "object" && p.author
                ? p.author
                : { _id: "", displayName: "Người dùng", username: "", avatarUrl: "" };
            const isMe = me?._id && author._id === me._id;
            return (
              <Link
                key={p._id}
                to={`/post/${p._id}`}
                className="block bg-white dark:bg-slate-900 rounded-2xl border border-orange-100 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-500/50 hover:shadow-sm transition-all p-3 sm:p-4"
              >
                <div className="flex items-start gap-3">
                  <Link
                    to={`/profile/${author._id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0"
                  >
                    <Avatar className="h-11 w-11 ring-2 ring-orange-100">
                      <AvatarImage src={author.avatarUrl} alt={author.displayName} />
                      <AvatarFallback className="bg-greenx-gradient text-white text-sm font-semibold">
                        {getInitials(author.displayName)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 truncate">
                        {author.displayName || author.username}
                      </p>
                      {isMe && (
                        <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">
                          Bạn
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        · {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true, locale: vi })}
                      </span>
                      <span className="text-slate-300">·</span>
                      <VisibilityBadge v={p.visibility} />
                    </div>
                    {p.content && (
                      <p className="text-sm text-slate-700 mt-1.5 line-clamp-3 whitespace-pre-wrap">
                        {highlightText(p.content, debounced.replace(/^#/, ""))}
                      </p>
                    )}
                    {p.tags && p.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {p.tags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 text-[11px] text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/20 px-1.5 py-0.5 rounded-md"
                          >
                            <Hash className="h-2.5 w-2.5" />
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {p.media && p.media.length > 0 && (
                      <div className="mt-2 text-[11px] text-slate-400">
                        📷 {p.media.length} ảnh/video
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Highlight keyword match trong text (không phân biệt hoa thường)
const highlightText = (text: string, keyword: string) => {
  if (!keyword) return text;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));
  return parts.map((p, i) =>
    p.toLowerCase() === keyword.toLowerCase() ? (
      <mark
        key={i}
        className="bg-orange-100 text-orange-700 px-0.5 rounded"
      >
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    )
  );
};

export default SearchPage;
