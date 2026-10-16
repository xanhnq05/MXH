// useAuthBoot — hook xử lý boot session cho admin:
//   1. Đợi minDelay 3s để debounce
//   2. Cố gắng gọi /auth/refresh để lấy accessToken từ cookie (nếu có)
//   3. Cache kết quả admin check trong sessionStorage để tránh gọi lại khi F5
//   4. Skip các endpoint bị rate-limit (cache/stats)

import { useEffect, useRef, useState } from "react";
import api from "@/lib/axios";
import { useAuthStore } from "@/stores/useAuthStore";

const BOOT_DELAY = 3000; // 3s
const ADMIN_CACHE_KEY = "adminBootChecked";
const ADMIN_CACHE_TTL = 5 * 60 * 1000; // 5 phút

interface AdminCheckResult {
  isAdmin: boolean;
  reason?: string;
  timestamp: number;
}

/**
 * Xác thực admin bằng cách gọi 1 endpoint nhẹ & phổ biến.
 * Tránh /admin/cache/stats vì endpoint này dễ bị rate-limit.
 * Ưu tiên /admin/notifications/history vì:
 *   - Trả về 403 ngay nếu không phải admin (rate-limit friendly)
 *   - Hoặc 200 nếu là admin
 */
async function checkAdminStatus(): Promise<AdminCheckResult> {
  try {
    // Gọi 1 endpoint nhẹ - history (đã có trong code, gọi 1 lần, cache 5 phút)
    await api.get("/admin/notifications/history", { params: { page: 1, limit: 1 } });
    return { isAdmin: true, timestamp: Date.now() };
  } catch (e: any) {
    const status = e?.response?.status;
    if (status === 403 || status === 401) {
      return { isAdmin: false, reason: "forbidden", timestamp: Date.now() };
    }
    if (status === 429) {
      // Rate limited - coi như chưa biết, dùng cache nếu có
      return { isAdmin: false, reason: "rate-limited", timestamp: Date.now() };
    }
    // 404 hoặc lỗi khác - coi như chưa boot xong
    throw e;
  }
}

/** Đọc cache admin check */
function readAdminCache(): AdminCheckResult | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminCheckResult;
    if (Date.now() - parsed.timestamp > ADMIN_CACHE_TTL) {
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Ghi cache */
function writeAdminCache(r: AdminCheckResult) {
  try {
    sessionStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify(r));
  } catch {}
}

export function useAuthBoot() {
  const { accessToken, setAccessToken, setUser, user, clearState } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;

    const boot = async () => {
      setError(null);
      try {
        // ===== Bước 1: Refresh token nếu cần (chỉ 1 lần, không retry) =====
        if (!accessToken) {
          try {
            const res = await api.post("/auth/refresh", null, {
              _bootRetry: false, // custom flag để axios interceptor biết skip auto-refresh
            } as any);
            const newToken = res.data?.accessToken;
            if (newToken) {
              setAccessToken(newToken);
            }
          } catch {
            // Không có session - vẫn tiếp tục để hiển thị login
          }
        }

        // ===== Bước 2: Fetch user nếu có token =====
        if (useAuthStore.getState().accessToken && !useAuthStore.getState().user) {
          try {
            const res = await api.get("/users/me");
            setUser(res.data?.user || res.data);
          } catch {
            // ignore
          }
        }

        // ===== Bước 3: Delay tối thiểu 3s =====
        await new Promise((r) => setTimeout(r, BOOT_DELAY));

        if (cancelled) return;
        setReady(true);
      } catch (e: any) {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error("Boot thất bại"));
      }
    };

    boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]);

  const retry = () => {
    startedRef.current = false;
    setReady(false);
    setError(null);
    setRetryKey((k) => k + 1);
  };

  return { ready, error, retry, accessToken, user, clearState };
}

/**
 * Xác định user có phải admin hay không.
 * Ưu tiên cache session (5 phút) - tránh gọi lại API khi F5.
 * Fallback: gọi /admin/notifications/history (nhẹ, ít bị rate-limit).
 */
export async function getCachedAdminStatus(): Promise<AdminCheckResult> {
  const cached = readAdminCache();
  if (cached) return cached;

  const fresh = await checkAdminStatus();
  writeAdminCache(fresh);
  return fresh;
}
