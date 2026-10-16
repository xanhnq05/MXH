// MessageInput — ô nhập tin nhắn dùng chung cho ChatPage.
// Hỗ trợ: text, emoji, sticker, file, image, voice, GIF suggestion horizontal, reply.

import { useState, useRef, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Send,
  Paperclip,
  Mic,
  Image as ImageIcon,
  Sticker as StickerIcon,
  X,
  Reply,
} from "lucide-react";
import { useGifSuggest } from "@/hooks/useGifSuggest";
import { useRecorder } from "@/hooks/useRecorder";
import { chatService } from "@/services/chat.service";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import EmojiPickerButton from "./EmojiPickerButton";
import StickerPicker from "./StickerPicker";
import type { Message } from "@/types/message";

interface MessageInputProps {
  conversationId: string;
  replyTo: Message | null;
  onCancelReply: () => void;
  onSend: (payload: {
    type: "text" | "sticker" | "gif" | "image" | "file" | "voice";
    content?: string;
    stickerId?: string;
    stickerUrl?: string;
    fileUrl?: string;
    fileKey?: string;
    fileName?: string;
    fileSize?: number;
    duration?: number;
    replyTo?: string;
  }) => Promise<void>;
}

const MessageInput = ({
  conversationId,
  replyTo,
  onCancelReply,
  onSend,
}: MessageInputProps) => {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { suggestions: gifs, loading: gifLoading } = useGifSuggest(text);
  const recorder = useRecorder();

  const handleSend = async () => {
    if (!text.trim()) return;
    try {
      setSending(true);
      const replyId = typeof replyTo === "object" && replyTo ? replyTo._id : undefined;
      await onSend({
        type: "text",
        content: text,
        ...(replyId && { replyTo: replyId }),
      });
      setText("");
      onCancelReply();
    } catch (e) {
      toast.error("Gửi thất bại");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStickerSelect = async (s: { id: string; url: string; type: "sticker" }) => {
    try {
      await onSend({
        type: "sticker",
        stickerId: s.id,
        stickerUrl: s.url,
        ...(replyTo?._id && { replyTo: replyTo._id }),
      });
      onCancelReply();
    } catch {
      toast.error("Gửi sticker thất bại");
    }
  };

  const handleGifClick = async (gif: { id: string; url: string; tags: string[] }) => {
    try {
      await onSend({
        type: "gif",
        stickerId: gif.id,
        stickerUrl: gif.url,
        content: gif.tags[0] || "",
        ...(replyTo?._id && { replyTo: replyTo._id }),
      });
      setText("");
      onCancelReply();
    } catch {
      toast.error("Gửi GIF thất bại");
    }
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "file" | "image"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const msg = await chatService.uploadMessageFile(conversationId, file);
      if (msg) {
        await onSend({
          type: type === "image" ? "image" : "file",
          content: msg.content || "",
          fileUrl: msg.fileUrl || "",
          fileKey: msg.fileKey || "",
          fileName: msg.fileName || file.name,
          fileSize: msg.fileSize || file.size,
          ...(replyTo?._id && { replyTo: replyTo._id }),
        });
        onCancelReply();
      }
    } catch {
      toast.error("Upload thất bại");
    } finally {
      e.target.value = "";
    }
  };

  const handleVoice = async () => {
    if (recorder.isRecording) {
      try {
        const { file, duration } = await recorder.stop();
        const msg = await chatService.uploadMessageFile(conversationId, file, undefined, duration);
        if (msg) {
          await onSend({
            type: "voice",
            fileUrl: msg.fileUrl || "",
            fileKey: msg.fileKey || "",
            fileName: msg.fileName,
            duration,
          });
        }
      } catch {
        toast.error("Lỗi ghi âm");
      }
    } else {
      try {
        await recorder.start();
      } catch {
        toast.error("Không thể truy cập micro");
      }
    }
  };

  return (
    <div className="border-t bg-background">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-l-2 border-primary">
          <Reply className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">
              Trả lời{" "}
              {typeof replyTo.senderId === "object"
                ? replyTo.senderId.displayName
                : "tin nhắn"}
            </p>
            <p className="text-sm truncate">
              {replyTo.type === "text"
                ? replyTo.content
                : replyTo.type === "sticker" || replyTo.type === "gif"
                ? "🖼️ Sticker"
                : replyTo.type === "image"
                ? "📷 Hình ảnh"
                : replyTo.type === "voice"
                ? "🎤 Voice"
                : "📎 File"}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 hover:bg-accent rounded"
            title="Hủy"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* GIF suggestions horizontal */}
      {gifs.length > 0 && (
        <div className="border-t bg-muted/30 p-2 overflow-x-auto">
          <div className="flex gap-2">
            {gifs.slice(0, 8).map((g) => (
              <img
                key={g.id}
                src={g.url}
                alt={g.tags[0]}
                onClick={() => handleGifClick(g)}
                className="h-20 w-20 object-cover rounded cursor-pointer hover:opacity-80 shrink-0"
                loading="lazy"
              />
            ))}
            {gifLoading && (
              <div className="h-20 w-20 flex items-center justify-center text-xs text-muted-foreground">
                ...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recording indicator */}
      {recorder.isRecording && (
        <div className="px-3 py-2 bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
          Đang ghi âm... {recorder.duration}s — bấm mic để dừng
        </div>
      )}

      {/* Input row */}
      <div className="p-3 flex items-center gap-2">
        <EmojiPickerButton onEmojiClick={(emoji) => setText((t) => t + emoji)} />
        <button
          type="button"
          onClick={() => setStickerOpen(true)}
          className="text-muted-foreground hover:text-foreground"
          title="Sticker"
        >
          <StickerIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-muted-foreground hover:text-foreground"
          title="File"
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="text-muted-foreground hover:text-foreground"
          title="Ảnh"
        >
          <ImageIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleVoice}
          className={cn(
            "text-muted-foreground hover:text-foreground",
            recorder.isRecording && "text-destructive animate-pulse"
          )}
          title="Voice"
        >
          <Mic className="h-5 w-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          onChange={(e) => handleFileChange(e, "file")}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handleFileChange(e, "image")}
        />
        <Input
          placeholder="Nhập tin nhắn..."
          value={text}
          onChange={(v: string) => setText(v)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={sending || !text.trim()} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <StickerPicker
        open={stickerOpen}
        onOpenChange={setStickerOpen}
        onSelect={handleStickerSelect}
      />
    </div>
  );
};

export default MessageInput;
