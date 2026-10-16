// MediaEditDialog — sửa metadata
import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminMediaService } from "@/services/adminMedia.service";
import { toast } from "sonner";
import type { MediaAsset } from "@/types";
import { formatBytes } from "@/lib/utils";

interface Props {
  asset: MediaAsset | null;
  onClose: () => void;
  onSuccess: () => void;
}

const MediaEditDialog = ({ asset, onClose, onSuccess }: Props) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [keywords, setKeywords] = useState("");
  const [priority, setPriority] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (asset) {
      setName(asset.name || "");
      setCategory(asset.category || "");
      setTags((asset.tags || []).join(", "));
      setKeywords((asset.keywords || []).join(", "));
      setPriority(asset.priority || 0);
    }
  }, [asset]);

  if (!asset) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminMediaService.update(asset._id, {
        name: name.trim(),
        category: category.trim(),
        tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
        keywords: keywords.split(",").map((s) => s.trim()).filter(Boolean),
        priority,
      });
      toast.success("Đã lưu");
      onSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Lỗi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Sửa asset</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <img
            src={asset.thumbnailUrl || asset.url}
            alt=""
            className="h-16 w-16 object-contain rounded border bg-muted"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">
              {asset.mimeType} · {formatBytes(asset.fileSize)}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {asset.storageKey}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Tên</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Category</label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Tags (CSV)</label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="vui, cười, happy"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Keywords (CSV)</label>
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="happy, fun, joy"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Priority</label>
            <Input
              type="number"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Huỷ
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MediaEditDialog;
