// MessageBubble — hiển thị 1 tin nhắn. Hỗ trợ: text, image, voice, sticker, gif, file, reply.

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Reply, MoreVertical, Trash2, Copy, Pin } from "lucide-react";
import { format } from "date-fns";
import type { Message, User } from "@/types/message";
import { useLightbox } from "@/stores/useLightboxStore";
import { useState } from "react";
import { chatService } from "@/services/chat.service";
import { toast } from "sonner";

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
  const [decryptedText, setDecryptedText] = useState<string | null>(null);

  const sender = typeof msg.senderId === "object" ? (msg.senderId as User) : null;

  const handleImageClick = () => {
    if (msg.type === "image" && msg.fileUrl) {
      lightbox.show([msg.fileUrl], 0);
    }
  };

  const handleDelete = async () => {
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
    try {
      // Pin/unpin sẽ handle ở component cha
      toast("Chức năng ghim sẽ được thêm");
    } catch {}
  };

  const replyTarget = typeof msg.replyTo === "object" && msg.replyTo !== null
    ? (msg.replyTo as Message)
    : null;

  return (
    <div className={`flex gap-2 group ${isMe ? "flex-row-reverse" : ""}`}>
      {showAvatar && !isMe ? (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={sender?.avatarUrl} />
          <AvatarFallback>{sender?.displayName?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-8 shrink-0" />
      )}

      <div className={`max-w-[70%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
        {/* Sender name (group) */}
        {showName && !isMe && isGroup && sender && (
          <p className="text-xs text-muted-foreground mb-0.5 px-1">
            {sender.displayName}
          </p>
        )}

        {/* Reply quote */}
        {replyTarget && (
          <div
            className={`text-xs bg-muted/50 rounded px-2 py-1 mb-1 max-w-full truncate border-l-2 border-primary ${
              isMe ? "self-end" : "self-start"
            }`}
          >
            <p className="font-semibold">
              {typeof replyTarget.senderId === "object"
                ? replyTarget.senderId.displayName
                : "Người gửi"}
            </p>
            <p className="truncate opacity-80">
              {replyTarget.type === "text"
                ? replyTarget.content
                : replyTarget.type === "image"
                ? "📷 Hình ảnh"
                : replyTarget.type === "sticker" || replyTarget.type === "gif"
                ? "🖼️ Sticker"
                : replyTarget.type === "voice"
                ? "🎤 Voice"
                : "📎 File"}
            </p>
          </div>
        )}

        {/* Bubble */}
        <div className="flex items-center gap-1">
          {/* Action menu (hover) */}
          <div
            className={`opacity-0 group-hover:opacity-100 transition-opacity ${
              isMe ? "order-first" : ""
            }`}
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
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" /> Xoá
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div
            className={`rounded-2xl overflow-hidden ${
              msg.type === "sticker" || msg.type === "gif"
                ? "bg-transparent"
                : isMe
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            {msg.type === "text" && (
              <p className="text-sm whitespace-pre-wrap px-3 py-2 break-words">
                {decryptedText || msg.content}
              </p>
            )}

            {msg.type === "image" && msg.fileUrl && (
              <img
                src={msg.fileUrl}
                alt=""
                onClick={handleImageClick}
                className="max-w-xs max-h-80 object-cover cursor-pointer hover:opacity-95"
                loading="lazy"
              />
            )}

            {msg.type === "voice" && msg.fileUrl && (
              <div className="px-3 py-2 min-w-[200px]">
                <audio src={msg.fileUrl} controls className="w-full h-8" />
                {msg.duration && (
                  <p className="text-xs opacity-70 mt-1">{msg.duration}s</p>
                )}
              </div>
            )}

            {msg.type === "sticker" || msg.type === "gif" ? (
              <img
                src={msg.stickerUrl}
                alt=""
                className="w-32 h-32 object-contain cursor-pointer"
                loading="lazy"
              />
            ) : null}

            {msg.type === "file" && (
              <a
                href={msg.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-3 py-2 underline ${
                  isMe ? "text-primary-foreground" : ""
                }`}
              >
                📎 {msg.fileName || "File"}
                {msg.fileSize && (
                  <span className="text-xs opacity-70">
                    ({(msg.fileSize / 1024).toFixed(1)} KB)
                  </span>
                )}
              </a>
            )}

            {msg.type === "system" && (
              <p className="text-xs italic text-muted-foreground px-3 py-1">
                {msg.content}
              </p>
            )}
          </div>
        </div>

        {/* Time */}
        <p className="text-[10px] text-muted-foreground mt-0.5 px-1">
          {format(new Date(msg.createdAt), "HH:mm")}
        </p>
      </div>
    </div>
  );
};

export default MessageBubble;
