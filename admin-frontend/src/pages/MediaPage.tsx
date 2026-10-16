// MediaPage v2 — quản lý Sticker & GIF
// Tách thành 2 tab riêng: Sticker (bộ) và GIF (lẻ)
// Bulk upload hỗ trợ nhiều file
// Bộ lọc: mediaType, isActive, search, packKey

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  MoreHorizontal,
  Image as ImageIcon,
  Sticker as StickerIcon,
  Upload,
  Power,
  Pencil,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Loader2,
  Package,
  Filter,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { adminMediaService } from "@/services/adminMedia.service";
import { formatBytes, cn } from "@/lib/utils";
import { toast } from "sonner";
import type { MediaAsset } from "@/types";
import { Input } from "@/components/ui/input";
import MediaEditDialog from "@/components/media/MediaEditDialog";
import MediaUploadDialog from "@/components/media/MediaUploadDialog";

type MediaTypeFilter = "sticker" | "gif";
type StatusFilter = "all" | "active" | "inactive";

const MediaPage = () => {
  const [mainTab, setMainTab] = useState<MediaTypeFilter>("sticker");
  const [params, setParams] = useState({
    page: 1,
    limit: 24,
    mediaType: "sticker" as MediaTypeFilter,
    isActive: undefined as boolean | undefined,
    search: "",
    packKey: undefined as string | undefined,
  });
  const [data, setData] = useState<{ items: MediaAsset[]; total: number }>({
    items: [],
    total: 0,
  });
  const [packStats, setPackStats] = useState<Array<{ packKey: string; count: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [editTarget, setEditTarget] = useState<MediaAsset | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<MediaAsset | null>(null);
  const [confirmHardDelete, setConfirmHardDelete] = useState<MediaAsset | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminMediaService.list({
        page: params.page,
        limit: params.limit,
        mediaType: params.mediaType,
        isActive: params.isActive,
        search: params.search || undefined,
      });
      setData({ items: res.items, total: res.total });
      // Tổng hợp packKey cho tab sticker
      if (params.mediaType === "sticker") {
        const packMap = new Map<string, number>();
        for (const it of res.items) {
          const k = (it as any).packKey || "(không có)";
          packMap.set(k, (packMap.get(k) || 0) + 1);
        }
        // Lấy hết các pack qua nhiều page (giới hạn 100 để tránh query nặng)
        const more = await adminMediaService
          .list({ page: 1, limit: 100, mediaType: "sticker" })
          .catch(() => null);
        if (more) {
          for (const it of more.items) {
            const k = (it as any).packKey || "(không có)";
            packMap.set(k, (packMap.get(k) || 0) + 1);
          }
        }
        setPackStats(
          Array.from(packMap.entries())
            .map(([packKey, count]) => ({ packKey, count }))
            .sort((a, b) => b.count - a.count)
        );
      } else {
        setPackStats([]);
      }
    } catch (e: any) {
      toast.error("Không tải được danh sách");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Khi đổi main tab → reset filter
  useEffect(() => {
    setParams((p) => ({ ...p, page: 1, mediaType: mainTab, packKey: undefined }));
    setSearchInput("");
  }, [mainTab]);

  const columns: DataTableColumn<MediaAsset>[] = [
    {
      id: "preview",
      header: "Preview",
      className: "w-16",
      cell: (m) => (
        <div className="h-12 w-12 rounded border bg-muted overflow-hidden flex items-center justify-center">
          <img
            src={m.thumbnailUrl || m.url}
            alt={m.name}
            className="h-full w-full object-contain"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      ),
    },
    {
      id: "name",
      header: "Tên",
      cell: (m) => (
        <div className="min-w-0">
          <p className="font-medium text-sm truncate max-w-[200px]">{m.name}</p>
          <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
            {m.storageKey?.split("/").pop()}
          </p>
        </div>
      ),
    },
    {
      id: "type",
      header: "Loại",
      className: "w-20",
      cell: (m) => (
        <Badge
          variant={m.mediaType === "gif" ? "default" : "secondary"}
          className="text-[10px]"
        >
          {m.mediaType === "gif" ? (
            <ImageIcon className="h-3 w-3 mr-0.5" />
          ) : (
            <StickerIcon className="h-3 w-3 mr-0.5" />
          )}
          {m.mediaType}
        </Badge>
      ),
    },
    {
      id: "pack",
      header: "Pack",
      className: "hidden md:table-cell",
      cell: (m) => {
        const packKey = (m as any).packKey;
        return packKey ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setParams((p) => ({ ...p, page: 1, packKey }));
            }}
            className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700 hover:bg-purple-100"
          >
            <Package className="h-3 w-3 inline mr-1" />
            {packKey}
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
    {
      id: "category",
      header: "Category",
      className: "hidden lg:table-cell",
      cell: (m) => (
        <span className="text-xs text-muted-foreground">
          {m.category || "—"}
        </span>
      ),
    },
    {
      id: "tags",
      header: "Tags",
      className: "hidden xl:table-cell",
      cell: (m) => (
        <div className="flex flex-wrap gap-1 max-w-[220px]">
          {m.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="text-[10px] px-1.5 py-0.5 rounded bg-muted"
            >
              {t}
            </span>
          ))}
          {m.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground">
              +{m.tags.length - 3}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "size",
      header: "Size",
      className: "hidden md:table-cell w-20",
      cell: (m) => (
        <span className="text-xs text-muted-foreground">
          {formatBytes(m.fileSize)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Trạng thái",
      className: "w-24",
      cell: (m) =>
        m.isActive ? (
          <Badge variant="success" className="text-[10px]">
            Active
          </Badge>
        ) : (
          <Badge variant="muted" className="text-[10px]">
            Off
          </Badge>
        ),
    },
    {
      id: "actions",
      header: "",
      className: "w-12 text-right",
      cell: (m) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => window.open(m.url, "_blank")}>
              <ExternalLink className="h-4 w-4" /> Mở file
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditTarget(m)}>
              <Pencil className="h-4 w-4" /> Sửa metadata
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await adminMediaService.setActive(m._id, !m.isActive);
                  toast.success(m.isActive ? "Đã tắt" : "Đã bật");
                  fetchData();
                } catch {
                  toast.error("Lỗi");
                }
              }}
            >
              <Power className="h-4 w-4" /> {m.isActive ? "Tắt" : "Bật"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setConfirmDelete(m)}>
              <Trash2 className="h-4 w-4" /> Tắt (soft)
            </DropdownMenuItem>
            <DropdownMenuItem
              destructive
              onClick={() => setConfirmHardDelete(m)}
            >
              <Trash2 className="h-4 w-4" /> Xoá vĩnh viễn
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sticker & GIF"
        description={`${data.total} asset đang hiển thị`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={fetchData}>
              Làm mới
            </Button>
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4" /> Upload
            </Button>
          </>
        }
      />

      <Tabs
        value={mainTab}
        onValueChange={(v) => setMainTab(v as MediaTypeFilter)}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="sticker" className="gap-1.5">
            <StickerIcon className="h-4 w-4" />
            Sticker (bộ)
          </TabsTrigger>
          <TabsTrigger value="gif" className="gap-1.5">
            <ImageIcon className="h-4 w-4" />
            GIF (lẻ)
          </TabsTrigger>
        </TabsList>

        <TabsContent value={mainTab} className="space-y-3 mt-3">
          {/* Pack stats cho sticker */}
          {mainTab === "sticker" && packStats.length > 0 && (
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">Bộ sticker ({packStats.length})</span>
                {params.packKey && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setParams((p) => ({ ...p, page: 1, packKey: undefined }))}
                    className="h-6 text-[10px] px-2"
                  >
                    Bỏ lọc: {params.packKey}
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {packStats.slice(0, 12).map((p) => (
                  <button
                    key={p.packKey}
                    onClick={() =>
                      setParams((prev) => ({
                        ...prev,
                        page: 1,
                        packKey: p.packKey === "(không có)" ? undefined : p.packKey,
                      }))
                    }
                    className={cn(
                      "text-[10px] px-2 py-1 rounded border transition-colors",
                      params.packKey === p.packKey
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 hover:bg-muted"
                    )}
                  >
                    {p.packKey} · {p.count}
                  </button>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-0">
            <DataTable
              columns={columns}
              data={data.items}
              total={data.total}
              page={params.page}
              pageSize={params.limit}
              isLoading={loading}
              searchValue={searchInput}
              onSearchChange={(v) => {
                setSearchInput(v);
                setParams((p) => ({ ...p, page: 1, search: v }));
              }}
              searchPlaceholder="Tìm theo tên, tag, keyword..."
              onPageChange={(p) => setParams((prev) => ({ ...prev, page: p }))}
              rowKey={(m) => m._id}
              toolbar={
                <Select
                  value={
                    params.isActive === undefined
                      ? "all"
                      : params.isActive
                      ? "active"
                      : "inactive"
                  }
                  onValueChange={(v) =>
                    setParams((p) => ({
                      ...p,
                      page: 1,
                      isActive: v === "all" ? undefined : v === "active",
                    }))
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
          </Card>
        </TabsContent>
      </Tabs>

      <MediaEditDialog
        asset={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={() => {
          setEditTarget(null);
          fetchData();
        }}
      />
      <MediaUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => {
          setUploadOpen(false);
          fetchData();
        }}
      />
      <ConfirmDeleteDialog
        asset={confirmDelete}
        title="Tắt asset?"
        description="Asset sẽ không xuất hiện trong gợi ý và picker. Tin nhắn cũ vẫn render nếu file còn tồn tại trên storage."
        onConfirm={async (asset) => {
          await adminMediaService.softDelete(asset._id);
          toast.success("Đã tắt asset");
        }}
        onClose={() => setConfirmDelete(null)}
        onSuccess={() => {
          setConfirmDelete(null);
          fetchData();
        }}
      />
      <ConfirmDeleteDialog
        asset={confirmHardDelete}
        title="Xoá vĩnh viễn?"
        description="Asset sẽ bị xoá khỏi DB và storage. KHÔNG THỂ khôi phục. Tin nhắn cũ sẽ mất ảnh."
        confirmText="XÓA"
        variant="destructive"
        onConfirm={async (asset) => {
          await adminMediaService.hardDelete(asset._id);
          toast.success("Đã xoá vĩnh viễn");
        }}
        onClose={() => setConfirmHardDelete(null)}
        onSuccess={() => {
          setConfirmHardDelete(null);
          fetchData();
        }}
      />
    </div>
  );
};

const ConfirmDeleteDialog = ({
  asset,
  onClose,
  onSuccess,
  onConfirm,
  title,
  description,
  confirmText,
  variant = "default",
}: {
  asset: MediaAsset | null;
  onClose: () => void;
  onSuccess: () => void;
  onConfirm: (a: MediaAsset) => Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  variant?: "default" | "destructive";
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  if (!asset) return null;

  const handleDelete = async () => {
    if (confirmText && confirmInput !== confirmText) {
      toast.error(`Nhập "${confirmText}" để xác nhận`);
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(asset);
      onSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Lỗi");
    } finally {
      setSubmitting(false);
      setConfirmInput("");
    }
  };

  return (
    <Dialog open={!!asset} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {confirmText && (
            <>
              <p className="text-xs text-muted-foreground">
                Nhập <code className="px-1 rounded bg-muted">{confirmText}</code> để xác nhận
              </p>
              <Input
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={`Nhập "${confirmText}"`}
                className="font-mono"
              />
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Huỷ
          </Button>
          <Button
            variant={variant}
            onClick={handleDelete}
            disabled={submitting || (!!confirmText && confirmInput !== confirmText)}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MediaPage;
