// BannedUsersPage — danh sách user đang bị cấm (filter riêng)
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";
import { adminUsersService } from "@/services/adminUsers.service";
import type { AdminUser } from "@/types";
import { formatDate, initials, relativeTime } from "@/lib/utils";
import UnbanDialog from "@/components/users/UnbanDialog";
import { toast } from "sonner";

const BannedUsersPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: AdminUser[]; total: number }>({
    items: [],
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [unbanTarget, setUnbanTarget] = useState<AdminUser | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminUsersService.list({
        page,
        limit: 20,
        isBanned: true,
      });
      setData({ items: res.items, total: res.total });
    } catch (e: any) {
      toast.error("Không tải được danh sách");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns: DataTableColumn<AdminUser>[] = [
    {
      id: "user",
      header: "Người dùng",
      cell: (u) => (
        <button
          className="flex items-center gap-3 text-left"
          onClick={() => navigate(`/users/${u._id}`)}
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={u.avatarUrl} />
            <AvatarFallback>{initials(u.displayName)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{u.displayName}</p>
            <p className="text-xs text-muted-foreground">@{u.username}</p>
          </div>
        </button>
      ),
    },
    {
      id: "reason",
      header: "Lý do",
      cell: (u) => (
        <p className="text-xs text-muted-foreground line-clamp-2 max-w-md">
          {u.bannedReason || "—"}
        </p>
      ),
    },
    {
      id: "bannedAt",
      header: "Bị cấm lúc",
      className: "hidden md:table-cell w-32",
      cell: (u) => (
        <div className="text-xs">
          <p>{u.bannedAt ? formatDate(u.bannedAt) : "—"}</p>
          {u.bannedAt && (
            <p className="text-muted-foreground">{relativeTime(u.bannedAt)}</p>
          )}
        </div>
      ),
    },
    {
      id: "expires",
      header: "Hết hạn",
      className: "hidden md:table-cell w-32",
      cell: (u) =>
        u.bannedUntil ? (
          <Badge variant="warning" className="text-[10px]">
            {formatDate(u.bannedUntil)}
          </Badge>
        ) : (
          <Badge variant="destructive" className="text-[10px]">
            Vĩnh viễn
          </Badge>
        ),
    },
    {
      id: "actions",
      header: "",
      className: "w-32 text-right",
      cell: (u) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setUnbanTarget(u)}
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Gỡ cấm
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Đang bị cấm"
        description={`${data.total} tài khoản đang trong diện cấm`}
        actions={
          <Button variant="outline" size="sm" onClick={fetchData}>
            Làm mới
          </Button>
        }
      />
      <Card className="p-0">
        <DataTable
          columns={columns}
          data={data.items}
          total={data.total}
          page={page}
          pageSize={20}
          isLoading={loading}
          onPageChange={setPage}
          rowKey={(u) => u._id}
          onRowClick={(u) => navigate(`/users/${u._id}`)}
        />
      </Card>

      <UnbanDialog
        user={unbanTarget}
        onClose={() => setUnbanTarget(null)}
        onSuccess={() => {
          setUnbanTarget(null);
          fetchData();
        }}
      />
    </div>
  );
};

export default BannedUsersPage;
