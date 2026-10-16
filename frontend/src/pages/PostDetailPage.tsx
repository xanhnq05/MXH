// PostDetailPage - Hiển thị 1 bài viết, có comment đầy đủ + nút chia sẻ.
// Chia sẻ: copy link + mở modal chọn bạn bè để gửi qua tin nhắn.
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router";
import {
  Heart,
  MessageCircle,
  Globe2,
  Users,
  Lock,
  ArrowLeft,
  Loader2,
  Share2,
  Link as LinkIcon,
  Send,
  Copy,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postService, commentService } from "@/services/post.service";
import { userService } from "@/services/user.service";
import { friendshipService } from "@/services/other.service";
import { useLightbox } from "@/stores/useLightboxStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useChatStore } from "@/stores/useChatStore";
import { chatService } from "@/services/chat.service";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import type { Post } from "@/types/post";
import { CommentSection } from "@/components/post/CommentSection";

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
      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
        <Globe2 className="h-3.5 w-3.5" /> Công khai
      </span>
    );
  if (v === "friends")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
        <Users className="h-3.5 w-3.5" /> Bạn bè
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      <Lock className="h-3.5 w-3.5" /> Riêng tư
    </span>
  );
};

const PostDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: me } = useAuthStore();
  const { show: openLightbox } = useLightbox();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [toggling, setToggling] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [onlineNow, setOnlineNow] = useState<boolean | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    postService
      .getById(id)
      .then((p) => {
        setPost(p);
        setLiked(!!p.isLiked);
        setLikeCount(p.likeCount || 0);
        setCommentCount(p.commentCount || 0);
      })
      .catch((e) => {
        toast.error(e?.response?.data?.message || "Không tải được bài viết");
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Lấy trạng thái online của author (nếu không phải mình)
  useEffect(() => {
    if (!post || !me) return;
    const authorId =
      typeof post.author === "object" && post.author ? post.author._id : "";
    if (!authorId || authorId === me._id) {
      setOnlineNow(null);
      return;
    }
    userService
      .getPresence(authorId)
      .then((r) => setOnlineNow(r.isOnline))
      .catch(() => setOnlineNow(null));
  }, [post, me]);

  // Realtime: nếu socket có broadcast post:comment, update count
  // (đơn giản chỉ lắng nghe từ useChatStore... ở đây bỏ qua, count do server trả)

  // Scroll tới comment khi có state highlightComment (từ notification)
  useEffect(() => {
    if (!post) return;
    const state = location.state as any;
    if (state?.highlightComment) {
      setTimeout(() => {
        const el = document.getElementById("comments");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 300);
    }
  }, [post, location.state]);

  const handleLike = async () => {
    if (!post || toggling) return;
    setToggling(true);
    setLiked((v) => !v);
    setLikeCount((c) => c + (liked ? -1 : 1));
    try {
      if (liked) {
        const r = await postService.unlike(post._id);
        setLikeCount(r.likeCount);
      } else {
        const r = await postService.like(post._id);
        setLikeCount(r.likeCount);
      }
    } catch (e: any) {
      setLiked((v) => !v);
      setLikeCount((c) => c + (liked ? 1 : -1));
      toast.error(e?.response?.data?.message || "Lỗi");
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-4">
        <p className="text-slate-700 font-semibold">Bài viết không tồn tại</p>
        <Button
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Quay lại
        </Button>
      </div>
    );
  }

  const author =
    typeof post.author === "object" && post.author
      ? post.author
      : { _id: "", displayName: "Người dùng", username: "", avatarUrl: "" };
  const isMe = me?._id && author._id === me._id;

  const postUrl = `${window.location.origin}/post/${post._id}`;

  return (
    <div className="h-full overflow-y-auto bg-orange-50/30">
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-orange-600 mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </button>

        <div className="bg-white rounded-2xl border border-orange-100 p-4 sm:p-6 shadow-sm">
          {/* Author */}
          <div className="flex items-start gap-3">
            <Link to={`/profile/${author._id}`}>
              <Avatar className="h-12 w-12 ring-2 ring-orange-100">
                <AvatarImage src={author.avatarUrl} alt={author.displayName} />
                <AvatarFallback className="bg-greenx-gradient text-white font-semibold">
                  {getInitials(author.displayName)}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <Link
                to={`/profile/${author._id}`}
                className="font-semibold text-slate-900 hover:text-orange-600"
              >
                {author.displayName || author.username}
              </Link>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                <span>
                  {formatDistanceToNow(new Date(post.createdAt), {
                    addSuffix: true,
                    locale: vi,
                  })}
                </span>
                <span className="text-slate-300">·</span>
                <VisibilityBadge v={post.visibility} />
                {onlineNow === true && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="inline-flex items-center gap-1 text-green-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Đang hoạt động
                    </span>
                  </>
                )}
              </div>
            </div>
            {isMe && (
              <Link
                to={`/profile/${author._id}`}
                className="text-xs text-orange-600 hover:underline"
              >
                Sửa/xoá
              </Link>
            )}
          </div>

          {/* Content */}
          {post.content && (
            <p className="mt-4 text-slate-800 whitespace-pre-wrap leading-relaxed">
              {post.content}
            </p>
          )}

          {/* Media */}
          {post.media && post.media.length > 0 && (
            <div
              className={
                post.media.length === 1
                  ? "mt-4"
                  : "mt-4 grid grid-cols-2 gap-2 rounded-xl overflow-hidden"
              }
            >
              {post.media.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() =>
                    openLightbox(
                      post.media.map((x) => x.url),
                      i
                    )
                  }
                  className="block w-full bg-slate-100 cursor-zoom-in"
                >
                  {m.type === "video" ? (
                    <video
                      src={m.url}
                      controls
                      className="w-full max-h-[480px] object-cover"
                    />
                  ) : (
                    <img
                      src={m.url}
                      alt=""
                      className="w-full max-h-[480px] object-cover hover:opacity-95 transition"
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {post.tags.map((t) => (
                <Link
                  key={t}
                  to={`/search?q=${encodeURIComponent("#" + t)}`}
                  className="inline-flex items-center gap-1 text-xs text-orange-600 bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded-md"
                >
                  #{t}
                </Link>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-5 text-sm text-slate-600">
            <button
              onClick={handleLike}
              disabled={toggling}
              className="inline-flex items-center gap-1.5 hover:text-orange-600 transition-colors"
            >
              <Heart
                className={
                  liked
                    ? "h-5 w-5 fill-red-500 text-red-500"
                    : "h-5 w-5"
                }
              />
              <span className="font-medium">{likeCount}</span>
            </button>
            <div
              className="inline-flex items-center gap-1.5 hover:text-orange-600"
              onClick={() => {
                document
                  .getElementById("comments")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <MessageCircle className="h-5 w-5" />
              <span className="font-medium">{commentCount}</span>
            </div>
            <button
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-1.5 hover:text-orange-600 transition-colors ml-auto"
            >
              <Share2 className="h-5 w-5" />
              <span className="font-medium">Chia sẻ</span>
            </button>
          </div>

          <CommentSection postId={post._id} onCountChange={setCommentCount} />
        </div>
      </div>

      {/* Share modal */}
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        postUrl={postUrl}
        postId={post._id}
        postContent={post.content}
        onCopied={() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        copied={copied}
      />
    </div>
  );
};

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  postUrl: string;
  postId: string;
  postContent?: string;
  onCopied: () => void;
  copied: boolean;
}

const ShareDialog = ({
  open,
  onOpenChange,
  postUrl,
  postId,
  postContent,
  onCopied,
  copied,
}: ShareDialogProps) => {
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user: me } = useAuthStore();
  const fetchConversations = useChatStore((s) => s.fetchConversations);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    friendshipService
      .list()
      .then((arr) => {
        const norm = (arr || []).map((it: any) => it.friend || it);
        setFriends(norm);
      })
      .catch(() => setFriends([]))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = friends.filter((f) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      f.displayName?.toLowerCase().includes(q) ||
      f.username?.toLowerCase().includes(q)
    );
  });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      onCopied();
      toast.success("Đã sao chép liên kết");
    } catch {
      toast.error("Không thể sao chép");
    }
  };

  const sendToFriend = async (friendId: string) => {
    if (sending) return;
    setSending(friendId);
    try {
      // 1) Tạo/lấy conversation direct
      const conv = await chatService.getOrCreateDirect(friendId);
      // 2) Gửi message share_post
      const summary = postContent
        ? postContent.slice(0, 80) + (postContent.length > 80 ? "..." : "")
        : "Bài viết";
      await chatService.sendMessage(conv._id, {
        type: "share_post",
        content: `📎 ${summary}`,
        postId,
        postUrl,
      });
      toast.success("Đã chia sẻ qua tin nhắn");
      await fetchConversations();
      onOpenChange(false);
      // Mở cuộc trò chuyện
      navigate(`/chat/${conv._id}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Chia sẻ thất bại");
    } finally {
      setSending(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">Chia sẻ bài viết</DialogTitle>
          <DialogDescription>
            Gửi qua tin nhắn cho bạn bè hoặc sao chép liên kết.
          </DialogDescription>
        </DialogHeader>

        {/* Copy link */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 min-w-0 flex items-center gap-2 px-2.5 py-1.5 bg-orange-50 border border-orange-100 rounded-md">
            <LinkIcon className="h-3.5 w-3.5 text-orange-500 shrink-0" />
            <span className="text-xs text-slate-600 truncate flex-1">
              {postUrl}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={copyLink}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 mr-1" />
            ) : (
              <Copy className="h-3.5 w-3.5 mr-1" />
            )}
            Sao chép
          </Button>
        </div>

        {/* Friend list */}
        <div className="mt-3 flex-1 min-h-0 flex flex-col">
          <Input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Tìm bạn bè..."
            className="text-sm"
          />
          <div className="mt-2 flex-1 overflow-y-auto min-h-0 max-h-72 border border-orange-100 rounded-lg divide-y">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-slate-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Đang tải...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                {search ? "Không tìm thấy" : "Chưa có bạn bè để chia sẻ"}
              </div>
            ) : (
              filtered.map((f) => {
                const fid = f._id;
                const meBlocked =
                  f.isBlockedByMe || f.amIBlockedByThem;
                return (
                  <button
                    key={fid}
                    type="button"
                    onClick={() => !meBlocked && sendToFriend(fid)}
                    disabled={!!meBlocked || sending === fid}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent/40 text-left disabled:opacity-50"
                  >
                    <Avatar className="h-9 w-9 ring-1 ring-orange-100 shrink-0">
                      <AvatarImage src={f.avatarUrl} alt={f.displayName} />
                      <AvatarFallback className="bg-greenx-gradient text-white text-xs font-semibold">
                        {getInitials(f.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {f.displayName || f.username}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {meBlocked
                          ? "Bạn đã chặn người này"
                          : f.isOnline
                            ? "Đang hoạt động"
                            : `@${f.username || ""}`}
                      </p>
                    </div>
                    {sending === fid ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : (
                      <Send className="h-4 w-4 text-orange-500" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PostDetailPage;
