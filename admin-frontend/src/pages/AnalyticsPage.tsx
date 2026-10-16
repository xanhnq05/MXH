// AnalyticsPage — dashboard phân tích chi tiết
import { useEffect, useState } from "react";
import { Users, MessageSquare, Flag, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { analyticsService } from "@/services/analytics.service";
import { formatNumber, initials, relativeTime } from "@/lib/utils";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4"];

const AnalyticsPage = () => {
  const [days, setDays] = useState(30);
  const [userGrowth, setUserGrowth] = useState<{ date: string; count: number }[]>([]);
  const [msgVol, setMsgVol] = useState<{ date: string; count: number }[]>([]);
  const [byCategory, setByCategory] = useState<{ _id: string; count: number }[]>([]);
  const [byStatus, setByStatus] = useState<{ _id: string; count: number }[]>([]);
  const [topReporters, setTopReporters] = useState<any[]>([]);
  const [topReported, setTopReported] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      analyticsService.userGrowth(days),
      analyticsService.messageVolume(days),
      analyticsService.reportsByCategory(),
      analyticsService.reportsByStatus(),
      analyticsService.topReporters(10),
      analyticsService.topReportedUsers(10),
    ])
      .then(([ug, mv, bc, bs, tr, tru]) => {
        setUserGrowth(ug);
        setMsgVol(mv);
        setByCategory(bc);
        setByStatus(bs);
        setTopReporters(tr);
        setTopReported(tru);
      })
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Phân tích"
        description={`Chỉ số trong ${days} ngày gần nhất`}
        actions={
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 ngày</SelectItem>
              <SelectItem value="30">30 ngày</SelectItem>
              <SelectItem value="90">90 ngày</SelectItem>
              <SelectItem value="180">180 ngày</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Tăng trưởng người dùng
            </CardTitle>
            <CardDescription>User mới mỗi ngày</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowth}>
                  <defs>
                    <linearGradient id="ug2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#ug2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Lưu lượng tin nhắn
            </CardTitle>
            <CardDescription>Tin nhắn mỗi ngày</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={msgVol}>
                  <defs>
                    <linearGradient id="mv2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#a855f7" fill="url(#mv2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-4 w-4" /> Báo cáo theo loại
            </CardTitle>
            <CardDescription>Tổng hợp tất cả báo cáo</CardDescription>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Chưa có dữ liệu</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byCategory}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="_id" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Báo cáo theo trạng thái
            </CardTitle>
            <CardDescription>Phân bố xử lý</CardDescription>
          </CardHeader>
          <CardContent>
            {byStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Chưa có dữ liệu</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byStatus}
                      dataKey="count"
                      nameKey="_id"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={(e: any) => `${e._id}: ${e.count}`}
                    >
                      {byStatus.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Top reporter</CardTitle>
            <CardDescription>User báo cáo nhiều nhất</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {topReporters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu</p>
            ) : (
              topReporters.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground w-6">
                    #{i + 1}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={r.user?.avatarUrl} />
                    <AvatarFallback>{initials(r.user?.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.user?.displayName}</p>
                    <p className="text-xs text-muted-foreground">@{r.user?.username}</p>
                  </div>
                  <Badge variant="outline">{r.count} báo cáo</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User bị báo cáo nhiều nhất</CardTitle>
            <CardDescription>Cần chú ý kiểm duyệt</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {topReported.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu</p>
            ) : (
              topReported.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground w-6">
                    #{i + 1}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={r.user?.avatarUrl} />
                    <AvatarFallback>{initials(r.user?.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.user?.displayName}</p>
                    <p className="text-xs text-muted-foreground">@{r.user?.username}</p>
                  </div>
                  <Badge variant={r.user?.isBanned ? "destructive" : "warning"}>
                    {r.count} báo cáo
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsPage;
