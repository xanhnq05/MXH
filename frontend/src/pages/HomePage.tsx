// HomePage — Redesign 2026
// - Click vào ô "Bạn đang nghĩ gì" mở CreatePostModal
// - Nút like đầy màu cam khi đã thích, ngăn double-click
// - Hiển thị tags
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Send,
  Globe2,
  MoreHorizontal,
  Sparkles,
  Hash,
  Loader2,
  Smile,
} from "lucide-react";
import CreatePostModal from "@/components/post/CreatePostModal";
import { LikersModal } from "@/components/post/LikersModal";
import { useAuthStore } from "@/stores/useAuthStore";
import { postService } from "@/services/post.service";
import { friendshipService } from "@/services/other.service";
import { useLightbox } from "@/stores/useLightboxStore";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router";
import type { Post } from "@/types/post";
import { cn } from "@/lib/utils";

const getInitials = (name?: string) =>
  (name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const HomePage = () => {
  const { user } = useAuthStore();
  const { show: openLightbox } = useLightbox();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  // Thu gọn / mở rộng gợi ý kết bạn (mặc định thu gọn trên mobile)
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Track posts đang like để ngăn double-click
  const [likingPosts, setLikingPosts] = useState<Set<string>>(new Set());
  // Modal xem ai đã thích
  const [likersFor, setLikersFor] = useState<{ postId: string; isAuthor: boolean } | null>(null);

  useEffect(() => {
    loadFeed();
    loadSuggestions();
  }, []);

  const loadFeed = async (next?: string) => {
    try {
      setLoading(true);
      const data = await postService.feed(next);
      setPosts((prev) => (next ? [...prev, ...data.items] : data.items));
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
    } catch (e) {
      toast.error("Không tải được bảng tin");
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    try {
      const cached = sessionStorage.getItem("sg_cache");
      if (cached) {
        const { ts, data } = JSON.parse(cached);
        if (Date.now() - ts < 60_000) {
          setSuggestions(data || []);
          return;
        }
      }
      setLoadingSuggestions(true);
      const sg = await friendshipService.suggestions(5);
      setSuggestions(sg || []);
      sessionStorage.setItem("sg_cache", JSON.stringify({ ts: Date.now(), data: sg }));
    } catch {
      // silent fail
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // === Like handler: optimistic update + chống double-click + idempotent ===
  const handleLike = async (postId: string) => {
    if (likingPosts.has(postId)) return; // đang xử lý → bỏ qua
    const post = posts.find((p) => p._id === postId);
    if (!post) return;

    const wasLiked = post.isLiked;
    setLikingPosts((prev) => new Set(prev).add(postId));

    // Optimistic update UI
    setPosts((prev) =>
      prev.map((p) =>
        p._id === postId
          ? {
              ...p,
              isLiked: !wasLiked,
              likeCount: p.likeCount + (wasLiked ? -1 : 1),
            }
          : p
      )
    );

    try {
      const res = wasLiked
        ? await postService.unlike(postId)
        : await postService.like(postId);
      // Cập nhật lại từ server (idempotent guarantee)
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? { ...p, isLiked: !!res.isLiked, likeCount: res.likeCount }
            : p
        )
      );
    } catch (e: any) {
      // Rollback nếu lỗi
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? { ...p, isLiked: wasLiked, likeCount: p.likeCount + (wasLiked ? 1 : -1) }
            : p
        )
      );
      toast.error(e?.response?.data?.message || "Không thể thực hiện");
    } finally {
      setLikingPosts((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  const handleAddFriend = async (userId: string) => {
    try {
      await friendshipService.sendRequest(userId);
      setSuggestions((prev) => prev.filter((s) => s.user._id !== userId));
      toast.success("Đã gửi lời mời kết bạn");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Lỗi");
    }
  };

  const handlePostCreated = (post: Post) => {
    setPosts((prev) => [post, ...prev]);
  };

  return (
    <div className="h-full overflow-y-auto bg-orange-50/30 dark:bg-slate-950">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* ── Composer (chỉ là trigger mở modal) ── */}
        <Card
          className="border-orange-100 dark:border-slate-800 shadow-sm cursor-pointer hover:shadow-md transition-shadow bg-white dark:bg-slate-900"
          onClick={() => setCreateOpen(true)}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback className="bg-greenx-gradient text-white text-sm font-semibold">
                {getInitials(user?.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400">
              Bạn đang nghĩ gì?
            </div>
            <button
              className="p-2 rounded-full hover:bg-orange-50 dark:hover:bg-slate-800 text-orange-500"
              onClick={(e) => {
                e.stopPropagation();
                setCreateOpen(true);
              }}
              aria-label="Thêm ảnh"
            >
              <ImageIcon className="h-5 w-5" />
            </button>
          </CardContent>
        </Card>

        {/* ── Gợi ý kết bạn (thu gọn mặc định) ── */}
        {suggestions.length > 0 && (
          <Card className="border-orange-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setShowSuggestions((s) => !s)}
              className="w-full flex items-center justify-between px-4 pt-3 pb-1 hover:bg-orange-50/40 dark:hover:bg-slate-800/40 transition-colors"
              aria-expanded={showSuggestions}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-orange-500" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-white">
                  Gợi ý kết bạn cho bạn
                </h3>
                <span className="text-[10px] bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-full font-medium">
                  {suggestions.length}
                </span>
              </div>
              <span
                className={cn(
                  "text-slate-400 dark:text-slate-500 transition-transform text-xs",
                  showSuggestions && "rotate-180"
                )}
              >
                ▾
              </span>
            </button>
            {showSuggestions && (
              <div className="flex gap-2 px-4 pb-3 pt-2 overflow-x-auto">
                {loadingSuggestions ? (
                  <div className="h-20 flex items-center justify-center w-full">
                    <div className="h-6 w-6 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
                  </div>
                ) : (
                  suggestions.map((s) => (
                    <Link
                      key={s.user._id}
                      to={`/profile/${s.user._id}`}
                      className="flex-shrink-0 w-28 text-center group"
                    >
                      <Avatar className="h-16 w-16 mx-auto ring-2 ring-orange-100 dark:ring-slate-700 group-hover:ring-orange-300 dark:group-hover:ring-orange-500 transition">
                        <AvatarImage src={s.user.avatarUrl} />
                        <AvatarFallback className="bg-greenx-gradient text-white text-lg font-semibold">
                          {getInitials(s.user.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="mt-1.5 text-xs font-semibold text-slate-800 dark:text-white truncate px-1 group-hover:text-orange-600">
                        {s.user.displayName}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate px-1">
                        {s.reason.split(" ")[0]}
                      </p>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleAddFriend(s.user._id);
                        }}
                        className="mt-1 w-full text-xs bg-orange-50 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/30 py-1 rounded-lg font-medium transition-colors"
                      >
                        Kết bạn
                      </button>
                    </Link>
                  ))
                )}
              </div>
            )}
          </Card>
        )}

        {/* ── Posts ── */}
        {posts.map((p) => {
          const author = typeof p.author === "object" ? p.author : null;
          const isLiking = likingPosts.has(p._id);
          return (
            <Card key={p._id} className="border-orange-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <Link to={`/profile/${author?._id}`}>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={author?.avatarUrl} />
                      <AvatarFallback className="bg-greenx-gradient text-white text-sm font-semibold">
                        {getInitials(author?.displayName)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/profile/${author?._id}`}
                      className="font-semibold text-sm text-slate-900 dark:text-white hover:text-orange-600 block truncate"
                    >
                      {author?.displayName}
                    </Link>
                    <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      @{author?.username}
                      <span>·</span>
                      <Globe2 className="h-3 w-3" />
                      <span className="text-xs">
                        {formatDistanceToNow(new Date(p.createdAt), {
                          addSuffix: true,
                          locale: vi,
                        })}
                      </span>
                    </p>
                  </div>
                  <button className="p-1.5 rounded-full hover:bg-orange-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-orange-600">
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                {p.content && (
                  <p className="text-sm text-slate-800 dark:text-white whitespace-pre-wrap leading-relaxed">
                    {p.content}
                  </p>
                )}

                {/* Tags */}
                {p.tags && p.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {p.tags.map((t) => (
                      <button
                        key={t}
                        onClick={() => navigate(`/search?tag=${encodeURIComponent(t)}`)}
                        className="inline-flex items-center gap-0.5 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/15 hover:bg-orange-100 dark:hover:bg-orange-500/25 px-2 py-0.5 rounded-full transition"
                      >
                        <Hash className="h-3 w-3" />
                        {t}
                      </button>
                    ))}
                  </div>
                )}

                {/* Media */}
                {p.media.length > 0 && (
                  <div
                    className={cn(
                      "grid gap-1",
                      p.media.length === 1
                        ? "grid-cols-1"
                        : "grid-cols-2"
                    )}
                  >
                    {p.media.slice(0, 4).map((m, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => openLightbox(p.media.map((mm) => mm.url), i)}
                        className={cn(
                          "relative bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden cursor-zoom-in group block",
                          p.media.length === 3 && i === 0 && "row-span-2"
                        )}
                      >
                        {p.media.length === 1 ? (
                          <img
                            src={m.url}
                            alt=""
                            className="w-full max-h-[500px] object-contain bg-slate-900/5 dark:bg-slate-800/30 transition-transform group-hover:scale-[1.02]"
                            loading="lazy"
                          />
                        ) : (
                          <div className="aspect-square w-full">
                            <img
                              src={m.url}
                              alt=""
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              loading="lazy"
                            />
                          </div>
                        )}
                        {p.media.length > 4 && i === 3 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-2xl">
                            +{p.media.length - 4}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {/* Like button — toggle like, không mở modal */}
                  <button
                    onClick={() => handleLike(p._id)}
                    disabled={isLiking}
                    aria-pressed={p.isLiked}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm transition-all",
                      p.isLiked
                        ? "text-orange-500 bg-orange-50 dark:bg-orange-500/20 hover:bg-orange-100 dark:hover:bg-orange-500/30"
                        : "text-slate-500 dark:text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-slate-800",
                      isLiking && "opacity-60 cursor-wait"
                    )}
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4 transition-all",
                        p.isLiked && "fill-orange-500 text-orange-500 scale-110"
                      )}
                    />
                  </button>
                  {p.likeCount > 0 && (
                    <button
                      onClick={() =>
                        setLikersFor({
                          postId: p._id,
                          isAuthor: author?._id === user?._id,
                        })
                      }
                      className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-orange-600 hover:underline px-1.5 py-1 rounded-md"
                    >
                      {p.likeCount} lượt thích
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/posts/${p._id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors text-sm ml-auto"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>{p.commentCount || ""}</span>
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-slate-800 transition-colors text-sm">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Load more */}
        {loading && (
          <div className="text-center py-6">
            <div className="h-8 w-8 rounded-full border-2 border-orange-200 dark:border-slate-700 border-t-orange-500 animate-spin mx-auto" />
          </div>
        )}
        {!loading && hasMore && (
          <Button
            variant="outline"
            className="w-full border-orange-200 dark:border-slate-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-slate-800"
            onClick={() => loadFeed(cursor)}
          >
            Tải thêm
          </Button>
        )}
        {!loading && posts.length === 0 && (
          <div className="text-center py-16">
            <p className="font-semibold text-slate-700 dark:text-white">Chưa có bài viết nào</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Hãy là người đầu tiên đăng bài!
            </p>
          </div>
        )}
      </div>

      {/* Modal tạo bài viết */}
      <CreatePostModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handlePostCreated}
      />

      {/* Modal xem ai đã thích */}
      <LikersModal
        open={!!likersFor}
        onOpenChange={(o) => !o && setLikersFor(null)}
        postId={likersFor?.postId || null}
      />
    </div>
  );
};

export default HomePage;
