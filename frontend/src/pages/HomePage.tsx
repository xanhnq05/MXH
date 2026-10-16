// HomePage — Redesign với theme cam GreenX #FF6B35 + #FF9F43
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import {
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Send,
  Trash2,
  Globe2,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

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
      // Cache 60s trong sessionStorage de tranh goi lai nhieu lan
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

  const handlePost = async () => {
    if (!content && files.length === 0) return;
    try {
      setPosting(true);
      const post = await postService.create({ content, visibility: "public" }, files);
      setPosts((prev) => [post, ...prev]);
      setContent("");
      setFiles([]);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Đăng bài thất bại");
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string, liked: boolean) => {
    setPosts((prev) =>
      prev.map((p) =>
        p._id === postId
          ? { ...p, likeCount: p.likeCount + (liked ? -1 : 1) }
          : p
      )
    );
    try {
      if (liked) await postService.unlike(postId);
      else await postService.like(postId);
    } catch {
      // revert by reloading
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

  return (
    <div className="h-full overflow-y-auto bg-orange-50/30">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* ── Composer ── */}
        <Card className="border-orange-100 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback className="bg-greenx-gradient text-white text-sm font-semibold">
                  {getInitials(user?.displayName)}
                </AvatarFallback>
              </Avatar>
              <textarea
                placeholder="Bạn đang nghĩ gì?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={2}
                className={cn(
                  "flex-1 resize-none rounded-xl border bg-white px-3 py-2 text-sm text-slate-900",
                  "placeholder:text-slate-400 outline-none",
                  "border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-colors"
                )}
              />
            </div>

            {files.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="relative aspect-square bg-slate-100 rounded-xl overflow-hidden"
                  >
                    {f.type.startsWith("image") && (
                      <img
                        src={URL.createObjectURL(f)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                    <button
                      className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                      onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center">
              <label className="cursor-pointer text-sm text-slate-500 hover:text-orange-600 flex items-center gap-2 transition-colors">
                <ImageIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Thêm ảnh</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
              </label>
              <Button
                size="sm"
                onClick={handlePost}
                disabled={posting || (!content && files.length === 0)}
                className="bg-greenx-gradient hover:opacity-90 text-white"
              >
                {posting ? <Spinner className="mr-2 h-4 w-4" /> : <Send className="h-4 w-4 mr-1.5" />}
                Đăng
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Gợi ý kết bạn (user mới) ── */}
        {suggestions.length > 0 && (
          <Card className="border-orange-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
              <Sparkles className="h-4 w-4 text-orange-500" />
              <h3 className="text-sm font-semibold text-slate-700">
                Gợi ý kết bạn cho bạn
              </h3>
            </div>
            <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
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
                    <Avatar className="h-16 w-16 mx-auto ring-2 ring-orange-100 group-hover:ring-orange-300 transition">
                      <AvatarImage src={s.user.avatarUrl} />
                      <AvatarFallback className="bg-greenx-gradient text-white text-lg font-semibold">
                        {getInitials(s.user.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <p className="mt-1.5 text-xs font-semibold text-slate-800 truncate px-1 group-hover:text-orange-600">
                      {s.user.displayName}
                    </p>
                    <p className="text-xs text-slate-400 truncate px-1">
                      {s.reason.split(" ")[0]}
                    </p>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleAddFriend(s.user._id);
                      }}
                      className="mt-1 w-full text-xs bg-orange-50 text-orange-600 hover:bg-orange-100 py-1 rounded-lg font-medium transition-colors"
                    >
                      Kết bạn
                    </button>
                  </Link>
                ))
              )}
            </div>
          </Card>
        )}

        {/* ── Posts ── */}
        {posts.map((p) => {
          const author = typeof p.author === "object" ? p.author : null;
          return (
            <Card key={p._id} className="border-orange-100 shadow-sm">
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
                      className="font-semibold text-sm text-slate-900 hover:text-orange-600 block truncate"
                    >
                      {author?.displayName}
                    </Link>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
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
                  <button className="p-1.5 rounded-full hover:bg-orange-50 text-slate-400 hover:text-orange-600">
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                {p.content && (
                  <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {p.content}
                  </p>
                )}

                {/* Media */}
                {p.media.length > 0 && (
                  <div
                    className={cn(
                      "grid gap-1",
                      p.media.length === 1
                        ? "grid-cols-1"
                        : p.media.length === 2
                        ? "grid-cols-2"
                        : "grid-cols-2"
                    )}
                  >
                    {p.media.slice(0, 4).map((m, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => openLightbox(p.media.map((mm) => mm.url), i)}
                        className={cn(
                          "relative bg-slate-100 rounded-xl overflow-hidden cursor-pointer group",
                          p.media.length === 3 && i === 0 && "row-span-2",
                          p.media.length >= 4 && i === 3 && "relative"
                        )}
                      >
                        <img
                          src={m.url}
                          alt=""
                          className={cn(
                            "w-full object-cover transition-transform group-hover:scale-105",
                            p.media.length === 1 ? "max-h-96" : "h-40"
                          )}
                        />
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
                <div className="flex items-center gap-1 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleLike(p._id, false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors text-sm"
                  >
                    <Heart className="h-4 w-4" />
                    <span>{p.likeCount || ""}</span>
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-slate-500 hover:text-blue-500 hover:bg-blue-50 transition-colors text-sm">
                    <MessageCircle className="h-4 w-4" />
                    <span>{p.commentCount || ""}</span>
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-slate-500 hover:text-green-500 hover:bg-green-50 transition-colors text-sm ml-auto">
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
            <div className="h-8 w-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin mx-auto" />
          </div>
        )}
        {!loading && hasMore && (
          <Button
            variant="outline"
            className="w-full border-orange-200 text-orange-600 hover:bg-orange-50"
            onClick={() => loadFeed(cursor)}
          >
            Tải thêm
          </Button>
        )}
        {!loading && posts.length === 0 && (
          <div className="text-center py-16">
            <p className="font-semibold text-slate-700">Chưa có bài viết nào</p>
            <p className="text-sm text-slate-500 mt-1">
              Hãy là người đầu tiên đăng bài!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
