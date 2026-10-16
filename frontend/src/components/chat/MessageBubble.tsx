// MessageBubble — hiển thị 1 tin nhắn. Hỗ trợ: text, image, voice, sticker, gif, file, reply.
// Dùng Lucide icons thay emoji cho system/preview; vẫn render emoji nếu user nhập trong text.

import { useState } from "react";
import { format } from "date-fns";
import {
  Reply,
  MoreVertical,
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { chatService } from "@/services/chat.service";
import { toast } from "sonner";
import { useLightbox } from "@/stores/useLightboxStore";
import { cn } from "@/lib/utils";
import type { Message, User } from "@/types/message";

interface MessageBubbleProps {
  msg: Message;
  isMe: boolean;
  showAvatar: boolean;
  showName: boolean;
  currentUser: User;
  onReply: (msg: Message) => void;
  onDeleted: (msgId: string) => void;
  isGroup: boolean;
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
  showName,
  currentUser,
  onReply,
  onDeleted,
  isGroup,
}: MessageBubbleProps) => {
  const lightbox = useLightbox();
  const [imgError, setImgError] = useState(false);

  const sender = typeof msg.senderId === "object" ? (msg.senderId as User) : null;

  const handleImageClick = () => {
    if (msg.type === "image" && msg.fileUrl) {
      lightbox.show([msg.fileUrl], 0);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Xoá tin nhắn này?")) return;
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

  return (
    <div
      className={cn(
        "flex gap-2 group/message items-end",
        isMe ? "flex-row-reverse" : "flex-row"
      )}
    >
      {showAvatar && !isMe ? (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={sender?.avatarUrl} />
          <AvatarFallback className="bg-muted text-xs font-semibold">
            {sender?.displayName?.[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8 shrink-0" aria-hidden="true" />
      )}

      <div
        className={cn(
          "max-w-[78%] md:max-w-[68%] flex flex-col min-w-0",
          isMe ? "items-end" : "items-start"
        )}
      >
        {showName && !isMe && isGroup && sender && (
          <p className="text-xs font-medium text-muted-foreground mb-0.5 px-1">
            {sender.displayName}
          </p>
        )}

        <div className="flex items-end gap-1">
          {/* Action menu (always shown on mobile, hover on desktop) */}
          <div
            className={cn(
              "transition-opacity",
              isMe ? "order-first" : "",
              "opacity-0 group-hover/message:opacity-100 focus-within:opacity-100"
            )}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Thêm"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
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
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Xoá
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div
            className={cn(
              "rounded-2xl overflow-hidden break-words",
              msg.type === "sticker" || msg.type === "gif"
                ? "bg-transparent shadow-none"
                : isMe
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground",
              msg.type === "text" && "px-3 py-2",
              msg.type === "image" && "bg-transparent",
              msg.type === "voice" && "px-3 py-2 min-w-[200px]",
              msg.type === "file" && "px-3 py-2"
            )}
          >
            {msg.type === "text" && (
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                {msg.content}
              </p>
            )}

            {msg.type === "image" && msg.fileUrl && !imgError && (
              <img
                src={msg.fileUrl}
                alt=""
                onClick={handleImageClick}
                onError={() => setImgError(true)}
                className="max-w-full sm:max-w-[320px] max-h-80 object-cover rounded-2xl cursor-pointer hover:opacity-95 transition-opacity"
                loading="lazy"
              />
            )}
            {msg.type === "image" && imgError && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs opacity-80">
                <ImageIcon className="h-4 w-4" /> Không tải được ảnh
              </div>
            )}

            {msg.type === "voice" && msg.fileUrl && (
              <div className="flex flex-col gap-1">
                <audio
                  src={msg.fileUrl}
                  controls
                  className="h-8 max-w-full"
                  preload="metadata"
                />
                {msg.duration && (
                  <p className="text-[10px] opacity-70">
                    {Math.floor(msg.duration / 60)}:
                    {String(Math.floor(msg.duration % 60)).padStart(2, "0")}
                  </p>
                )}
              </div>
            )}

            {(msg.type === "sticker" || msg.type === "gif") && msg.stickerUrl && (
              <img
                src={msg.stickerUrl}
                alt=""
                className="w-28 h-28 md:w-32 md:h-32 object-contain cursor-pointer"
                loading="lazy"
              />
            )}

            {msg.type === "file" && (
              <a
                href={msg.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2 text-sm hover:underline",
                  isMe ? "text-primary-foreground" : "text-foreground"
                )}
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate max-w-[180px]">
                  {msg.fileName || "Tệp đính kèm"}
                </span>
                {msg.fileSize && (
                  <span className="text-[11px] opacity-70 shrink-0">
                    {formatBytes(msg.fileSize)}
                  </span>
                )}
                <Download className="h-3.5 w-3.5 opacity-60 ml-1" />
              </a>
            )}

            {msg.type === "system" && (
              <p className="text-xs italic text-muted-foreground">
                {msg.content}
              </p>
            )}
          </div>
        </div>

        {/* Reply quote + time */}
        {replyTarget && (
          <div
            className={cn(
              "text-[11px] rounded-md px-2 py-1 mb-1 max-w-full border-l-2 bg-muted/40",
              isMe ? "self-end border-primary" : "self-start border-muted-foreground/40"
            )}
          >
            <p className="font-semibold opacity-80">
              {typeof replyTarget.senderId === "object"
                ? replyTarget.senderId.displayName
                : "Người gửi"}
            </p>
            <p className="truncate opacity-70 max-w-[220px]">{replyText}</p>
          </div>
        )}

        <p
          className={cn(
            "text-[10px] text-muted-foreground mt-0.5 px-1",
            isMe ? "text-right" : "text-left"
          )}
        >
          {format(new Date(msg.createdAt), "HH:mm")}
        </p>
      </div>
    </div>
  );
};

export default MessageBubble;
