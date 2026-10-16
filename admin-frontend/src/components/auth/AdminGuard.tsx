// AdminGuard — kiểm tra user có phải admin không.
// Sử dụng cache (sessionStorage 5 phút) để tránh gọi API mỗi lần F5.
// Có AppBoot loading với delay 3s.

import { Navigate, Outlet, useLocation } from "react-router";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { AppBoot } from "@/components/ui/app-boot";
import { Shield, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCachedAdminStatus } from "@/hooks/useAuthBoot";

const BOOT_DELAY = 3000;

const AdminGuard = () => {
  const { accessToken, user, clearState } = useAuthStore();
  const location = useLocation();
  const [phase, setPhase] = useState<"loading" | "ready" | "forbidden">("loading");
  const [elapsed, setElapsed] = useState(0);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!accessToken) {
      setPhase("ready");
      return;
    }

    let cancelled = false;
    setPhase("loading");
    setElapsed(0);

    const start = Date.now();
    const tick = setInterval(() => {
      if (!cancelled) setElapsed(Date.now() - start);
    }, 100);

    // Gọi check admin (có cache 5 phút)
    getCachedAdminStatus()
      .then((res) => {
        if (cancelled) return;
        const remaining = Math.max(0, BOOT_DELAY - (Date.now() - start));
        setTimeout(() => {
          if (cancelled) return;
          setPhase(res.isAdmin ? "ready" : "forbidden");
        }, remaining);
      })
      .catch(() => {
        if (cancelled) return;
        // Lỗi: vẫn render ready để user vào app (sẽ bị 403 từ API khi gọi)
        const remaining = Math.max(0, BOOT_DELAY - (Date.now() - start));
        setTimeout(() => {
          if (cancelled) return;
          setPhase("ready");
        }, remaining);
      });

    return () => {
      cancelled = true;
      clearInterval(tick);
    };
  }, [accessToken, retryKey]);

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (phase === "loading") {
    return (
      <AppBoot
        title="Đang xác minh quyền admin"
        description="Đang kiểm tra quyền truy cập của bạn..."
      />
    );
  }

  if (phase === "forbidden") {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center bg-background">
        <div className="max-w-md">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Shield className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold">Không có quyền truy cập</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tài khoản{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {user?.email || "—"}
            </code>{" "}
            không có quyền admin. Vui lòng liên hệ quản trị hệ thống để được thêm vào{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">ADMIN_EMAILS</code>.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button variant="outline" onClick={() => setRetryKey((k) => k + 1)}>
              Thử lại
            </Button>
            <Button
              variant="default"
              onClick={async () => {
                clearState();
                window.location.href = "/login";
              }}
            >
              <Mail className="h-4 w-4" /> Đăng nhập tài khoản khác
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default AdminGuard;
