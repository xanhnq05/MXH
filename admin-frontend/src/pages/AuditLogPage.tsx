// AuditLogPage — nhật ký hành động admin
import { useEffect, useState, useCallback } from "react";
import { Activity, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auditService } from "@/services/audit.service";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { toast } from "sonner";
import type { AdminAuditLog } from "@/types";

const ACTION_VARIANT: Record<string, any> = {
  "user.ban": "destructive",
  "user.unban": "success",
  "user.warn": "warning",
  "user.soft_delete": "destructive",
  "user.update": "outline",
  "media.delete": "destructive",
  "media.update": "outline",
  "report.resolve": "success",
  "report.dismiss": "muted",
  "report.assign": "outline",
};

const AuditLogPage = () => {
  const [params, setParams] = useState({
    page: 1,
    limit: 50,
    action: "",
    targetType: "",
  });
  const [data, setData] = useState<{ items: AdminAuditLog[]; total: number }>({
    items: [],
    total: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditService.list({
        page: params.page,
        limit: params.limit,
        action: params.action || undefined,
        targetType: params.targetType || undefined,
      });
      setData({ items: res.items, total: res.total });
    } catch (e: any) {
      toast.error("Không tải được audit log");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns: DataTableColumn<AdminAuditLog>[] = [
    {
      id: "time",
      header: "Thời gian",
      className: "w-44",
      cell: (l) => (
        <div className="text-xs">
          <p>{formatDateTime(l.createdAt)}</p>
          <p className="text-muted-foreground">{relativeTime(l.createdAt)}</p>
        </div>
      ),
    },
    {
      id: "admin",
      header: "Admin",
      cell: (l) => {
        const a = typeof l.adminId === "object" ? l.adminId : null;
        return (
          <div>
            <p className="text-sm font-medium">{a?.displayName || a?.username || "—"}</p>
            <p className="text-xs text-muted-foreground">{l.adminEmail}</p>
          </div>
        );
      },
    },
    {
      id: "action",
      header: "Hành động",
      className: "w-40",
      cell: (l) => (
        <Badge variant={ACTION_VARIANT[l.action] || "outline"} className="text-[10px]">
          {l.action}
        </Badge>
      ),
    },
    {
      id: "target",
      header: "Target",
      className: "hidden md:table-cell",
      cell: (l) =>
        l.targetId ? (
          <div className="text-xs">
            <Badge variant="muted" className="text-[10px] mb-0.5">
              {l.targetType}
            </Badge>
            <code className="block text-[10px] text-muted-foreground truncate max-w-[180px]">
              {l.targetId}
            </code>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      id: "ip",
      header: "IP",
      className: "hidden lg:table-cell w-32",
      cell: (l) => (
        <code className="text-[10px] text-muted-foreground">{l.ip || "—"}</code>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit log"
        description={`${data.total} bản ghi hành động`}
      />

      <Card className="p-0">
        <DataTable
          columns={columns}
          data={data.items}
          total={data.total}
          page={params.page}
          pageSize={params.limit}
          isLoading={loading}
          onPageChange={(p) => setParams((prev) => ({ ...prev, page: p }))}
          rowKey={(l) => l._id}
          toolbar={
            <>
              <Select
                value={params.action || "all"}
                onValueChange={(v) =>
                  setParams((p) => ({ ...p, page: 1, action: v === "all" ? "" : v }))
                }
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả action</SelectItem>
                  <SelectItem value="user.ban">user.ban</SelectItem>
                  <SelectItem value="user.unban">user.unban</SelectItem>
                  <SelectItem value="user.warn">user.warn</SelectItem>
                  <SelectItem value="user.soft_delete">user.soft_delete</SelectItem>
                  <SelectItem value="user.update">user.update</SelectItem>
                  <SelectItem value="media.delete">media.delete</SelectItem>
                  <SelectItem value="media.update">media.update</SelectItem>
                  <SelectItem value="report.resolve">report.resolve</SelectItem>
                  <SelectItem value="report.dismiss">report.dismiss</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={params.targetType || "all"}
                onValueChange={(v) =>
                  setParams((p) => ({ ...p, page: 1, targetType: v === "all" ? "" : v }))
                }
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Target" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả target</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="post">Post</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
        />
      </Card>
    </div>
  );
};

export default AuditLogPage;
