// ProtectedRoute — yêu cầu đăng nhập.
// Dùng AppBoot với delay 3s để tránh rate-limit + hiển thị loading mượt.

import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthBoot } from "@/hooks/useAuthBoot";
import { AppBoot } from "@/components/ui/app-boot";

const ProtectedRoute = () => {
  const { ready, error, retry, accessToken } = useAuthBoot();
  const location = useLocation();

  if (!ready) {
    return (
      <AppBoot
        error={error}
        onRetry={retry}
        title="Đang tải phiên đăng nhập"
        description="Đang xác thực với máy chủ..."
      />
    );
  }

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
