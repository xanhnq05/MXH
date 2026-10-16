// ReportsPage — bảng quản lý report với filter status
import { useEffect, useState, useCallback } from "react";
import {
  Eye,
  MessageCircle,
  Image as ImageIcon,
  FileText,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminReportsService } from "@/services/adminReports.service";
import { formatDate, initials, relativeTime } from "@/lib/utils";
import type { AdminReport, ReportStatus } from "@/types";
import { toast } from "sonner";
import ReportDetailDialog from "@/components/reports/ReportDetailDialog";

const STATUS_LABELS: Record<ReportStatus, { label: string; variant: any }> = {
  open: { label: "Mở", variant: "destructive" },
  reviewing: { label: "Đang xem", variant: "warning" },
  resolved: { label: "Đã xử lý", variant: "success" },
  dismissed: { label: "Bỏ qua", variant: "muted" },
};

const PRIORITY_VARIANT: Record<string, any> = {
  low: "muted",
  normal: "outline",
  high: "warning",
  critical: "destructive",
};

const TARGET_ICONS: Record<string, any> = {
  user: UserCheck,
  post: FileText,
  comment: MessageCircle,
  message: MessageCircle,
  sticker: ImageIcon,
};

const ReportsPage = () => {
  const [params, setParams] = useState<{
    page: number;
    limit: number;
    status: ReportStatus | "";
    targetType: string;
    category: string;
  }>({
    page: 1,
    limit: 20,
    status: "",
    targetType: "",
    category: "",
  });
  const [data, setData] = useState<{ items: AdminReport[]; total: number }>({
    items: [],
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<{ open: number; reviewing: number; resolved: number; dismissed: number } | null>(null);
  const [selected, setSelected] = useState<AdminReport | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminReportsService.list({
        page: params.page,
        limit: params.limit,
        status: (params.status || undefined) as ReportStatus | undefined,
        targetType: (params.targetType || undefined) as any,
        category: (params.category || undefined) as any,
      });
      setData({ items: res.items, total: res.total });
    } catch (e: any) {
      toast.error("Không tải được danh sách");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchData();
    adminReportsService.counts().then(setCounts).catch(() => {});
  }, [fetchData]);

  const columns: DataTableColumn<AdminReport>[] = [
    {
      id: "type",
      header: "Loại",
      className: "w-20",
      cell: (r) => {
        const Icon = TARGET_ICONS[r.targetType] || FileText;
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
            <Icon className="h-4 w-4" />
          </div>
        );
      },
    },
    {
      id: "reporter",
      header: "Người báo cáo",
      cell: (r) => {
        const u = r.reporterId;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={u?.avatarUrl} />
              <AvatarFallback>{initials(u?.displayName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{u?.displayName || "—"}</p>
              <p className="text-xs text-muted-foreground">@{u?.username}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: "category",
      header: "Phân loại",
      cell: (r) => (
        <div className="space-y-1">
          <Badge variant="outline" className="text-[10px]">
            {r.category}
          </Badge>
          <p className="text-xs text-muted-foreground line-clamp-1 max-w-md">
            {r.description || "—"}
          </p>
        </div>
      ),
    },
    {
      id: "priority",
      header: "Ưu tiên",
      className: "hidden md:table-cell w-24",
      cell: (r) => (
        <Badge variant={PRIORITY_VARIANT[r.priority]} className="text-[10px]">
          {r.priority}
        </Badge>
      ),
    },
    {
      id: "status",
      header: "Trạng thái",
      className: "w-32",
      cell: (r) => {
        const s = STATUS_LABELS[r.status];
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      id: "created",
      header: "Lúc",
      className: "hidden lg:table-cell w-32",
      cell: (r) => (
        <div className="text-xs">
          <p>{formatDate(r.createdAt)}</p>
          <p className="text-muted-foreground">{relativeTime(r.createdAt)}</p>
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      className: "w-12 text-right",
      cell: (r) => (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelected(r);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Báo cáo vi phạm"
        description={`${counts?.open ?? 0} báo cáo đang mở · ${data.total} tổng đang hiển thị`}
        actions={
          <Button variant="outline" size="sm" onClick={fetchData}>
            Làm mới
          </Button>
        }
      />

      {/* Counts cards */}
      {counts && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatusCard
            label="Mở"
            value={counts.open}
            variant="destructive"
            active={params.status === "open"}
            onClick={() => setParams((p) => ({ ...p, page: 1, status: "open" }))}
          />
          <StatusCard
            label="Đang xem xét"
            value={counts.reviewing}
            variant="warning"
            active={params.status === "reviewing"}
            onClick={() => setParams((p) => ({ ...p, page: 1, status: "reviewing" }))}
          />
          <StatusCard
            label="Đã xử lý"
            value={counts.resolved}
            variant="success"
            active={params.status === "resolved"}
            onClick={() => setParams((p) => ({ ...p, page: 1, status: "resolved" }))}
          />
          <StatusCard
            label="Bỏ qua"
            value={counts.dismissed}
            variant="muted"
            active={params.status === "dismissed"}
            onClick={() => setParams((p) => ({ ...p, page: 1, status: "dismissed" }))}
          />
        </div>
      )}

      <Card className="p-0">
        <DataTable
          columns={columns}
          data={data.items}
          total={data.total}
          page={params.page}
          pageSize={params.limit}
          isLoading={loading}
          onPageChange={(p) => setParams((prev) => ({ ...prev, page: p }))}
          rowKey={(r) => r._id}
          onRowClick={(r) => setSelected(r)}
          enableRowSelection
          toolbar={
            <>
              <Select
                value={params.status || "all"}
                onValueChange={(v) =>
                  setParams((p) => ({
                    ...p,
                    page: 1,
                    status: v === "all" ? "" : (v as ReportStatus),
                  }))
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="open">Mở</SelectItem>
                  <SelectItem value="reviewing">Đang xem</SelectItem>
                  <SelectItem value="resolved">Đã xử lý</SelectItem>
                  <SelectItem value="dismissed">Bỏ qua</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={params.targetType || "all"}
                onValueChange={(v) =>
                  setParams((p) => ({ ...p, page: 1, targetType: v === "all" ? "" : v }))
                }
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="post">Bài viết</SelectItem>
                  <SelectItem value="comment">Bình luận</SelectItem>
                  <SelectItem value="message">Tin nhắn</SelectItem>
                  <SelectItem value="sticker">Sticker</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={params.category || "all"}
                onValueChange={(v) =>
                  setParams((p) => ({ ...p, page: 1, category: v === "all" ? "" : v }))
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Phân loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả phân loại</SelectItem>
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="abuse">Lạm dụng</SelectItem>
                  <SelectItem value="hate">Thù ghét</SelectItem>
                  <SelectItem value="nsfw">NSFW</SelectItem>
                  <SelectItem value="scam">Lừa đảo</SelectItem>
                  <SelectItem value="impersonation">Giả mạo</SelectItem>
                  <SelectItem value="other">Khác</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
        />
      </Card>

      <ReportDetailDialog
        report={selected}
        onClose={() => setSelected(null)}
        onSuccess={() => {
          setSelected(null);
          fetchData();
        }}
      />
    </div>
  );
};

const StatusCard = ({
  label,
  value,
  variant,
  active,
  onClick,
}: {
  label: string;
  value: number;
  variant: any;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`text-left rounded-lg border p-4 transition-all ${
      active ? "border-primary bg-primary/5 shadow-enterprise" : "hover:bg-muted/30"
    }`}
  >
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="flex items-baseline justify-between mt-1">
      <p className="text-2xl font-bold">{value}</p>
      <Badge variant={variant} className="text-[10px]">
        {variant}
      </Badge>
    </div>
  </button>
);

export default ReportsPage;
