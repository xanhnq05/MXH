// UserDetailPage — chi tiết user với tabs: Hồ sơ / Hoạt động / Ban / Reports / Audit
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import {
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  UserX,
  Mail,
  Calendar,
  Globe2,
  MapPin,
  GraduationCap,
  Briefcase,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { adminUsersService } from "@/services/adminUsers.service";
import { formatDate, formatDateTime, initials, relativeTime } from "@/lib/utils";
import type { AdminUser, BanRecord } from "@/types";
import BanUserDialog from "@/components/users/BanUserDialog";
import UnbanDialog from "@/components/users/UnbanDialog";
import WarnUserDialog from "@/components/users/WarnUserDialog";
import { toast } from "sonner";

const UserDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [bans, setBans] = useState<BanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [banOpen, setBanOpen] = useState(false);
  const [warnOpen, setWarnOpen] = useState(false);
  const [unbanOpen, setUnbanOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    adminUsersService
      .get(id)
      .then((res) => {
        setUser(res.user);
        setBans(res.bans);
      })
      .catch((e) => {
        toast.error("Không tải được thông tin user");
        navigate("/users");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const refresh = async () => {
    if (!id) return;
    const res = await adminUsersService.get(id);
    setUser(res.user);
    setBans(res.bans);
  };

  if (loading || !user) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link to="/users">
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </Link>
        </Button>
      </div>

      {/* Header card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback className="text-2xl">
                {initials(user.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{user.displayName}</h2>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
                <div className="flex gap-2">
                  {user.isBanned ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUnbanOpen(true)}
                    >
                      <ShieldCheck className="h-4 w-4" /> Gỡ cấm
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setBanOpen(true)}
                    >
                      <ShieldAlert className="h-4 w-4" /> Cấm
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWarnOpen(true)}
                  >
                    <AlertTriangle className="h-4 w-4" /> Cảnh báo
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {user.isBanned && (
                  <Badge variant="destructive">
                    <ShieldAlert className="h-3 w-3 mr-1" /> Đang bị cấm
                  </Badge>
                )}
                {user.isOnline ? (
                  <Badge variant="success">Online</Badge>
                ) : (
                  <Badge variant="muted">
                    {user.lastSeen ? `Online ${relativeTime(user.lastSeen)}` : "Offline"}
                  </Badge>
                )}
                {user.warningCount > 0 && (
                  <Badge variant="warning">
                    {user.warningCount} cảnh báo
                  </Badge>
                )}
                {user.isDeleted && <Badge variant="muted">Đã xoá mềm</Badge>}
              </div>

              {user.bio && (
                <p className="mt-3 text-sm text-muted-foreground">{user.bio}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Hồ sơ</TabsTrigger>
          <TabsTrigger value="activity">Hoạt động</TabsTrigger>
          <TabsTrigger value="bans">Lịch sử cấm ({bans.length})</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field icon={Mail} label="Email" value={user.email} />
              <Field
                icon={Calendar}
                label="Ngày tạo"
                value={formatDateTime(user.createdAt)}
              />
              <Field
                icon={Globe2}
                label="Quốc gia"
                value={user.country || "—"}
              />
              <Field
                icon={MapPin}
                label="Thành phố"
                value={user.city || "—"}
              />
              <Field
                icon={GraduationCap}
                label="Trường"
                value={user.school || "—"}
              />
              <Field
                icon={Briefcase}
                label="Nơi làm việc"
                value={user.workplace || "—"}
              />
              <Field
                icon={KeyRound}
                label="E2EE public key"
                value={user.e2eePublicKey ? "Đã thiết lập" : "Chưa thiết lập"}
              />
              <Field
                icon={Calendar}
                label="Cập nhật"
                value={formatDateTime(user.updatedAt)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Thống kê hoạt động</CardTitle>
              <CardDescription>Đếm các hành động trong hệ thống</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Bài viết" value="—" />
                <Stat label="Bình luận" value="—" />
                <Stat label="Tin nhắn" value="—" />
                <Stat label="Báo cáo nhận" value="—" />
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                * Tính năng đếm chi tiết sẽ được bổ sung trong phiên bản tiếp theo.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bans">
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử cấm</CardTitle>
              <CardDescription>{bans.length} bản ghi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {bans.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Chưa từng bị cấm
                </p>
              ) : (
                bans.map((b) => (
                  <div
                    key={b._id}
                    className="flex items-start justify-between border-b last:border-0 pb-3 last:pb-0"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={b.isActive ? "destructive" : "muted"}>
                          {b.isActive ? "Đang cấm" : "Đã gỡ"}
                        </Badge>
                        <Badge variant="outline">{b.category}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(b.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{b.reason}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Bởi{" "}
                        {typeof b.bannedBy === "object"
                          ? b.bannedBy.email
                          : b.bannedBy}
                        {b.expiresAt && ` · Hết hạn ${formatDate(b.expiresAt)}`}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử thao tác của admin</CardTitle>
              <CardDescription>
                Các action đã thực hiện lên user này
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-6">
                Xem chi tiết tại{" "}
                <Link to="/audit" className="text-primary hover:underline">
                  Audit log
                </Link>{" "}
                (filter targetType = user, targetId = {user._id})
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <BanUserDialog
        user={banOpen ? user : null}
        onClose={() => setBanOpen(false)}
        onSuccess={() => {
          setBanOpen(false);
          refresh();
        }}
      />
      <UnbanDialog
        user={unbanOpen ? user : null}
        onClose={() => setUnbanOpen(false)}
        onSuccess={() => {
          setUnbanOpen(false);
          refresh();
        }}
      />
      <WarnUserDialog
        user={warnOpen ? user : null}
        onClose={() => setWarnOpen(false)}
        onSuccess={() => {
          setWarnOpen(false);
          refresh();
        }}
      />
    </div>
  );
};

const Field = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="space-y-1">
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
      <Icon className="h-3 w-3" /> {label}
    </p>
    <p className="text-sm font-medium break-all">{value}</p>
  </div>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border bg-muted/30 p-3">
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default UserDetailPage;
