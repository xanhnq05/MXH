// MessageComposer — ô nhập tin nhắn cho ChatPage.
// Cải tiến: action phụ gom vào nút `+` (paperclip menu), hỗ trợ IME tiếng Việt, tự reset
// khi chọn sticker/GIF/ảnh/file, hiển thị reply preview, drag & drop ảnh, GIF suggestions.
// Upload: dùng endpoint /upload (chỉ upload) rồi socket emit `message:send` để tạo message
// → tránh double-upload và double-message.

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  Send,
  Plus,
  Paperclip,
  Image as ImageIcon,
  Sticker as StickerIcon,
  Mic,
  X,
  Reply,
  FileText,
  Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useGifSuggest } from "@/hooks/useGifSuggest";
import { useRecorder } from "@/hooks/useRecorder";
import { chatService } from "@/services/chat.service";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import EmojiPickerButton from "./EmojiPickerButton";
import StickerPicker from "./StickerPicker";
import type { Message } from "@/types/message";

export type SendPayload = {
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
};

interface MessageComposerProps {
  conversationId: string;
  replyTo: Message | null;
  onCancelReply: () => void;
  onSend: (payload: SendPayload) => Promise<void>;
}

const ACCEPTED_IMAGE = "image/jpeg,image/png,image/webp,image/gif";
const ACCEPTED_FILE =
  ".pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.jpg,.jpeg,.png,.webp,.gif,.mp3,.wav,.m4a,.aac,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip,application/x-zip-compressed,text/plain,text/csv";

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const isComposingRef = { current: false };

/** Xác định loại message dựa trên MIME */
const detectMessageType = (mime: string): "image" | "file" | "voice" => {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "voice";
  return "file";
};

export const MessageComposer = ({
  conversationId,
  replyTo,
  onCancelReply,
  onSend,
}: MessageComposerProps) => {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLInputElement>(null);

  const { suggestions: gifs, loading: gifLoading } = useGifSuggest(text);
  const recorder = useRecorder();

  // Reset pendingFile khi đổi conversation
  useEffect(() => {
    setPendingFile(null);
    setText("");
  }, [conversationId]);

  const handleSendText = useCallback(async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const replyId = typeof replyTo === "object" && replyTo ? replyTo._id : undefined;
    try {
      await onSend({
        type: "text",
        content: text.trim(),
        ...(replyId && { replyTo: replyId }),
      });
      setText("");
      onCancelReply();
    } catch (e: any) {
      toast.error(e?.message || "Gửi thất bại");
    } finally {
      setSending(false);
    }
  }, [text, sending, onSend, replyTo, onCancelReply]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (isComposingRef.current) return;
    if ((e.nativeEvent as any).isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };
  const handleCompositionEnd = () => {
    setTimeout(() => {
      isComposingRef.current = false;
    }, 0);
  };

  const handleStickerSelect = async (s: { id: string; url: string; type: "sticker" }) => {
    if (sending) return;
    setSending(true);
    const replyId = replyTo?._id;
    try {
      await onSend({
        type: "sticker",
        stickerId: s.id,
        stickerUrl: s.url,
        ...(replyId && { replyTo: replyId }),
      });
      onCancelReply();
    } catch (e: any) {
      toast.error(e?.message || "Gửi sticker thất bại");
    } finally {
      setSending(false);
    }
  };

  const handleGifClick = async (gif: { id: string; url: string; tags: string[] }) => {
    if (sending) return;
    setSending(true);
    const replyId = replyTo?._id;
    try {
      await onSend({
        type: "gif",
        stickerId: gif.id,
        stickerUrl: gif.url,
        content: gif.tags[0] || "",
        ...(replyId && { replyTo: replyId }),
      });
      setText("");
      onCancelReply();
    } catch (e: any) {
      toast.error(e?.message || "Gửi GIF thất bại");
    } finally {
      setSending(false);
    }
  };

  /**
   * Upload file rồi gửi message qua socket. Tránh double-upload và double-message.
   */
  const uploadAndSend = useCallback(
    async (file: File) => {
      if (sending) return;
      setSending(true);
      try {
        // Bước 1: upload file (chỉ upload, không tạo message)
        const uploaded = await chatService.uploadFile(conversationId, file);
        // Bước 2: tạo message qua socket
        const messageType = detectMessageType(uploaded.mimeType);
        const replyId = replyTo?._id;
        await onSend({
          type: messageType,
          fileUrl: uploaded.url,
          fileKey: uploaded.key,
          fileName: uploaded.originalName || file.name,
          fileSize: uploaded.size,
          ...(replyId && { replyTo: replyId }),
        });
        onCancelReply();
      } catch (e: any) {
        const m = e?.response?.data?.message || e?.message;
        toast.error(m || "Upload thất bại");
      } finally {
        setSending(false);
      }
    },
    [conversationId, onSend, replyTo, onCancelReply, sending]
  );

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    uploadAndSend(file);
  };

  const handlePendingConfirm = () => {
    if (!pendingFile) return;
    const f = pendingFile;
    setPendingFile(null);
    uploadAndSend(f);
  };

  const handleVoice = async () => {
    if (recorder.isRecording) {
      try {
        const { file, duration } = await recorder.stop();
        setSending(true);
        try {
          // Upload voice file rồi tạo message
          const uploaded = await chatService.uploadFile(conversationId, file);
          await onSend({
            type: "voice",
            fileUrl: uploaded.url,
            fileKey: uploaded.key,
            fileName: uploaded.originalName,
            fileSize: uploaded.size,
            duration,
          });
        } finally {
          setSending(false);
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

  // Drag & drop
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setPendingFile(file);
  };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);

  return (
    <div
      className={cn(
        "border-t bg-background",
        dragOver && "ring-2 ring-primary ring-inset"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-l-2 border-primary">
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
                  ? "Sticker"
                  : replyTo.type === "image"
                    ? "Hình ảnh"
                    : replyTo.type === "voice"
                      ? "Tin nhắn thoại"
                      : "Tệp đính kèm"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancelReply}
            title="Hủy"
            className="h-7 w-7"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Pending file preview */}
      {pendingFile && (
        <div className="flex items-center gap-3 px-3 py-2 bg-muted/40 border-b">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{pendingFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(pendingFile.size)} · {pendingFile.type || "unknown"}
            </p>
          </div>
          <Button
            size="sm"
            onClick={handlePendingConfirm}
            disabled={sending}
            className="h-8"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gửi"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPendingFile(null)}
            className="h-7 w-7"
            title="Hủy"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* GIF suggestions horizontal */}
      {gifs.length > 0 && (
        <div className="border-t bg-muted/30 p-2 overflow-x-auto">
          <div className="flex gap-2">
            {gifs.slice(0, 8).map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => handleGifClick(g)}
                disabled={sending}
                className="relative h-16 w-16 md:h-20 md:w-20 rounded-md overflow-hidden shrink-0 hover:opacity-80 hover:ring-2 ring-primary transition-all disabled:opacity-50"
                title={g.tags?.[0] || "GIF"}
              >
                <img
                  src={g.url}
                  alt={g.tags?.[0] || "GIF"}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
            {gifLoading && (
              <div className="h-20 w-20 flex items-center justify-center text-xs text-muted-foreground shrink-0">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recording indicator */}
      {recorder.isRecording && (
        <div className="px-3 py-2 bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
          Đang ghi âm... {recorder.duration}s — bấm mic để dừng
        </div>
      )}

      {/* Input row */}
      <div className="p-2.5 flex items-center gap-1.5">
        {/* + Action menu */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              title="Đính kèm"
              className="text-muted-foreground hover:text-primary shrink-0"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-56 p-1.5">
            <Button
              variant="ghost"
              className="w-full justify-start text-sm"
              onClick={() => imageInputRef.current?.click()}
            >
              <ImageIcon className="h-4 w-4 mr-2" /> Gửi ảnh
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4 mr-2" /> Gửi tệp
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-sm"
              onClick={() => setStickerOpen(true)}
            >
              <StickerIcon className="h-4 w-4 mr-2" /> Sticker
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-sm",
                recorder.isRecording && "text-destructive"
              )}
              onClick={handleVoice}
            >
              <Mic className="h-4 w-4 mr-2" />{" "}
              {recorder.isRecording ? "Dừng ghi âm" : "Ghi âm"}
            </Button>
          </PopoverContent>
        </Popover>

        <EmojiPickerButton
          onEmojiClick={(emoji) => {
            setText((t) => t + emoji);
            textRef.current?.focus();
          }}
        />

        <Input
          ref={textRef}
          placeholder="Nhập tin nhắn..."
          value={text}
          onChange={(v: string) => setText(v)}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          disabled={sending}
          className="flex-1"
        />

        <Button
          onClick={handleSendText}
          disabled={sending || !text.trim()}
          size="icon"
          className="shrink-0"
          title="Gửi (Enter)"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept={ACCEPTED_FILE}
          onChange={handleFileChange}
        />
        <input
          ref={imageInputRef}
          type="file"
          hidden
          accept={ACCEPTED_IMAGE}
          onChange={handleFileChange}
        />
      </div>

      <StickerPicker
        open={stickerOpen}
        onOpenChange={setStickerOpen}
        onSelect={handleStickerSelect}
      />
    </div>
  );
};

export default MessageComposer;
