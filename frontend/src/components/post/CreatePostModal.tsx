// CreatePostModal — Modal tạo bài viết, mở khi user click vào ô "Bạn đang nghĩ gì" ở HomePage
import { useEffect, useRef, useState } from "react";
import {
  X,
  Image as ImageIcon,
  Send,
  Loader2,
  Hash,
  Globe2,
  Users,
  Lock,
  Trash2,
  Smile,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { postService } from "@/services/post.service";
import { toast } from "sonner";

const getInitials = (name?: string) =>
  (name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (post: any) => void;
}

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Công khai", icon: Globe2 },
  { value: "friends", label: "Bạn bè", icon: Users },
  { value: "private", label: "Chỉ mình tôi", icon: Lock },
] as const;

const MAX_CHARS = 5000;
const MAX_TAGS = 10;

const CreatePostModal = ({ open, onClose, onCreated }: CreatePostModalProps) => {
  const { user } = useAuthStore();
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [visibility, setVisibility] = useState<"public" | "friends" | "private">("public");
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [content]);

  // Lock body scroll khi mở modal
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      // Focus textarea sau khi animation
      setTimeout(() => textareaRef.current?.focus(), 200);
    } else {
      document.body.style.overflow = "";
      // reset
      setContent("");
      setFiles([]);
      setPreviews([]);
      setTags([]);
      setTagInput("");
      setVisibility("public");
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Cleanup previews khi unmount
  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []).slice(0, 10 - files.length);
    if (files.length + newFiles.length > 10) {
      toast.error("Tối đa 10 ảnh/video mỗi bài");
    }
    const imageFiles = newFiles.filter((f) => f.type.startsWith("image"));
    const newPreviews = imageFiles.map((f) => URL.createObjectURL(f));
    setFiles((prev) => [...prev, ...newFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const addTag = () => {
    const t = tagInput
      .toLowerCase()
      .trim()
      .replace(/^#/, "")
      .replace(/[^a-z0-9_à-ỹ]/gi, "");
    if (!t) return;
    if (tags.includes(t)) {
      setTagInput("");
      return;
    }
    if (tags.length >= MAX_TAGS) {
      toast.error(`Tối đa ${MAX_TAGS} tag`);
      return;
    }
    setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  const handleTagKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const handlePost = async () => {
    if (!content.trim() && files.length === 0) {
      toast.error("Bài viết phải có nội dung hoặc ảnh");
      return;
    }
    if (content.length > MAX_CHARS) {
      toast.error(`Nội dung tối đa ${MAX_CHARS} ký tự`);
      return;
    }
    setPosting(true);
    try {
      const post = await postService.create(
        { content: content.trim(), visibility, tags },
        files
      );
      toast.success("Đã đăng bài");
      onCreated?.(post);
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Đăng bài thất bại");
    } finally {
      setPosting(false);
    }
  };

  const VisibilityIcon = VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.icon || Globe2;

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-xl bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[100dvh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Tạo bài viết</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Author */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback className="bg-greenx-gradient text-white text-sm font-semibold">
                {getInitials(user?.displayName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm text-slate-900">
                {user?.displayName}
              </p>
              {/* Visibility selector */}
              <div className="relative group">
                <button className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-orange-600 px-1.5 py-0.5 rounded hover:bg-orange-50">
                  <VisibilityIcon className="h-3 w-3" />
                  {VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.label}
                </button>
                <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[140px] z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  {VISIBILITY_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setVisibility(opt.value as any)}
                        className={cn(
                          "w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2",
                          visibility === opt.value && "text-orange-600 font-medium"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`${user?.displayName || "Bạn"} ơi, bạn đang nghĩ gì?`}
            rows={4}
            className="w-full resize-none border-0 outline-none text-[15px] text-slate-900 placeholder:text-slate-400 bg-transparent min-h-[100px]"
            style={{ height: "auto" }}
          />

          {/* Media previews */}
          {previews.length > 0 && (
            <div
              className={cn(
                "grid gap-1 rounded-xl overflow-hidden",
                previews.length === 1
                  ? "grid-cols-1"
                  : previews.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-3"
              )}
            >
              {previews.map((url, i) => (
                <div
                  key={i}
                  className={cn(
                    "relative aspect-square bg-slate-100 overflow-hidden group",
                    previews.length === 3 && i === 0 && "row-span-2"
                  )}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          <div className="border border-slate-200 rounded-xl p-2.5 flex flex-wrap gap-1.5 items-center focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100 transition">
            <Hash className="h-4 w-4 text-orange-500 shrink-0" />
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full"
              >
                {t}
                <button
                  onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                  className="hover:text-orange-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKey}
              onBlur={addTag}
              placeholder={tags.length === 0 ? "Thêm thẻ (nhấn Enter để thêm)" : ""}
              className="flex-1 min-w-[100px] outline-none text-sm bg-transparent"
            />
          </div>

          <p className="text-[10px] text-slate-400 text-right">
            {content.length} / {MAX_CHARS}
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-3 space-y-2">
          {/* Toolbar */}
          <div className="flex items-center justify-between p-1">
            <div className="flex items-center gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={files.length >= 10}
                className="p-2 rounded-full hover:bg-orange-50 text-slate-600 hover:text-orange-600 transition disabled:opacity-50"
                title="Thêm ảnh"
              >
                <ImageIcon className="h-5 w-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleFileChange}
              />
              <button
                className="p-2 rounded-full hover:bg-orange-50 text-slate-600 hover:text-orange-600 transition"
                title="Cảm xúc"
                onClick={() => toast.info("Tính năng đang phát triển")}
              >
                <Smile className="h-5 w-5" />
              </button>
            </div>
            <Button
              onClick={handlePost}
              disabled={posting || (!content.trim() && files.length === 0)}
              className="bg-greenx-gradient hover:opacity-90 text-white gap-1.5"
            >
              {posting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Đăng
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;
