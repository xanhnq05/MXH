// LoginPage — Enterprise dark/light split design
import { useState } from "react";
import { useNavigate, useLocation, Navigate, Link } from "react-router";
import { Lock, Mail, Shield, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/useAuthStore";

const LoginPage = () => {
  const { signIn, loading, accessToken } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  if (accessToken) {
    const from = (location.state as any)?.from?.pathname || "/";
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await signIn({ username: email.trim().toLowerCase(), password });
      navigate("/");
    } catch (e: any) {
      setError(e?.response?.data?.message || "Sai thông tin đăng nhập");
    }
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-background">
      {/* LEFT — Branding panel (always dark) */}
      <div className="hidden lg:flex relative bg-sidebar text-sidebar-foreground flex-col justify-between p-12 overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Glow blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-lg">
            G
          </div>
          <div>
            <p className="text-base font-semibold">GreenX Admin</p>
            <p className="text-xs text-sidebar-foreground/60 uppercase tracking-widest">
              Console
            </p>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-sidebar-border bg-sidebar-accent px-3 py-1 text-xs">
            <Shield className="h-3 w-3" />
            <span>Quản trị viên cấp cao</span>
          </div>
          <h1 className="text-3xl font-bold leading-tight">
            Công cụ quản lý<br />
            <span className="text-primary">toàn diện</span>
          </h1>
          <p className="text-sm text-sidebar-foreground/70 max-w-md leading-relaxed">
            Quản lý người dùng, kiểm duyệt nội dung, xử lý báo cáo và theo dõi
            chỉ số hệ thống GreenX — tất cả trong một bảng điều khiển.
          </p>
          <ul className="space-y-2 text-sm text-sidebar-foreground/80">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Quản lý người dùng & cấm tài khoản
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Kiểm duyệt sticker, GIF, bài viết
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Phân tích chỉ số thời gian thực
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Nhật ký hành động admin
            </li>
          </ul>
        </div>

        <div className="relative z-10 text-xs text-sidebar-foreground/50">
          © 2026 GreenX · Bảo mật & Mã hoá End-to-End
        </div>
      </div>

      {/* RIGHT — Form */}
      <div className="flex items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
              G
            </div>
            <p className="font-semibold">GreenX Admin</p>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight">Đăng nhập</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sử dụng tài khoản admin đã được cấp quyền
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email hoặc username</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@greenx.com"
                  className="pl-9"
                  required
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Mật khẩu</label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 pr-9"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Đăng nhập
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Chỉ tài khoản trong <code className="rounded bg-muted px-1 py-0.5">ADMIN_EMAILS</code> mới có quyền truy cập.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
