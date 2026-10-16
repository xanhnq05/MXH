// DashboardPage — tổng quan chỉ số hệ thống
import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Users,
  MessageSquare,
  FileText,
  Image as ImageIcon,
  Flag,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Spinner } from "@/components/ui/spinner";
import { analyticsService } from "@/services/analytics.service";
import { adminReportsService } from "@/services/adminReports.service";
import type { AnalyticsOverview } from "@/types";
import { formatNumber, relativeTime } from "@/lib/utils";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4", "#8b5cf6"];

const DashboardPage = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [userGrowth, setUserGrowth] = useState<{ date: string; count: number }[]>([]);
  const [msgVolume, setMsgVolume] = useState<{ date: string; count: number }[]>([]);
  const [reportsByCategory, setReportsByCategory] = useState<{ _id: string; count: number }[]>([]);
  const [reportCounts, setReportCounts] = useState<{ open: number; reviewing: number; resolved: number; dismissed: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsService.overview(),
      analyticsService.userGrowth(30),
      analyticsService.messageVolume(30),
      analyticsService.reportsByCategory(),
      adminReportsService.counts(),
    ])
      .then(([ov, ug, mv, rbc, rc]) => {
        setOverview(ov);
        setUserGrowth(ug);
        setMsgVolume(mv);
        setReportsByCategory(rbc);
        setReportCounts(rc);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !overview) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const stats = [
    {
      label: "Người dùng",
      value: overview.users.total,
      sub: `+${overview.users.new30d} trong 30 ngày`,
      growth: overview.users.growthPct,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Bài viết",
      value: overview.posts.total,
      sub: `+${overview.posts.new30d} trong 30 ngày`,
      growth: null,
      icon: FileText,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Tin nhắn (30d)",
      value: overview.messages.new30d,
      sub: `${formatNumber(overview.messages.total)} tổng`,
      growth: null,
      icon: MessageSquare,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      label: "Media",
      value: overview.media.total,
      sub: `${overview.media.active} active`,
      growth: null,
      icon: ImageIcon,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Báo cáo mở",
      value: overview.reports.open,
      sub: `${overview.reports.total} tổng`,
      growth: null,
      icon: Flag,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
    },
    {
      label: "Đang bị cấm",
      value: overview.bans.active,
      sub: "Tài khoản",
      growth: null,
      icon: ShieldAlert,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tổng quan"
        description={`Cập nhật lúc ${new Date(overview.generatedAt).toLocaleString("vi-VN")}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/analytics">
              Xem phân tích chi tiết <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`rounded-md p-1.5 ${s.bg}`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                {s.growth != null && (
                  <Badge variant={s.growth >= 0 ? "success" : "destructive"} className="text-[10px]">
                    {s.growth >= 0 ? (
                      <TrendingUp className="h-3 w-3 mr-0.5" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-0.5" />
                    )}
                    {Math.abs(s.growth)}%
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold tracking-tight">{formatNumber(s.value)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tăng trưởng người dùng</CardTitle>
                <CardDescription>30 ngày gần nhất</CardDescription>
              </div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowth}>
                  <defs>
                    <linearGradient id="userGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => v.slice(5)}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    fill="url(#userGrowth)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Báo cáo theo loại</CardTitle>
            <CardDescription>Tổng hợp tất cả</CardDescription>
          </CardHeader>
          <CardContent>
            {reportsByCategory.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                Chưa có dữ liệu
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportsByCategory}
                      dataKey="count"
                      nameKey="_id"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={(e: any) => `${e._id} (${e.count})`}
                      labelLine={false}
                      fontSize={10}
                    >
                      {reportsByCategory.map((_, i) => (
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

      {/* Reports + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Báo cáo</CardTitle>
            <CardDescription>Trạng thái xử lý</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {reportCounts && (
              <>
                <StatusRow label="Mở" value={reportCounts.open} variant="destructive" />
                <StatusRow label="Đang xem xét" value={reportCounts.reviewing} variant="warning" />
                <StatusRow label="Đã xử lý" value={reportCounts.resolved} variant="success" />
                <StatusRow label="Bỏ qua" value={reportCounts.dismissed} variant="muted" />
              </>
            )}
            <Button asChild variant="outline" className="w-full mt-2">
              <Link to="/reports">Xem tất cả báo cáo →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lưu lượng tin nhắn</CardTitle>
            <CardDescription>30 ngày</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={msgVolume}>
                  <defs>
                    <linearGradient id="msgVol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#a855f7"
                    fill="url(#msgVol)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hành động nhanh</CardTitle>
            <CardDescription>Truy cập nhanh</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <QuickAction to="/users" icon={Users} label="Quản lý user" />
            <QuickAction to="/reports" icon={Flag} label="Báo cáo" />
            <QuickAction to="/users/banned" icon={ShieldAlert} label="Bị cấm" />
            <QuickAction to="/media" icon={ImageIcon} label="Sticker & GIF" />
            <QuickAction to="/audit" icon={Activity} label="Audit log" />
            <QuickAction to="/settings" icon={AlertTriangle} label="Cấu hình" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const StatusRow = ({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "destructive" | "warning" | "success" | "muted";
}) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-muted-foreground">{label}</span>
    <Badge variant={variant} className="font-mono">
      {value}
    </Badge>
  </div>
);

const QuickAction = ({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: any;
  label: string;
}) => (
  <Button asChild variant="outline" className="h-auto py-3 justify-start gap-2">
    <Link to={to}>
      <Icon className="h-4 w-4" />
      <span className="text-xs">{label}</span>
    </Link>
  </Button>
);

export default DashboardPage;
