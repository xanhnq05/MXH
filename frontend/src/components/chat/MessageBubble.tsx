// MessageBubble - Style vertical detail list (giống FriendsPage FriendRow)
// - Avatar trái (luôn hiển thị), tên + nội dung xếp dọc bên phải
// - Tin nhắn của mình: avatar phải, nền bubble nhẹ
// - Action menu (reply, copy, pin, delete) hiện khi hover
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Reply,
  MoreHorizontal,
  Trash2,
  Copy,
  Pin,
  FileText,
  Image as ImageIcon,
  Sticker as StickerIcon,
  Film,
  Music,
  Download,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { chatService } from "@/services/chat.service";
import { toast } from "sonner";
import { useLightbox } from "@/stores/useLightboxStore";
import { useConfirm } from "@/components/providers/ConfirmDialogProvider";
import { MessageStatus, computeMessageStatus } from "./MessageStatus";
import { MessageStatusModal } from "./MessageStatusModal";
import { useChatStore } from "@/stores/useChatStore";
import { cn } from "@/lib/utils";
import type { Message, User, Conversation } from "@/types/message";

interface MessageBubbleProps {
  msg: Message;
  isMe: boolean;
  showAvatar: boolean;
  showName: boolean;
  currentUser: User;
  onReply: (msg: Message) => void;
  onDeleted: (msgId: string) => void;
  isGroup: boolean;
  /** Conversation hiện tại (cần thiết cho status modal) */
  conversation?: Conversation | null;
  /**
   * Có hiển thị status tick "đã gửi/đã nhận/đã xem" cho tin nhắn của mình không.
   * - Mặc định: true (tin nhắn độc lập)
   * - Khi nhiều message isMe liên tiếp: chỉ message cuối cùng mới truyền true
   * → các message trong cùng cụm không hiện tick lặp
   */
  showStatus?: boolean;
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const getInitials = (name?: string) =>
  (name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// Render nội dung dạng gọn theo loại message
const renderContent = (
  msg: Message,
  isMe: boolean,
  onImageClick: (url: string) => void,
  imgError: boolean
) => {
  const baseTextCls = "text-sm leading-relaxed whitespace-pre-wrap break-words";
  if (msg.type === "text") {
    return <p className={baseTextCls}>{msg.content}</p>;
  }
  if (msg.type === "image") {
    if (msg.fileUrl && !imgError) {
      return (
        <button
          type="button"
          onClick={() => onImageClick(msg.fileUrl!)}
          className="block rounded-lg overflow-hidden hover:opacity-95 transition"
        >
          <img
            src={msg.fileUrl}
            alt=""
            className="max-w-[24ch] max-h-72 rounded-lg object-cover"
            loading="lazy"
          />
        </button>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-sm opacity-80">
        <ImageIcon className="h-4 w-4" /> Không tải được ảnh
      </span>
    );
  }
  if (msg.type === "voice") {
    return (
      <div className="flex items-center gap-2">
        <Music className="h-4 w-4 shrink-0 opacity-70" />
        <audio
          src={msg.fileUrl}
          controls
          className="h-8 max-w-[220px]"
          preload="metadata"
        />
        {msg.duration ? (
          <span className="text-[11px] opacity-70">
            {Math.floor(msg.duration / 60)}:
            {String(Math.floor(msg.duration % 60)).padStart(2, "0")}
          </span>
        ) : null}
      </div>
    );
  }
  if (msg.type === "sticker" || msg.type === "gif") {
    if (msg.stickerUrl) {
      // Sticker: width ~ 128px (tương đương ~17 ký tự theo bubble text 24ch ~ 192px)
      // → vẫn nằm gọn trong bubble 24ch
      return (
        <img
          src={msg.stickerUrl}
          alt=""
          className="w-32 h-32 object-contain"
          loading="lazy"
        />
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-sm opacity-80">
        <StickerIcon className="h-4 w-4" /> Sticker
      </span>
    );
  }
  if (msg.type === "file") {
    return (
      <a
        href={msg.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-2 text-sm hover:underline",
          isMe ? "text-primary-foreground" : "text-foreground"
        )}
      >
        <FileText className="h-4 w-4 shrink-0" />
        <span className="truncate max-w-[28ch]">
          {msg.fileName || "Tệp đính kèm"}
        </span>
        {msg.fileSize && (
          <span className="text-[11px] opacity-70 shrink-0">
            {formatBytes(msg.fileSize)}
          </span>
        )}
        <Download className="h-3.5 w-3.5 opacity-60 ml-1" />
      </a>
    );
  }
  if (msg.type === "system") {
    return <p className="text-xs italic opacity-80">{msg.content}</p>;
  }
  if (msg.type === "share_post") {
    // Card preview gọn với nút mở bài viết
    return (
      <a
        href={msg.postUrl || (msg.postId ? `/post/${msg.postId}` : "#")}
        target={msg.postUrl ? "_blank" : undefined}
        rel="noopener noreferrer"
        className={cn(
          "block max-w-[280px] rounded-lg border p-2.5 hover:opacity-95 transition",
          isMe
            ? "bg-primary-foreground/15 border-primary-foreground/30 text-primary-foreground"
            : "bg-white dark:bg-slate-800 border-orange-200 dark:border-slate-700 text-foreground dark:text-slate-100"
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
              isMe
                ? "bg-primary-foreground/20"
                : "bg-orange-100 text-orange-600"
            )}
          >
            <Film className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold">Bài viết được chia sẻ</p>
            {msg.content && (
              <p className="text-[11px] opacity-80 truncate">
                {msg.content.replace(/^📎\s*/, "")}
              </p>
            )}
          </div>
        </div>
      </a>
    );
  }
  return null;
};

const replyPreviewFor = (reply: Message | string | null | undefined) => {
  if (!reply || typeof reply === "string") {
    return { icon: <FileText className="h-3 w-3" />, label: "Tin nhắn" };
  }
  switch (reply.type) {
    case "image":
      return { icon: <ImageIcon className="h-3 w-3" />, label: "Hình ảnh" };
    case "voice":
      return { icon: <Music className="h-3 w-3" />, label: "Tin nhắn thoại" };
    case "sticker":
    case "gif":
      return { icon: <StickerIcon className="h-3 w-3" />, label: "Sticker" };
    case "file":
      return { icon: <FileText className="h-3 w-3" />, label: "Tệp đính kèm" };
    case "share_post":
      return { icon: <Film className="h-3 w-3" />, label: "Bài viết" };
    default:
      return null;
  }
};

const MessageBubble = ({
  msg,
  isMe,
  showAvatar,
  showName: _showName,
  currentUser: _currentUser,
  onReply,
  onDeleted,
  isGroup,
  conversation,
  showStatus = true,
}: MessageBubbleProps) => {
  const lightbox = useLightbox();
  const { confirm } = useConfirm();
  const [imgError, setImgError] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const sender = typeof msg.senderId === "object" ? (msg.senderId as User) : null;
  const displayName = sender?.displayName || sender?.username || "Người dùng";

  // Tính tổng số recipients (trừ sender)
  const totalRecipients = useMemo(
    () =>
      conversation
        ? Math.max(0, conversation.members.length - 1)
        : 1,
    [conversation]
  );

  // Map userId -> user cho modal
  const membersById = useMemo(() => {
    const map: Record<string, any> = {};
    if (conversation) {
      for (const m of conversation.members) {
        const u: any = m.userId;
        if (u && u._id) map[u._id] = u;
      }
    }
    return map;
  }, [conversation]);

  const handleImageClick = (url: string) => {
    lightbox.show([url], 0);
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Xoá tin nhắn này?",
      message: "Hành động này không thể hoàn tác.",
      confirmLabel: "Xoá",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await chatService.removeMessage(msg._id);
      onDeleted(msg._id);
      toast.success("Đã xoá");
    } catch {
      toast.error("Xoá thất bại");
    }
  };

  const handleCopy = () => {
    if (msg.type === "text" && msg.content) {
      navigator.clipboard.writeText(msg.content);
      toast.success("Đã sao chép");
    }
  };

  const handlePin = async () => {
    if (!msg._id) return;
    try {
      await chatService.pinMessage(msg.conversationId, msg._id);
      toast.success("Đã ghim");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Không thể ghim");
    }
  };

  const replyTarget =
    typeof msg.replyTo === "object" && msg.replyTo !== null
      ? (msg.replyTo as Message)
      : null;
  const replyPreview = replyPreviewFor(replyTarget);
  const replyText =
    replyTarget?.type === "text" ? replyTarget.content : replyPreview?.label;
  const replySender =
    replyTarget && typeof replyTarget.senderId === "object"
      ? (replyTarget.senderId as User).displayName
      : null;

  const isDeleted = (msg as any).deletedAt || msg.type === "system" && false;

  // Tin nhắn của mình: KHÔNG hiện avatar (kể cả placeholder)
  // Tin nhắn của người khác: avatar ở đầu cụm, các tin sau trong cùng cụm
  // bỏ trống (giữ column width bằng w-9 cố định).
  const showAvatarReal = showAvatar && !isMe;
  const showNameReal = isGroup && !isMe && showAvatar;

  // Animation nảy nhẹ khi user click bubble của mình
  const [bounce, setBounce] = useState(false);
  const bounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryMessage = useChatStore((s) => s.retryMessage);

  // Tin nhắn của mình có 2 trạng thái click:
  // - Click lần 1: hiện dòng text nhỏ bên dưới bubble (trạng thái + thời gian)
  // - Click lần 2: ẩn dòng text
  // Click vào bubble khác của mình sẽ tự đóng cái hiện tại (event bus).
  const [statusExpanded, setStatusExpanded] = useState(false);

  // Lắng nghe event close từ bubble khác
  useEffect(() => {
    if (!isMe) return;
    const close = (e: Event) => {
      // Bỏ qua nếu event do chính bubble này gửi
      const ce = e as CustomEvent<{ sourceId?: string }>;
      if (ce.detail?.sourceId === msg._id) return;
      setStatusExpanded(false);
    };
    window.addEventListener("mxh:close-status", close as EventListener);
    return () =>
      window.removeEventListener("mxh:close-status", close as EventListener);
  }, [isMe, msg._id]);

  const handleBubbleClick = () => {
    if (!isMe) return;
    // Phát animation nảy
    setBounce(true);
    if (bounceTimer.current) clearTimeout(bounceTimer.current);
    bounceTimer.current = setTimeout(() => setBounce(false), 420);

    // Nếu message failed → retry + giữ status text luôn mở
    if ((msg as any)._failed) {
      setStatusExpanded(true);
      retryMessage(conversation?._id || (msg as any).conversationId, msg._id);
      return;
    }
    // Toggle status text
    const willOpen = !statusExpanded;
    setStatusExpanded(willOpen);
    if (willOpen) {
      // Báo cho bubble khác đóng (kèm sourceId để tự loại trừ)
      window.dispatchEvent(
        new CustomEvent("mxh:close-status", { detail: { sourceId: msg._id } })
      );
    }
  };

  /** Click vào reply quote bên trong bubble → scroll tới message gốc */
  const handleReplyQuoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetId = typeof msg.replyTo === "object"
      ? (msg.replyTo as Message)?._id
      : (msg.replyTo as string);
    if (!targetId) return;
    // Bắn event lên MessageList để scroll
    window.dispatchEvent(
      new CustomEvent("mxh:scroll-to-message", { detail: { id: targetId } })
    );
  };

  /** Tính text trạng thái hiển thị dưới bubble */
  const statusText = useMemo(() => {
    const totalRecipients = (() => {
      if (!conversation) return 0;
      if (conversation.type === "group") {
        return (conversation.members?.length || 0) - 1;
      }
      return 1;
    })();
    const status = computeMessageStatus(msg, totalRecipients);
    const time = new Date(msg.createdAt).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (status.kind === "failed") {
      return { text: "Gửi thất bại — bấm để thử lại", isError: true };
    }
    if (status.kind === "pending") return { text: `Đang gửi... ${time}`, isError: false };
    if (status.kind === "sent") return { text: `Đã gửi lúc ${time}`, isError: false };
    if (status.kind === "delivered") return { text: `Đã nhận lúc ${time}`, isError: false };
    if (status.kind === "read") {
      return {
        text:
          conversation?.type === "group" && totalRecipients > 1
            ? `Đã xem bởi ${status.read}/${totalRecipients}`
            : `Đã xem lúc ${time}`,
        isError: false,
      };
    }
    if (status.kind === "partial") {
      return {
        text: `Đã xem ${status.read}/${totalRecipients} lúc ${time}`,
        isError: false,
      };
    }
    return { text: time, isError: false };
  }, [msg, conversation]);

  return (
    <div
      data-msg-id={msg._id}
      className={cn(
        "group/row flex items-end gap-2 px-2 py-0.5 w-full",
        "hover:bg-accent/30 transition-colors rounded-md",
        isMe ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Cột avatar (chỉ dành cho người khác).
          Tin nhắn của mình: cột này ẩn hoàn toàn (không render). */}
      {isMe ? null : (
        <div className="w-9 sm:w-10 shrink-0 flex flex-col items-end pb-1">
          {showAvatarReal ? (
            <Avatar className="h-9 w-9 sm:h-10 sm:w-10 ring-1 ring-orange-100">
              <AvatarImage src={sender?.avatarUrl} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-slate-400 to-slate-600 text-white text-xs font-semibold">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
          ) : null}
        </div>
      )}

      {/* Cột bubble. Mỗi message là 1 bubble RIÊNG LẺ, không gộp panel. */}
      <div
        className={cn(
          "flex flex-col gap-1 min-w-0",
          isMe ? "items-end ml-auto" : "items-start mr-auto"
        )}
      >
        {/* Tên (group only) - 1 dòng trên bubble */}
        {showNameReal ? (
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 px-1">
            {displayName}
          </span>
        ) : null}

        {/* Hàng bubble (status nằm trong góc dưới-phải của bubble) + actions bên ngoài */}
        <div
          className={cn(
            "flex items-end gap-1.5",
            isMe ? "flex-row-reverse" : "flex-row"
          )}
        >
          {/* Bubble chính — chỉ chứa content */}
          <div
            onClick={handleBubbleClick}
            className={cn(
              "max-w-[24ch] rounded-2xl px-3 py-2 break-words transition-transform",
              // Animation nảy nhẹ khi click (isMe)
              isMe && "cursor-pointer",
              bounce && "animate-bubble-bounce",
              isMe
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-tl-sm",
              msg.type === "image" || msg.type === "sticker" || msg.type === "gif"
                ? "p-1 bg-transparent border-0"
                : "",
              isDeleted && "opacity-60"
            )}
          >
            {/* Reply quote bên trong bubble, phía trên content — click để scroll tới message gốc */}
            {replyTarget && (
              <button
                type="button"
                onClick={handleReplyQuoteClick}
                className={cn(
                  "text-left text-[11px] rounded-md px-2 py-1 mb-1.5 max-w-full border-l-2 w-full",
                  "hover:brightness-95 active:scale-[0.98] transition-all cursor-pointer",
                  isMe
                    ? "bg-primary-foreground/15 border-primary-foreground/40"
                    : "bg-slate-100 dark:bg-slate-700/60 border-slate-300 dark:border-slate-500"
                )}
              >
                {replySender && (
                  <p
                    className={cn(
                      "font-semibold text-[11px]",
                      isMe ? "text-primary-foreground" : "text-slate-700 dark:text-slate-200"
                    )}
                  >
                    {replySender}
                  </p>
                )}
                <p
                  className={cn(
                    "truncate text-[11px]",
                    isMe ? "text-primary-foreground/85" : "text-slate-600 dark:text-slate-300"
                  )}
                >
                  {replyText}
                </p>
              </button>
            )}

            {/* Content (bình thường — status đặt ngoài bubble nên không cần pr) */}
            <div>
              {renderContent(msg, isMe, handleImageClick, imgError)}
            </div>
          </div>

          {/* Status tick nằm NGAY DƯỚI bubble, góc phải-bubble
              (chỉ isMe & showStatus & có conversation).
              Đặt ngoài bubble để không che content. */}
          {isMe && showStatus && conversation ? (
            <div
              className={cn(
                "mt-0.5 pr-1 self-end",
                "flex items-center gap-0.5 text-[10px]",
                isMe ? "text-slate-400" : "text-slate-400"
              )}
            >
              <MessageStatus
                msg={msg}
                conversation={conversation}
                myId={_currentUser._id}
                totalRecipients={totalRecipients}
                onOpenDetails={() => setStatusOpen(true)}
              />
            </div>
          ) : null}

          {/* Cột phụ bên ngoài bubble: chỉ actions (status đã chuyển vào bubble) */}
          <div
            className={cn(
              "flex flex-col items-center gap-1 shrink-0 pb-1",
              isMe ? "" : "items-start"
            )}
          >
            <div
              className={cn(
                "opacity-0 group-hover/row:opacity-100 focus-within:opacity-100 transition-opacity"
              )}
            >
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    "h-6 w-6 inline-flex items-center justify-center rounded-full",
                    "text-slate-400 hover:bg-orange-100 hover:text-orange-600 outline-none"
                  )}
                  aria-label="Tùy chọn"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isMe ? "end" : "start"}>
                  <DropdownMenuItem onClick={() => onReply(msg)}>
                    <Reply className="h-4 w-4 mr-2" /> Trả lời
                  </DropdownMenuItem>
                  {msg.type === "text" && (
                    <DropdownMenuItem onClick={handleCopy}>
                      <Copy className="h-4 w-4 mr-2" /> Sao chép
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handlePin}>
                    <Pin className="h-4 w-4 mr-2" /> Ghim
                  </DropdownMenuItem>
                  {isMe && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Xoá
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Dòng text trạng thái nhỏ — ẩn mặc định, hiện khi click bubble lần 1.
            Click lần 2 (hoặc click bubble khác) sẽ ẩn đi. */}
        {isMe && statusExpanded ? (
          <div
            className={cn(
              "self-end pr-1 mt-0.5",
              "text-[11px] leading-snug max-w-[28ch] text-right",
              statusText.isError
                ? "text-red-500 font-medium"
                : "text-slate-400 dark:text-slate-500"
            )}
          >
            {statusText.text}
          </div>
        ) : null}
      </div>

      {/* Modal trạng thái tin nhắn (chỉ với isMe) */}
      {isMe && (
        <MessageStatusModal
          open={statusOpen}
          onOpenChange={setStatusOpen}
          message={msg}
          conversation={conversation || null}
          membersById={membersById}
        />
      )}
    </div>
  );
};

export default MessageBubble;
