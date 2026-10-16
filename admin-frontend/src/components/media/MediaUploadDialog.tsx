// MediaUploadDialog v2 — upload media cải tiến:
// - Hỗ trợ upload NHIỀU file cùng lúc (bulk) cho 1 bộ sticker
// - Kéo thả file (drag & drop)
// - Tự động áp dụng metadata chung cho tất cả file trong batch
// - Upload song song (parallel) để nhanh hơn
// - Tự động phát hiện mediaType từ MIME (gif hay sticker)

import { useState, useCallback, useRef } from "react";
import { Loader2, Upload, X, FileImage, GripVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { adminMediaService } from "@/services/adminMedia.service";
import { toast } from "sonner";
import { formatBytes, cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PendingFile {
  file: File;
  id: string;
  name: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB mỗi file
const MAX_FILES = 50;

const MediaUploadDialog = ({ open, onClose, onSuccess }: Props) => {
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [mediaType, setMediaType] = useState<"sticker" | "gif">("sticker");
  const [commonName, setCommonName] = useState("");
  const [packKey, setPackKey] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [keywords, setKeywords] = useState("");
  const [phrases, setPhrases] = useState("");
  const [priority, setPriority] = useState("0");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setFiles([]);
    setMediaType("sticker");
    setCommonName("");
    setPackKey("");
    setCategory("");
    setTags("");
    setKeywords("");
    setPhrases("");
    setPriority("0");
    setProgress({ done: 0, total: 0 });
  }, []);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles);
    if (arr.length + files.length > MAX_FILES) {
      toast.error(`Tối đa ${MAX_FILES} file mỗi lần upload`);
      return;
    }
    const valid: PendingFile[] = [];
    for (const f of arr) {
      // Validate MIME
      if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) {
        toast.error(`${f.name}: định dạng không hỗ trợ`);
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name}: vượt quá 10MB`);
        continue;
      }
      valid.push({
        file: f,
        id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
        name: f.name.replace(/\.[^.]+$/, ""),
      });
    }
    setFiles((prev) => [...prev, ...valid]);
    // Tự động đoán mediaType từ file đầu tiên nếu chưa chọn
    if (valid.length > 0 && !mediaType) {
      const isGif = valid[0].file.type === "image/gif";
      if (isGif) setMediaType("gif");
    }
  }, [files.length, mediaType]);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const removeAll = () => setFiles([]);

  const handleUpload = async () => {
    if (!files.length) {
      toast.error("Chọn ít nhất 1 file");
      return;
    }
    setUploading(true);
    setProgress({ done: 0, total: files.length });

    const commonMeta: Record<string, any> = {
      mediaType,
      category: category.trim() || undefined,
      packKey: packKey.trim() || undefined,
      tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
      keywords: keywords.split(",").map((s) => s.trim()).filter(Boolean),
      phrases: phrases.split(",").map((s) => s.trim()).filter(Boolean),
      priority: Number(priority) || 0,
    };

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Upload song song - batch 3 cái/lần để tránh quá tải server
    const BATCH_SIZE = 3;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((pf) =>
          adminMediaService
            .create(pf.file, {
              ...commonMeta,
              name: pf.name.trim() || pf.file.name.replace(/\.[^.]+$/, ""),
            })
            .then(() => ({ ok: true, name: pf.file.name }))
            .catch((e: any) => ({
              ok: false,
              name: pf.file.name,
              msg: e?.response?.data?.message || "Lỗi",
            }))
        )
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.ok) {
          successCount += 1;
        } else {
          errorCount += 1;
          const errInfo =
            r.status === "fulfilled"
              ? r.value
              : { name: "unknown", msg: String(r.reason) };
          errors.push(`${errInfo.name}: ${(errInfo as any).msg || "lỗi"}`);
        }
      }
      setProgress({ done: Math.min(i + BATCH_SIZE, files.length), total: files.length });
    }

    setUploading(false);

    if (successCount > 0) {
      toast.success(
        `Đã upload ${successCount}/${files.length} file${errorCount > 0 ? ` (lỗi: ${errorCount})` : ""}`
      );
    }
    if (errorCount > 0) {
      console.error("Upload errors:", errors);
      if (successCount === 0) {
        toast.error(`Upload thất bại: ${errors[0]}`);
        return;
      }
    }

    reset();
    onSuccess();
  };

  // Xử lý drag & drop
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      addFiles(e.dataTransfer.files);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !uploading) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Sticker / GIF
          </DialogTitle>
          <DialogDescription>
            Hỗ trợ JPEG, PNG, WEBP, GIF. Tối đa {MAX_FILES} file/lần, mỗi file ≤ 10MB.
            Metadata chung sẽ áp dụng cho tất cả file trong batch.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            )}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Kéo thả file hoặc bấm để chọn</p>
            <p className="text-xs text-muted-foreground mt-1">
              Có thể chọn nhiều file cùng lúc
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
              className="hidden"
            />
          </div>

          {/* Danh sách file đã chọn */}
          {files.length > 0 && (
            <div className="border rounded-lg">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                <span className="text-xs font-medium">
                  {files.length} file đã chọn
                </span>
                <button
                  type="button"
                  onClick={removeAll}
                  className="text-xs text-destructive hover:underline"
                >
                  Xoá tất cả
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {files.map((pf) => (
                  <div
                    key={pf.id}
                    className="flex items-center gap-2 px-3 py-1.5 border-b last:border-b-0 hover:bg-muted/20"
                  >
                    <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                    <FileImage className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Input
                        value={pf.name}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFiles((prev) =>
                            prev.map((f) => (f.id === pf.id ? { ...f, name: v } : f))
                          );
                        }}
                        className="h-7 text-xs"
                        placeholder="Tên sticker"
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatBytes(pf.file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(pf.id)}
                      className="p-1 hover:bg-destructive/10 rounded shrink-0"
                    >
                      <X className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata chung */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium">Loại</label>
              <div className="flex gap-1 mt-1">
                <Button
                  type="button"
                  variant={mediaType === "sticker" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMediaType("sticker")}
                  className="flex-1 h-8"
                >
                  Sticker
                </Button>
                <Button
                  type="button"
                  variant={mediaType === "gif" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMediaType("gif")}
                  className="flex-1 h-8"
                >
                  GIF
                </Button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">Pack key (nhóm)</label>
              <Input
                value={packKey}
                onChange={(e) => setPackKey(e.target.value)}
                placeholder="vd: hello-2024, cats, ..."
                className="mt-1 h-8 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium">Category</label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="happy, sad, love..."
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Priority (-100 → 100)</label>
              <Input
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                placeholder="0"
                className="mt-1 h-8 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium">Tags (CSV - 1-2 từ ngắn)</label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="vui, cuoi, hello, sinhnhat"
              className="mt-1 h-8 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium">Keywords EN (CSV)</label>
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="happy, fun, joy"
              className="mt-1 h-8 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium">Phrases VN (CSV - cụm nhiều từ)</label>
            <Input
              value={phrases}
              onChange={(e) => setPhrases(e.target.value)}
              placeholder="chuc mung sinh nhat, di choi, ..."
              className="mt-1 h-8 text-sm"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Giúp match khi user gõ cả cụm từ dài
            </p>
          </div>
        </div>

        {/* Progress */}
        {uploading && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Đang upload...</span>
              <span>
                {progress.done}/{progress.total}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={uploading}
          >
            Huỷ
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !files.length}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {progress.done}/{progress.total}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload {files.length} file
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MediaUploadDialog;
