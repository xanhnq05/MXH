// AdminMediaPage — quản lý sticker + GIF đã upload.
// Layout: header + filter/search + table/list với thumbnail.
// Modal edit, dialog confirm delete (soft + hard).

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import {
  Search,
  Filter,
  Image as ImageIcon,
  Sticker as StickerIcon,
  Loader2,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  Power,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { adminMediaService, type MediaAsset, type MediaListParams } from "@/services/admin.service";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PAGE_SIZE = 20;

const formatBytes = (bytes: number) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const AdminMediaPage = () => {
  const [params, setParams] = useState<MediaListParams>({
    page: 1,
    limit: PAGE_SIZE,
  });
  const [data, setData] = useState<{
    items: MediaAsset[];
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMeta, setUploadMeta] = useState({
    name: "",
    mediaType: "gif" as "gif" | "sticker",
    category: "",
    description: "",
  });
  const [confirmDelete, setConfirmDelete] = useState<MediaAsset | null>(null);
  const [confirmHardDelete, setConfirmHardDelete] = useState<MediaAsset | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminMediaService.list(params);
      setData({ items: res.items, total: res.total });
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 403) {
        setError("Bạn không có quyền truy cập chức năng quản trị.");
      } else if (status === 401) {
        setError("Vui lòng đăng nhập lại.");
      } else {
        setError(e?.response?.data?.message || "Không tải được dữ liệu");
      }
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const handleSearch = () => {
    setParams((p) => ({ ...p, page: 1, search: search.trim() || undefined }));
  };

  const handleFilter = (patch: Partial<MediaListParams>) => {
    setParams((p) => ({ ...p, page: 1, ...patch }));
  };

  const handleToggleActive = async (a: MediaAsset) => {
    try {
      await adminMediaService.setActive(a._id, !a.isActive);
      toast.success(a.isActive ? "Đã tắt" : "Đã bật");
      fetchData();
    } catch {
      toast.error("Không thể cập nhật");
    }
  };

  const handleSoftDelete = async () => {
    if (!confirmDelete) return;
    try {
      await adminMediaService.softDelete(confirmDelete._id);
      toast.success("Đã tắt asset");
      setConfirmDelete(null);
      fetchData();
    } catch {
      toast.error("Không thể xoá");
    }
  };

  const handleHardDelete = async () => {
    if (!confirmHardDelete) return;
    try {
      await adminMediaService.hardDelete(confirmHardDelete._id);
      toast.success("Đã xoá vĩnh viễn");
      setConfirmHardDelete(null);
      fetchData();
    } catch {
      toast.error("Không thể xoá");
    }
  };

  const handleSaveEdit = async (patch: Partial<MediaAsset>) => {
    if (!editing) return;
    try {
      await adminMediaService.update(editing._id, patch);
      toast.success("Đã lưu");
      setEditing(null);
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Không thể lưu");
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error("Chọn file trước");
      return;
    }
    setUploading(true);
    try {
      await adminMediaService.create(uploadFile, uploadMeta);
      toast.success("Đã upload");
      setUploadFile(null);
      setUploadMeta({ name: "", mediaType: "gif", category: "", description: "" });
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Upload thất bại");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý Media</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sticker &amp; GIF đã upload lên hệ thống.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground hidden md:inline-flex items-center gap-1"
          >
            Về trang chủ <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setUploadFile(null);
              setUploadMeta({ name: "", mediaType: "gif", category: "", description: "" });
              // Trigger upload modal via a small state
              document.getElementById("upload-trigger")?.click();
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Upload
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchData}
            title="Làm mới"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter row */}
      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(v: string) => setSearch(v)}
            onKeyDown={(e: any) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="Tìm theo tên, tag, keyword..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <FilterPill
            label="Tất cả"
            active={!params.mediaType}
            onClick={() => handleFilter({ mediaType: undefined })}
          />
          <FilterPill
            label="GIF"
            icon={<ImageIcon className="h-3.5 w-3.5" />}
            active={params.mediaType === "gif"}
            onClick={() => handleFilter({ mediaType: "gif" })}
          />
          <FilterPill
            label="Sticker"
            icon={<StickerIcon className="h-3.5 w-3.5" />}
            active={params.mediaType === "sticker"}
            onClick={() => handleFilter({ mediaType: "sticker" })}
          />
          <FilterPill
            label="Active"
            active={params.isActive === true}
            onClick={() => handleFilter({ isActive: params.isActive === true ? undefined : true })}
          />
          <FilterPill
            label="Inactive"
            active={params.isActive === false}
            onClick={() => handleFilter({ isActive: params.isActive === false ? undefined : false })}
          />
        </div>
      </div>

      {/* Content */}
      {error ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
          <AlertCircle className="h-10 w-10 text-destructive mb-2" />
          <p className="font-medium">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchData}>
            Thử lại
          </Button>
        </div>
      ) : loading && !data ? (
        <div className="flex items-center justify-center flex-1 text-muted-foreground">
          <Spinner className="mr-2" /> Đang tải...
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground text-center p-8">
          <ImageIcon className="h-10 w-10 opacity-40 mb-2" />
          <p className="font-medium">Chưa có media nào</p>
          <p className="text-xs mt-1">Upload asset đầu tiên để bắt đầu.</p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr className="text-left">
                  <th className="p-3 w-16">Preview</th>
                  <th className="p-3">Tên</th>
                  <th className="p-3 hidden md:table-cell">Loại</th>
                  <th className="p-3 hidden lg:table-cell">Category</th>
                  <th className="p-3 hidden lg:table-cell">Tags</th>
                  <th className="p-3 hidden md:table-cell">Size</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3 w-32 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((a) => (
                  <tr key={a._id} className="border-t hover:bg-muted/30">
                    <td className="p-2">
                      <div className="h-12 w-12 rounded bg-muted overflow-hidden flex items-center justify-center">
                        <img
                          src={a.thumbnailUrl || a.url}
                          alt={a.name}
                          className="h-full w-full object-contain"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    </td>
                    <td className="p-3">
                      <p className="font-medium truncate max-w-[200px]">{a.name}</p>
                      {a.isLegacy && (
                        <Badge variant="outline" className="text-[10px] mt-0.5">
                          legacy
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-normal"
                      >
                        {a.mediaType}
                      </Badge>
                    </td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground">
                      {a.category || "—"}
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {a.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-muted"
                          >
                            {t}
                          </span>
                        ))}
                        {a.tags.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{a.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">
                      {formatBytes(a.fileSize)}
                    </td>
                    <td className="p-3">
                      {a.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <XCircle className="h-3.5 w-3.5" /> Off
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Sửa"
                          onClick={() => setEditing(a)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={a.isActive ? "Tắt" : "Bật"}
                          onClick={() => handleToggleActive(a)}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          title="Xoá"
                          onClick={() => setConfirmDelete(a)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-3 text-sm">
            <span className="text-muted-foreground">
              {data?.total ?? 0} kết quả · trang {params.page} / {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={!params.page || params.page <= 1 || loading}
                onClick={() => setParams((p) => ({ ...p, page: (p.page || 1) - 1 }))}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!data || (params.page || 1) >= totalPages || loading}
                onClick={() => setParams((p) => ({ ...p, page: (p.page || 1) + 1 }))}
              >
                Sau
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Hidden trigger for upload modal */}
      <button id="upload-trigger" hidden onClick={() => {}} />

      {/* Edit dialog */}
      <EditAssetDialog
        asset={editing}
        onClose={() => setEditing(null)}
        onSave={handleSaveEdit}
      />

      {/* Soft delete confirm */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tắt asset?</DialogTitle>
            <DialogDescription>
              Asset sẽ không xuất hiện trong gợi ý và picker. Tin nhắn cũ vẫn render
              nếu file còn tồn tại trên storage.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Huỷ
            </Button>
            <Button variant="destructive" onClick={handleSoftDelete}>
              Tắt asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hard delete confirm */}
      <Dialog
        open={!!confirmHardDelete}
        onOpenChange={(o) => !o && setConfirmHardDelete(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xoá vĩnh viễn?</DialogTitle>
            <DialogDescription>
              Sẽ xoá file trên storage và không thể phục hồi. Tin nhắn cũ chứa asset
              này sẽ bị hỏng ảnh.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmHardDelete(null)}>
              Huỷ
            </Button>
            <Button variant="destructive" onClick={handleHardDelete}>
              Xoá vĩnh viễn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload modal (controlled separately) */}
      <UploadDialog
        open={uploadFile !== null || uploading}
        onClose={() => {
          if (uploading) return;
          setUploadFile(null);
        }}
        file={uploadFile}
        setFile={setUploadFile}
        meta={uploadMeta}
        setMeta={setUploadMeta}
        onUpload={handleUpload}
        uploading={uploading}
      />
    </div>
  );
};

const FilterPill = ({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "inline-flex items-center gap-1 px-3 h-9 rounded-full text-xs border transition-colors",
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-background text-muted-foreground hover:bg-accent"
    )}
  >
    {icon}
    {label}
  </button>
);

const EditAssetDialog = ({
  asset,
  onClose,
  onSave,
}: {
  asset: MediaAsset | null;
  onClose: () => void;
  onSave: (patch: Partial<MediaAsset>) => Promise<void>;
}) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [keywords, setKeywords] = useState("");
  const [synonyms, setSynonyms] = useState("");
  const [phrases, setPhrases] = useState("");
  const [priority, setPriority] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (asset) {
      setName(asset.name || "");
      setCategory(asset.category || "");
      setTags((asset.tags || []).join(", "));
      setKeywords((asset.keywords || []).join(", "));
      setSynonyms((asset.synonyms || []).join(", "));
      setPhrases((asset.phrases || []).join(", "));
      setPriority(asset.priority || 0);
    }
  }, [asset]);

  if (!asset) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        category: category.trim(),
        tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
        keywords: keywords.split(",").map((s) => s.trim()).filter(Boolean),
        synonyms: synonyms.split(",").map((s) => s.trim()).filter(Boolean),
        phrases: phrases.split(",").map((s) => s.trim()).filter(Boolean),
        priority,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sửa asset</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <img
              src={asset.thumbnailUrl || asset.url}
              alt=""
              className="h-16 w-16 object-contain rounded bg-muted"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">
                {asset.mimeType} · {formatBytes(asset.fileSize)} · {asset.storageKey}
              </p>
              <a
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                Mở file <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <Input
            label="Tên"
            value={name}
            onChange={(v: string) => setName(v)}
            required
          />
          <Input
            label="Category"
            value={category}
            onChange={(v: string) => setCategory(v)}
            hint="VD: happy, sad, love"
          />
          <Input
            label="Tags (CSV)"
            value={tags}
            onChange={(v: string) => setTags(v)}
            hint="VD: vui, cười, happy"
          />
          <Input
            label="Keywords (CSV)"
            value={keywords}
            onChange={(v: string) => setKeywords(v)}
            hint="Từ khoá ngắn, EN/VN"
          />
          <Input
            label="Synonyms (CSV)"
            value={synonyms}
            onChange={(v: string) => setSynonyms(v)}
            hint="Cụm từ tương đương: sn, mừng sn"
          />
          <Input
            label="Phrases (CSV)"
            value={phrases}
            onChange={(v: string) => setPhrases(v)}
            hint="Cụm nhiều từ: chúc mừng sinh nhật"
          />
          <Input
            label="Priority"
            type="number"
            value={priority}
            onChange={(v: string) => setPriority(Number(v) || 0)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const UploadDialog = ({
  open,
  onClose,
  file,
  setFile,
  meta,
  setMeta,
  onUpload,
  uploading,
}: {
  open: boolean;
  onClose: () => void;
  file: File | null;
  setFile: (f: File | null) => void;
  meta: { name: string; mediaType: "gif" | "sticker"; category: string; description: string };
  setMeta: (m: any) => void;
  onUpload: () => void;
  uploading: boolean;
}) => {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload media mới</DialogTitle>
          <DialogDescription>
            Hỗ trợ JPEG, PNG, WEBP, GIF. Tối đa 50MB.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setFile(f);
              if (f && !meta.name) {
                setMeta({ ...meta, name: f.name.replace(/\.[^.]+$/, "") });
              }
            }}
            className="block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:text-primary-foreground file:px-3 file:py-1.5 file:text-xs file:font-medium"
          />
          {file && (
            <p className="text-xs text-muted-foreground">
              {file.name} · {formatBytes(file.size)} · {file.type || "?"}
            </p>
          )}
          <Input
            label="Tên"
            value={meta.name}
            onChange={(v: string) => setMeta({ ...meta, name: v })}
            required
          />
          <div className="flex gap-2">
            <Button
              variant={meta.mediaType === "gif" ? "default" : "outline"}
              size="sm"
              onClick={() => setMeta({ ...meta, mediaType: "gif" })}
              className="flex-1"
            >
              GIF
            </Button>
            <Button
              variant={meta.mediaType === "sticker" ? "default" : "outline"}
              size="sm"
              onClick={() => setMeta({ ...meta, mediaType: "sticker" })}
              className="flex-1"
            >
              Sticker
            </Button>
          </div>
          <Input
            label="Category"
            value={meta.category}
            onChange={(v: string) => setMeta({ ...meta, category: v })}
          />
          <Input
            label="Mô tả (tuỳ chọn)"
            value={meta.description}
            onChange={(v: string) => setMeta({ ...meta, description: v })}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={uploading}>
            Huỷ
          </Button>
          <Button onClick={onUpload} disabled={uploading || !file}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminMediaPage;
