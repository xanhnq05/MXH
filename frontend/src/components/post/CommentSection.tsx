// CommentSection — bình luận cho PostDetailPage.
// - Composer: text max 500 ký tự + nút mở StickerPicker / GifPicker.
// - Mỗi bình luận chỉ chứa 1 loại (text XOR sticker XOR gif).
// - Sticker / GIF gợi ý theo text đang nhập (giống MessageComposer).
// - List comment phẳng 1 cấp (parentId null); reply 1 cấp đơn giản hoá.

import { useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Link } from "react-router";
import {
  Send,
  Smile,
  Image as ImageIcon,
  X as XIcon,
  Loader2,
  CornerDownRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { useAuthStore } from "@/stores/useAuthStore";
import { commentService } from "@/services/post.service";
import { useMediaSuggest } from "@/hooks/useGifSuggest";
import { useConfirm } from "@/components/providers/ConfirmDialogProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Comment } from "@/types/post";
import type { User } from "@/types/user";

interface CommentSectionProps {
  postId: string;
  onCountChange?: (n: number) => void;
}

const MAX_LEN = 500;

const getInitials = (name?: string) =>
  (name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const timeAgo = (iso?: string) =>
  iso
    ? formatDistanceToNow(new Date(iso), { addSuffix: true, locale: vi })
    : "";

const CommentItem = ({
  c,
  isMe,
  onReply,
  onDeleted,
  onCopy,
  onEdit,
}: {
  c: Comment;
  isMe: boolean;
  onReply: (c: Comment) => void;
  onDeleted: (id: string) => void;
  onCopy: (c: Comment) => void;
  onEdit: (c: Comment) => void;
}) => {
  const author =
    typeof c.author === "object" && c.author
      ? (c.author as User)
      : ({ _id: "", displayName: "Người dùng", username: "", avatarUrl: "" } as User);

  return (
    <div className="flex items-start gap-2.5 group/row px-2 py-1.5 rounded-xl hover:bg-accent/40 transition-colors">
      <Link to={`/profile/${author._id}`}>
        <Avatar className="h-9 w-9 ring-1 ring-orange-100 shrink-0">
          <AvatarImage src={author.avatarUrl} alt={author.displayName} />
          <AvatarFallback className="bg-greenx-gradient text-white text-xs font-semibold">
            {getInitials(author.displayName)}
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-1.5 text-xs">
          <Link
            to={`/profile/${author._id}`}
            className="font-semibold text-slate-800 hover:text-orange-600 truncate"
          >
            {author.displayName || author.username}
          </Link>
          <span className="text-slate-300">·</span>
          <span className="text-slate-400 shrink-0">{timeAgo(c.createdAt)}</span>
        </div>
        {c.type === "text" && c.content && (
          <p className="text-sm text-slate-800 whitespace-pre-wrap break-words leading-relaxed mt-0.5">
            {c.content}
          </p>
        )}
        {c.type === "sticker" && c.stickerUrl && (
          <img
            src={c.stickerUrl}
            alt=""
            className="w-20 h-20 object-contain mt-1"
            loading="lazy"
          />
        )}
        {c.type === "gif" && c.gifUrl && (
          <img
            src={c.gifUrl}
            alt=""
            className="max-w-[220px] max-h-40 rounded-lg object-cover mt-1"
            loading="lazy"
          />
        )}
        <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onReply(c)}
            className="hover:text-orange-600 inline-flex items-center gap-1"
          >
            <CornerDownRight className="h-3 w-3" /> Trả lời
          </button>
          {c.type === "text" && (
            <button
              type="button"
              onClick={() => onCopy(c)}
              className="hover:text-orange-600"
            >
              Sao chép
            </button>
          )}
          {isMe && c.type === "text" && (
            <button
              type="button"
              onClick={() => onEdit(c)}
              className="hover:text-orange-600"
            >
              Sửa
            </button>
          )}
          {isMe && (
            <button
              type="button"
              onClick={() => onDeleted(c._id)}
              className="hover:text-red-600"
            >
              Xoá
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const CommentSection = ({ postId, onCountChange }: CommentSectionProps) => {
  const { user: me } = useAuthStore();
  const { confirm } = useConfirm();
  const [items, setItems] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [editing, setEditing] = useState<Comment | null>(null);
  const [editText, setEditText] = useState("");
  const [pendingSticker, setPendingSticker] = useState<{ id: string; url: string } | null>(null);
  const [pendingGif, setPendingGif] = useState<{ id: string; url: string } | null>(null);
  const [showPicker, setShowPicker] = useState<null | "sticker" | "gif">(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Sticker / GIF suggestion dựa theo text đang gõ
  const { suggestions, loading: sugLoading } = useMediaSuggest(text);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  useEffect(() => {
    onCountChange?.(items.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await commentService.list(postId);
      setItems(r.items || r || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Không tải được bình luận");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async () => {
    if (submitting) return;
    const trimmed = text.trim();
    if (pendingSticker) {
      setSubmitting(true);
      try {
        const c = await commentService.create(postId, {
          type: "sticker",
          stickerId: pendingSticker.id,
          stickerUrl: pendingSticker.url,
        });
        setItems((prev) => [...prev, c]);
        setText("");
        setPendingSticker(null);
        setShowPicker(null);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || "Gửi sticker thất bại");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (pendingGif) {
      setSubmitting(true);
      try {
        const c = await commentService.create(postId, {
          type: "gif",
          gifId: pendingGif.id,
          gifUrl: pendingGif.url,
        });
        setItems((prev) => [...prev, c]);
        setText("");
        setPendingGif(null);
        setShowPicker(null);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || "Gửi GIF thất bại");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (!trimmed) return;
    if (trimmed.length > MAX_LEN) {
      toast.error(`Bình luận tối đa ${MAX_LEN} ký tự`);
      return;
    }
    setSubmitting(true);
    try {
      const c = await commentService.create(postId, {
        type: "text",
        content: trimmed,
        parentId: replyTo?._id,
      });
      setItems((prev) => [...prev, c]);
      setText("");
      setReplyTo(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gửi bình luận thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    const ok = await confirm({
      title: "Xoá bình luận này?",
      message: "Hành động này không thể hoàn tác.",
      confirmLabel: "Xoá",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await commentService.remove(id);
      setItems((prev) => prev.filter((c) => c._id !== id));
      toast.success("Đã xoá bình luận");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Xoá thất bại");
    }
  };

  const onCopy = (c: Comment) => {
    if (c.type === "text" && c.content) {
      navigator.clipboard.writeText(c.content);
      toast.success("Đã sao chép");
    }
  };

  const onStartEdit = (c: Comment) => {
    setEditing(c);
    setEditText(c.content || "");
  };

  const onSaveEdit = async () => {
    if (!editing) return;
    if (!editText.trim()) return;
    try {
      const updated = await commentService.update(editing._id, editText.trim());
      setItems((prev) => prev.map((c) => (c._id === editing._id ? updated : c)));
      setEditing(null);
      toast.success("Đã sửa bình luận");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Sửa thất bại");
    }
  };

  const handleSelectSuggestion = (s: any) => {
    if (s.mediaType === "sticker") {
      setPendingSticker({ id: s._id || s.id, url: s.url });
      setPendingGif(null);
    } else {
      setPendingGif({ id: s._id || s.id, url: s.url });
      setPendingSticker(null);
    }
    setShowPicker(null);
    setText("");
  };

  const len = text.length;
  const overLimit = len > MAX_LEN;
  const canSend = !submitting && !overLimit && (text.trim() || pendingSticker || pendingGif);

  return (
    <div className="mt-4 pt-4 border-t border-slate-100" id="comments">
      <h3 className="text-sm font-semibold text-slate-800 mb-2 px-1">
        Bình luận ({items.length})
      </h3>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-slate-500 text-sm">
          <Spinner className="mr-2" /> Đang tải bình luận...
        </div>
      ) : items.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-500">
          Chưa có bình luận nào. Hãy là người đầu tiên!
        </div>
      ) : (
        <div className="space-y-0.5">
          {items.map((c) => (
            <CommentItem
              key={c._id}
              c={c}
              isMe={
                typeof c.author === "object" &&
                (c.author as User)._id === me?._id
              }
              onReply={setReplyTo}
              onDeleted={onDelete}
              onCopy={onCopy}
              onEdit={onStartEdit}
            />
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="mt-3 bg-white border border-orange-100 rounded-xl p-2.5">
        {editing ? (
          <div className="flex flex-col gap-2">
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              maxLength={MAX_LEN}
              className="min-h-[60px] text-sm"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {editText.length}/{MAX_LEN}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(null)}
                >
                  Huỷ
                </Button>
                <Button size="sm" onClick={onSaveEdit}>
                  Lưu
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {replyTo && (
              <div className="flex items-center justify-between bg-orange-50 border-l-2 border-primary/50 rounded-md px-2 py-1 mb-1.5">
                <p className="text-[11px] text-slate-600 truncate">
                  Trả lời{" "}
                  <span className="font-semibold">
                    {(replyTo.author as User)?.displayName || "bình luận"}
                  </span>
                  : {replyTo.type === "text" ? replyTo.content : `[${replyTo.type}]`}
                </p>
                <button
                  onClick={() => setReplyTo(null)}
                  className="text-slate-500 hover:text-slate-800"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Pending sticker / gif preview */}
            {(pendingSticker || pendingGif) && (
              <div className="relative inline-block mb-1.5">
                {pendingSticker && (
                  <img
                    src={pendingSticker.url}
                    alt=""
                    className="w-20 h-20 object-contain border border-orange-200 rounded-md bg-orange-50"
                  />
                )}
                {pendingGif && (
                  <img
                    src={pendingGif.url}
                    alt=""
                    className="max-w-[200px] max-h-32 object-cover rounded-md border border-orange-200"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPendingSticker(null);
                    setPendingGif(null);
                  }}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-white border border-slate-300 flex items-center justify-center shadow"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </div>
            )}

            <div className="flex items-end gap-2">
              <Avatar className="h-8 w-8 ring-1 ring-orange-100 shrink-0">
                <AvatarImage src={me?.avatarUrl} alt={me?.displayName} />
                <AvatarFallback className="bg-greenx-gradient text-white text-xs font-semibold">
                  {getInitials(me?.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <Textarea
                  ref={taRef}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    // Clear pending media khi gõ lại text
                    if (pendingSticker || pendingGif) {
                      setPendingSticker(null);
                      setPendingGif(null);
                    }
                  }}
                  placeholder="Viết bình luận..."
                  maxLength={MAX_LEN + 50}
                  className="min-h-[40px] max-h-32 text-sm resize-none"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (canSend) onSubmit();
                    }
                  }}
                />
                <div className="flex items-center justify-between mt-1">
                  <span
                    className={cn(
                      "text-[10px]",
                      overLimit ? "text-red-600 font-semibold" : "text-slate-400"
                    )}
                  >
                    {len}/{MAX_LEN}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() =>
                        setShowPicker((p) => (p === "sticker" ? null : "sticker"))
                      }
                      title="Sticker"
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() =>
                        setShowPicker((p) => (p === "gif" ? null : "gif"))
                      }
                      title="GIF"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                size="icon"
                onClick={onSubmit}
                disabled={!canSend}
                className="h-8 w-8 rounded-full"
                title="Gửi"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {showPicker && (
              <div className="mt-2 max-h-48 overflow-y-auto border border-orange-100 rounded-lg p-2">
                {text.trim().length === 0 ? (
                  <p className="text-[11px] text-slate-500 text-center py-3">
                    Nhập vài từ khoá để gợi ý{" "}
                    {showPicker === "sticker" ? "sticker" : "GIF"} (ví dụ: vui, buồn, cat, love)
                  </p>
                ) : sugLoading ? (
                  <div className="flex items-center justify-center py-3 text-slate-500 text-xs">
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Đang tìm...
                  </div>
                ) : suggestions.length === 0 ? (
                  <p className="text-[11px] text-slate-500 text-center py-3">
                    Không có gợi ý phù hợp
                  </p>
                ) : (
                  <div
                    className={cn(
                      "grid gap-1.5",
                      showPicker === "sticker" ? "grid-cols-5" : "grid-cols-3"
                    )}
                  >
                    {suggestions
                      .filter((s) =>
                        showPicker === "sticker"
                          ? s.mediaType === "sticker"
                          : s.mediaType === "gif"
                      )
                      .map((s) => (
                        <button
                          key={s._id}
                          type="button"
                          onClick={() => handleSelectSuggestion(s)}
                          className="border border-orange-100 rounded-md hover:bg-orange-50 overflow-hidden"
                          title={s.name}
                        >
                          <img
                            src={s.url}
                            alt={s.name}
                            className={cn(
                              "w-full object-cover",
                              showPicker === "sticker"
                                ? "h-14 object-contain"
                                : "h-20"
                            )}
                            loading="lazy"
                          />
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
