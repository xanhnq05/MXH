// AppBoot — full-screen boot loader với delay 3s.
// Dùng để debounce + tránh bị rate-limit khi user F5 / load trang.
// Sau delay 3s sẽ render children, cho dù API có pending.
// Đồng thời cho phép retry khi có lỗi.

import { useEffect, useState } from "react";
import { Shield, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AppBootProps {
  /** Khi true, sẽ tự render children sau MIN_DELAY (mặc định 3000ms) */
  autoFinish?: boolean;
  /** Delay tối thiểu hiển thị loader (ms) - mặc định 3000ms */
  minDelay?: number;
  /** Cho phép hiển thị nút retry khi có lỗi */
  error?: Error | null;
  /** Callback khi user bấm retry */
  onRetry?: () => void;
  /** Tiêu đề */
  title?: string;
  /** Mô tả phụ */
  description?: string;
  /** Có phải là trạng thái boot chính của app không (sẽ hiển thị branding) */
  branded?: boolean;
  /** Children - chỉ render khi đã hết delay và không có lỗi */
  children?: React.ReactNode;
}

const PROGRESS_STEPS = [
  { id: 1, label: "Đang kết nối máy chủ..." },
  { id: 2, label: "Đang xác thực phiên đăng nhập..." },
  { id: 3, label: "Đang kiểm tra quyền admin..." },
  { id: 4, label: "Đang tải dữ liệu..." },
];

export const AppBoot = ({
  autoFinish = true,
  minDelay = 3000,
  error = null,
  onRetry,
  title = "Đang khởi động GreenX Admin",
  description = "Vui lòng đợi trong giây lát...",
  branded = true,
  children,
}: AppBootProps) => {
  const [elapsed, setElapsed] = useState(0);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(!autoFinish && !error);

  // Đếm elapsed time + cycle qua các step
  useEffect(() => {
    if (done || error) return;
    const start = Date.now();
    const tick = setInterval(() => {
      const e = Date.now() - start;
      setElapsed(e);
      // Tính step dựa trên elapsed (chia đều trong minDelay)
      const newStep = Math.min(
        Math.floor((e / minDelay) * PROGRESS_STEPS.length),
        PROGRESS_STEPS.length - 1
      );
      setStep(newStep);
    }, 100);
    return () => clearInterval(tick);
  }, [done, error, minDelay]);

  // Auto-finish sau minDelay
  useEffect(() => {
    if (!autoFinish || done || error) return;
    const t = setTimeout(() => setDone(true), minDelay);
    return () => clearTimeout(t);
  }, [autoFinish, minDelay, done, error]);

  if (done && !error) {
    return <>{children || null}</>;
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Không thể tải trang</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {error.message || "Đã xảy ra lỗi khi kết nối máy chủ."}
            </p>
          </div>
          {onRetry && (
            <Button onClick={onRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Thử lại
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="max-w-md w-full px-6 space-y-6">
        {/* Logo + spinner */}
        <div className="flex flex-col items-center gap-4">
          {branded ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                <Shield className="h-7 w-7" />
              </div>
              <div className="text-center">
                <p className="font-semibold tracking-tight">GreenX Admin</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Console
                </p>
              </div>
            </div>
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          )}

          <div className="text-center space-y-1">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-100 ease-linear"
              style={{ width: `${Math.min((elapsed / minDelay) * 100, 100)}%` }}
            />
          </div>

          {/* Steps */}
          <ul className="space-y-1.5 pt-1">
            {PROGRESS_STEPS.map((s, idx) => {
              const isDone = idx < step;
              const isCurrent = idx === step;
              return (
                <li
                  key={s.id}
                  className={cn(
                    "flex items-center gap-2 text-xs transition-colors",
                    isDone && "text-muted-foreground",
                    isCurrent && "text-foreground font-medium",
                    !isDone && !isCurrent && "text-muted-foreground/50"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-colors",
                      isDone && "border-primary bg-primary text-primary-foreground",
                      isCurrent && "border-primary",
                      !isDone && !isCurrent && "border-muted-foreground/30"
                    )}
                  >
                    {isDone ? (
                      <svg
                        viewBox="0 0 12 12"
                        className="h-2 w-2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 6 L5 9 L10 3" />
                      </svg>
                    ) : isCurrent ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    ) : null}
                  </span>
                  <span>{s.label}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Hint khi quá lâu */}
        {elapsed > minDelay * 1.5 && (
          <p className="text-center text-[10px] text-muted-foreground">
            Mất nhiều thời gian hơn dự kiến? Có thể máy chủ đang bận.
          </p>
        )}
      </div>
    </div>
  );
};

export default AppBoot;
