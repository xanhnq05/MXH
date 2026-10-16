// NotificationsPage — gửi thông báo từ admin + lịch sử
// Có 3 tab: Broadcast (toàn bộ), Targeted (chọn user), Filter (country, banned,...)
// + tab Lịch sử

import { useEffect, useState, useCallback } from "react";
import {
  Send,
  Megaphone,
  Users,
  Filter,
  History,
  AlertCircle,
  AlertTriangle,
  Gift,
  Wrench,
  Plus,
  Loader2,
  Trash2,
  Eye,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { adminUsersService } from "@/services/adminUsers.service";
import {
  adminNotificationsService,
  type AdminNotificationType,
  type NotificationCampaign,
  type CampaignRecipient,
} from "@/services/adminNotifications.service";
import { initials, formatDate } from "@/lib/utils";
import type { AdminUser } from "@/types";

const TYPE_META: Record<
  AdminNotificationType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; description: string }
> = {
  admin_announcement: {
    label: "Thông báo chung",
    icon: Megaphone,
    color: "text-blue-500",
    description: "Thông báo tới toàn bộ người dùng (VD: chào mừng, cập nhật tính năng)",
  },
  admin_warning: {
    label: "Cảnh báo",
    icon: AlertTriangle,
    color: "text-yellow-500",
    description: "Cảnh báo vi phạm, nhắc nhở",
  },
  admin_promo: {
    label: "Khuyến mãi",
    icon: Gift,
    color: "text-pink-500",
    description: "Mã giảm giá, ưu đãi, sự kiện",
  },
  admin_maintenance: {
    label: "Bảo trì",
    icon: Wrench,
    color: "text-orange-500",
    description: "Thông báo bảo trì hệ thống",
  },
};

// =============== Sub-component: Form gửi ===============
type SendFormProps = {
  mode: "broadcast" | "targeted" | "filter";
  onSuccess?: () => void;
};

const SendForm = ({ mode, onSuccess }: SendFormProps) => {
  const [type, setType] = useState<AdminNotificationType>("admin_announcement");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");

  // Targeted
  const [userIds, setUserIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<AdminUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<AdminUser[]>([]);

  // Filter
  const [country, setCountry] = useState("");
  const [includeBanned, setIncludeBanned] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setType("admin_announcement");
    setTitle("");
    setMessage("");
    setLink("");
    setUserIds([]);
    setUserSearch("");
    setSearchResults([]);
    setSelectedUsers([]);
    setCountry("");
    setIncludeBanned(false);
  };

  // Search users (debounced) cho chế độ targeted
  useEffect(() => {
    if (mode !== "targeted") return;
    if (!userSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await adminUsersService.list({
          search: userSearch.trim(),
          limit: 10,
          page: 1,
        });
        // Lọc bỏ những user đã chọn
        setSearchResults(
          res.items.filter(
            (u) => !selectedUsers.find((s) => s._id === u._id)
          )
        );
      } catch (e) {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [userSearch, mode, selectedUsers]);

  const addUser = (u: AdminUser) => {
    if (selectedUsers.find((s) => s._id === u._id)) return;
    setSelectedUsers((prev) => [...prev, u]);
    setUserIds((prev) => [...prev, u._id]);
    setSearchResults((prev) => prev.filter((r) => r._id !== u._id));
    setUserSearch("");
  };

  const removeUser = (id: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u._id !== id));
    setUserIds((prev) => prev.filter((uid) => uid !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Vui lòng nhập tiêu đề và nội dung");
      return;
    }
    if (mode === "targeted" && userIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 người dùng");
      return;
    }

    let confirmMsg = "";
    if (mode === "broadcast") {
      confirmMsg = "Gửi thông báo tới TẤT CẢ người dùng?";
    } else if (mode === "targeted") {
      confirmMsg = `Gửi thông báo tới ${userIds.length} người dùng đã chọn?`;
    } else {
      confirmMsg = `Gửi thông báo tới user khớp filter?`;
    }

    if (!confirm(confirmMsg)) return;

    setSubmitting(true);
    try {
      const payload = {
        type,
        title: title.trim(),
        message: message.trim(),
        link: link.trim() || undefined,
      };

      let res;
      if (mode === "broadcast") {
        res = await adminNotificationsService.broadcast(payload);
      } else if (mode === "targeted") {
        res = await adminNotificationsService.targeted({ ...payload, userIds });
      } else {
        const filter: any = {};
        if (country.trim()) filter.country = country.trim();
        if (includeBanned) filter.isBanned = true;
        res = await adminNotificationsService.sendByFilter({ ...payload, filter });
      }

      toast.success(res.message);
      reset();
      onSuccess?.();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gửi thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const TypeCard = ({ value }: { value: AdminNotificationType }) => {
    const meta = TYPE_META[value];
    const Icon = meta.icon;
    const active = type === value;
    return (
      <button
        type="button"
        onClick={() => setType(value)}
        className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
          active
            ? "border-primary bg-primary/5 ring-1 ring-primary"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        }`}
      >
        <Icon className={`h-5 w-5 mt-0.5 ${meta.color}`} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm">{meta.label}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{meta.description}</p>
        </div>
      </button>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type */}
      <div>
        <label className="text-sm font-medium">Loại thông báo</label>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
          {(Object.keys(TYPE_META) as AdminNotificationType[]).map((k) => (
            <TypeCard key={k} value={k} />
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="text-sm font-medium">Tiêu đề *</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="VD: Chào mừng bạn đến với GreenX!"
          className="mt-1"
          maxLength={120}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">{title.length}/120</p>
      </div>

      {/* Message */}
      <div>
        <label className="text-sm font-medium">Nội dung *</label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Nhập nội dung thông báo..."
          className="mt-1 min-h-30"
          maxLength={1000}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">{message.length}/1000</p>
      </div>

      {/* Link */}
      <div>
        <label className="text-sm font-medium">Link (tuỳ chọn)</label>
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://... hoặc /posts/abc"
          className="mt-1"
        />
      </div>

      {/* Targeted mode - chọn user */}
      {mode === "targeted" && (
        <div>
          <label className="text-sm font-medium">
            Chọn người nhận ({selectedUsers.length} đã chọn)
          </label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Tìm theo username, email, tên..."
              className="pl-9"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}

            {searchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-64 overflow-y-auto">
                {searchResults.map((u) => (
                  <button
                    type="button"
                    key={u._id}
                    onClick={() => addUser(u)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-left"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={u.avatarUrl} />
                      <AvatarFallback>{initials(u.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{u.username} · {u.email}
                      </p>
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedUsers.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedUsers.map((u) => (
                <Badge key={u._id} variant="secondary" className="pl-1.5 pr-1 py-0.5 gap-1">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={u.avatarUrl} />
                    <AvatarFallback>{initials(u.displayName)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{u.displayName}</span>
                  <button
                    type="button"
                    onClick={() => removeUser(u._id)}
                    className="ml-0.5 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter mode */}
      {mode === "filter" && (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Quốc gia (để trống = tất cả)</label>
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="VD: Vietnam, USA, ..."
              className="mt-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="include-banned"
              checked={includeBanned}
              onChange={(e) => setIncludeBanned(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="include-banned" className="text-sm">
              Bao gồm cả user đang bị cấm
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Nếu không chọn gì, sẽ gửi tới tất cả user active.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" onClick={reset}>
          <Trash2 className="h-4 w-4" /> Xoá form
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Gửi thông báo
        </Button>
      </div>
    </form>
  );
};

// =============== Sub-component: Lịch sử ===============
const HistoryList = () => {
  const [data, setData] = useState<NotificationCampaign[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [selectedCampaign, setSelectedCampaign] = useState<NotificationCampaign | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<NotificationCampaign | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminNotificationsService.history({ page, limit: 20 });
      setData(res.items);
      setTotal(res.total);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Không tải được lịch sử");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="space-y-3">
      {loading && data.length === 0 ? (
        <div className="flex justify-center p-8">
          <Spinner />
        </div>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <History className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="font-medium">Chưa có thông báo nào được gửi</p>
            <p className="text-xs text-muted-foreground mt-1">
              Các thông báo bạn gửi sẽ hiển thị tại đây
            </p>
          </CardContent>
        </Card>
      ) : (
        data.map((c) => {
          const meta = TYPE_META[c.type as AdminNotificationType] || TYPE_META.admin_announcement;
          const Icon = meta.icon;
          return (
            <Card key={c._id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 mt-1 ${meta.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-semibold truncate">{c.title}</p>
                      <Badge variant="muted" className="text-[10px]">
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {c.message}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>📨 {c.recipientCount} người nhận</span>
                      <span>·</span>
                      <span>{formatDate(c.sentAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCampaign(c)}
                    >
                      <Eye className="h-4 w-4" /> Chi tiết
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingCampaign(c)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Xóa thông báo này khỏi tất cả user"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {total > 20 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page} / {Math.ceil(total / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page * 20 >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </Button>
        </div>
      )}

      <CampaignDetailDialog
        campaign={selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
      />

      <DeleteCampaignDialog
        campaign={deletingCampaign}
        onClose={() => setDeletingCampaign(null)}
        onDeleted={() => {
          setDeletingCampaign(null);
          fetchHistory();
        }}
      />
    </div>
  );
};

// =============== Dialog xem chi tiết campaign ===============
const CampaignDetailDialog = ({
  campaign,
  onClose,
}: {
  campaign: NotificationCampaign | null;
  onClose: () => void;
}) => {
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!campaign) return;
    setPage(1);
  }, [campaign]);

  useEffect(() => {
    if (!campaign) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await adminNotificationsService.campaignDetail({
          type: campaign.type,
          title: campaign.title,
          message: campaign.message,
          link: campaign.link || "",
          sentAt: campaign.sentAt,
          page,
          limit: 50,
        });
        setRecipients(res.items);
        setTotal(res.total);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || "Lỗi tải danh sách");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [campaign, page]);

  return (
    <Dialog open={!!campaign} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate">{campaign?.title}</DialogTitle>
          <DialogDescription className="truncate">{campaign?.message}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Badge variant="muted">
            {campaign ? TYPE_META[campaign.type as AdminNotificationType]?.label : ""}
          </Badge>
          <span>{total} người nhận</span>
          {campaign && <span>{formatDate(campaign.sentAt)}</span>}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 border rounded-md">
          {loading && recipients.length === 0 ? (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          ) : recipients.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Không có dữ liệu
            </div>
          ) : (
            <ul className="divide-y">
              {recipients.map((r) => {
                const u = r.recipientId;
                if (!u || typeof u === "string") return null;
                return (
                  <li key={r._id} className="flex items-center gap-2 p-2 px-3">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={u.avatarUrl} />
                      <AvatarFallback>{initials(u.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                    </div>
                    {r.isRead ? (
                      <Badge variant="muted" className="text-[10px]">
                        Đã đọc
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="text-[10px]">
                        Chưa đọc
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {total > 50 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Trước
            </Button>
            <span className="text-xs text-muted-foreground">
              Trang {page} / {Math.ceil(total / 50)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 50 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// =============== Dialog xóa campaign ===============
const DeleteCampaignDialog = ({
  campaign,
  onClose,
  onDeleted,
}: {
  campaign: NotificationCampaign | null;
  onClose: () => void;
  onDeleted: () => void;
}) => {
  const [counts, setCounts] = useState<{ total: number; unread: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  // Reset khi campaign thay đổi
  useEffect(() => {
    if (!campaign) {
      setCounts(null);
      setConfirmText("");
      return;
    }
    setLoading(true);
    setConfirmText("");
    adminNotificationsService
      .campaignCount({
        type: campaign.type,
        title: campaign.title,
        message: campaign.message,
        link: campaign.link || "",
        sentAt: campaign.sentAt,
      })
      .then(setCounts)
      .catch((e) => {
        toast.error(e?.response?.data?.message || "Không tải được thông tin");
      })
      .finally(() => setLoading(false));
  }, [campaign]);

  const handleDelete = async () => {
    if (!campaign || !counts) return;
    if (confirmText !== "XÓA") {
      toast.error('Vui lòng nhập chính xác "XÓA" để xác nhận');
      return;
    }
    setDeleting(true);
    try {
      const res = await adminNotificationsService.deleteCampaign({
        type: campaign.type,
        title: campaign.title,
        message: campaign.message,
        link: campaign.link || "",
        sentAt: campaign.sentAt,
      });
      toast.success(res.message);
      onDeleted();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Xóa thất bại");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={!!campaign} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Xóa thông báo
          </DialogTitle>
          <DialogDescription>
            Hành động này sẽ xóa thông báo khỏi tất cả người dùng. Không thể hoàn tác.
          </DialogDescription>
        </DialogHeader>

        {campaign && (
          <div className="space-y-4">
            {/* Thông tin campaign */}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <p className="text-sm font-medium truncate">{campaign.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {campaign.message}
              </p>
            </div>

            {/* Stats */}
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Spinner />
              </div>
            ) : counts ? (
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-md border bg-card p-3">
                  <p className="text-2xl font-bold">{counts.total}</p>
                  <p className="text-xs text-muted-foreground">Tổng thông báo</p>
                </div>
                <div className="rounded-md border bg-card p-3">
                  <p className="text-2xl font-bold text-orange-500">{counts.unread}</p>
                  <p className="text-xs text-muted-foreground">Chưa đọc</p>
                </div>
              </div>
            ) : null}

            {/* Confirm input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nhập <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">XÓA</code> để xác nhận
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder='Nhập "XÓA"'
                className="font-mono"
                autoComplete="off"
              />
            </div>

            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive flex items-start gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Tất cả <strong>{counts?.total || campaign.recipientCount}</strong> người dùng sẽ bị xóa thông báo này khỏi danh sách. Hành động sẽ được ghi vào audit log.
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Huỷ
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || loading || confirmText !== "XÓA"}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Xóa vĩnh viễn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// =============== Main Page ===============
const NotificationsPage = () => {
  const [activeTab, setActiveTab] = useState<"broadcast" | "targeted" | "filter" | "history">(
    "broadcast"
  );
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Gửi thông báo"
        description="Gửi thông báo tới người dùng từ hệ thống Admin"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <Megaphone className="h-8 w-8 text-blue-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Toàn bộ</p>
              <p className="text-sm font-semibold">Broadcast</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tới tất cả user active
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <Users className="h-8 w-8 text-green-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Cá nhân</p>
              <p className="text-sm font-semibold">Targeted</p>
              <p className="text-xs text-muted-foreground mt-1">
                Chọn user cụ thể
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <Filter className="h-8 w-8 text-purple-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Theo điều kiện</p>
              <p className="text-sm font-semibold">Filter</p>
              <p className="text-xs text-muted-foreground mt-1">
                Country, banned, ...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Soạn thông báo
          </CardTitle>
          <CardDescription>
            Thông báo sẽ được gửi realtime tới user qua socket và lưu trong lịch sử thông báo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="broadcast">
                <Megaphone className="h-3.5 w-3.5 mr-1" /> Toàn bộ
              </TabsTrigger>
              <TabsTrigger value="targeted">
                <Users className="h-3.5 w-3.5 mr-1" /> Cá nhân
              </TabsTrigger>
              <TabsTrigger value="filter">
                <Filter className="h-3.5 w-3.5 mr-1" /> Theo filter
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-3.5 w-3.5 mr-1" /> Lịch sử
              </TabsTrigger>
            </TabsList>

            <TabsContent value="broadcast" className="mt-4">
              <div className="mb-3 p-3 rounded-md bg-blue-500/10 border border-blue-500/20 text-sm text-blue-700 dark:text-blue-400 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <strong>Chế độ Broadcast:</strong> Thông báo sẽ được gửi tới TẤT CẢ user đang
                  hoạt động. Hành động này sẽ được ghi vào audit log.
                </div>
              </div>
              <SendForm
                key={`broadcast-${refreshKey}`}
                mode="broadcast"
                onSuccess={() => setRefreshKey((k) => k + 1)}
              />
            </TabsContent>

            <TabsContent value="targeted" className="mt-4">
              <SendForm
                key={`targeted-${refreshKey}`}
                mode="targeted"
                onSuccess={() => setRefreshKey((k) => k + 1)}
              />
            </TabsContent>

            <TabsContent value="filter" className="mt-4">
              <SendForm
                key={`filter-${refreshKey}`}
                mode="filter"
                onSuccess={() => setRefreshKey((k) => k + 1)}
              />
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <HistoryList key={refreshKey} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsPage;
