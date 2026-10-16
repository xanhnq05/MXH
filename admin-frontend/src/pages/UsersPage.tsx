// UsersPage — bảng quản lý user enterprise
import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  MoreHorizontal,
  ShieldAlert,
  ShieldCheck,
  Eye,
  AlertTriangle,
  UserX,
  Download,
  Mail,
  Calendar,
  Globe2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { adminUsersService, type ListUsersParams } from "@/services/adminUsers.service";
import { formatDate, initials, relativeTime, downloadCSV } from "@/lib/utils";
import type { AdminUser } from "@/types";
import BanUserDialog from "@/components/users/BanUserDialog";
import WarnUserDialog from "@/components/users/WarnUserDialog";
import UnbanDialog from "@/components/users/UnbanDialog";

const UsersPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialBanned = searchParams.get("banned") === "true";

  const [params, setParams] = useState<ListUsersParams>({
    page: 1,
    limit: 20,
    search: searchParams.get("search") || "",
    status: initialBanned ? "banned" : undefined,
    sort: "-createdAt",
  });
  const [data, setData] = useState<{ items: AdminUser[]; total: number }>({
    items: [],
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(params.search);

  // Dialog state
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [warnTarget, setWarnTarget] = useState<AdminUser | null>(null);
  const [unbanTarget, setUnbanTarget] = useState<AdminUser | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminUsersService.list(params);
      setData({ items: res.items, total: res.total });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Không tải được danh sách");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns: DataTableColumn<AdminUser>[] = [
    {
      id: "user",
      header: "Người dùng",
      cell: (u) => (
        <Link
          to={`/users/${u._id}`}
          className="flex items-center gap-3 group"
          onClick={(e) => e.stopPropagation()}
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={u.avatarUrl} />
            <AvatarFallback>{initials(u.displayName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium text-sm group-hover:text-primary truncate max-w-[180px]">
              {u.displayName}
            </p>
            <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
          </div>
        </Link>
      ),
    },
    {
      id: "email",
      header: "Email",
      className: "hidden md:table-cell",
      cell: (u) => (
        <div className="text-xs text-muted-foreground truncate max-w-[220px] flex items-center gap-1.5">
          <Mail className="h-3 w-3" />
          {u.email}
        </div>
      ),
    },
    {
      id: "country",
      header: "Quốc gia",
      className: "hidden lg:table-cell",
      cell: (u) => (
        <div className="text-xs flex items-center gap-1.5">
          {u.country ? (
            <>
              <Globe2 className="h-3 w-3 text-muted-foreground" />
              {u.country}
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      ),
    },
    {
      id: "status",
      header: "Trạng thái",
      className: "w-32",
      cell: (u) => (
        <div className="flex flex-col gap-1">
          {u.isBanned ? (
            <Badge variant="destructive" className="text-[10px] w-fit">
              <ShieldAlert className="h-3 w-3 mr-0.5" />
              {u.bannedUntil ? `Cấm đến ${formatDate(u.bannedUntil)}` : "Vĩnh viễn"}
            </Badge>
          ) : u.isOnline ? (
            <Badge variant="success" className="text-[10px] w-fit">
              Online
            </Badge>
          ) : (
            <Badge variant="muted" className="text-[10px] w-fit">
              {u.lastSeen ? relativeTime(u.lastSeen) : "Offline"}
            </Badge>
          )}
          {u.warningCount > 0 && (
            <Badge variant="warning" className="text-[10px] w-fit">
              {u.warningCount} cảnh báo
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "created",
      header: "Tạo lúc",
      className: "hidden md:table-cell w-32",
      cell: (u) => (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Calendar className="h-3 w-3" />
          {formatDate(u.createdAt)}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      className: "w-12 text-right",
      cell: (u) => (
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
            <DropdownMenuLabel>Hành động</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(`/users/${u._id}`)}>
              <Eye className="h-4 w-4" /> Xem chi tiết
            </DropdownMenuItem>
            {!u.isBanned && (
              <>
                <DropdownMenuItem onClick={() => setWarnTarget(u)}>
                  <AlertTriangle className="h-4 w-4" /> Cảnh báo
                </DropdownMenuItem>
                <DropdownMenuItem
                  destructive
                  onClick={() => setBanTarget(u)}
                >
                  <ShieldAlert className="h-4 w-4" /> Cấm tài khoản
                </DropdownMenuItem>
              </>
            )}
            {u.isBanned && (
              <DropdownMenuItem onClick={() => setUnbanTarget(u)}>
                <ShieldCheck className="h-4 w-4" /> Gỡ cấm
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              destructive
              onClick={async () => {
                if (!confirm(`Xoá mềm user ${u.username}?`)) return;
                try {
                  await adminUsersService.softDelete(u._id);
                  toast.success("Đã xoá mềm");
                  fetchData();
                } catch (e: any) {
                  toast.error(e?.response?.data?.message || "Lỗi");
                }
              }}
            >
              <UserX className="h-4 w-4" /> Xoá mềm
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const handleExport = () => {
    downloadCSV(
      `users-${new Date().toISOString().slice(0, 10)}.csv`,
      data.items.map((u) => ({
        id: u._id,
        username: u.username,
        displayName: u.displayName,
        email: u.email,
        country: u.country,
        isBanned: u.isBanned,
        warningCount: u.warningCount,
        createdAt: u.createdAt,
      }))
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Quản lý người dùng"
        description={`${data.total} người dùng trong hệ thống`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData}>
              Làm mới
            </Button>
          </>
        }
      />

      <Card className="p-0">
        <DataTable
          columns={columns}
          data={data.items}
          total={data.total}
          page={params.page ?? 1}
          pageSize={params.limit ?? 20}
          isLoading={loading}
          searchValue={searchInput}
          onSearchChange={(v) => {
            setSearchInput(v);
            setParams((p) => ({ ...p, page: 1, search: v }));
          }}
          searchPlaceholder="Tìm theo username, email, tên..."
          onPageChange={(p) => setParams((prev) => ({ ...prev, page: p }))}
          rowKey={(u) => u._id}
          onRowClick={(u) => navigate(`/users/${u._id}`)}
          enableRowSelection
          toolbar={
            <Select
              value={params.status || "all"}
              onValueChange={(v) =>
                setParams((p) => ({
                  ...p,
                  page: 1,
                  status: v === "all" ? undefined : (v as ListUsersParams["status"]),
                }))
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="active">Đang online</SelectItem>
                <SelectItem value="banned">Đang bị cấm</SelectItem>
                <SelectItem value="deleted">Đã xoá</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      </Card>

      {loading && data.items.length === 0 && (
        <div className="flex justify-center p-8">
          <Spinner />
        </div>
      )}

      <BanUserDialog
        user={banTarget}
        onClose={() => setBanTarget(null)}
        onSuccess={() => {
          setBanTarget(null);
          fetchData();
        }}
      />
      <WarnUserDialog
        user={warnTarget}
        onClose={() => setWarnTarget(null)}
        onSuccess={() => {
          setWarnTarget(null);
          fetchData();
        }}
      />
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

export default UsersPage;
