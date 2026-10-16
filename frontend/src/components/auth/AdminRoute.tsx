// AdminRoute — chỉ cho phép admin truy cập. Backend vẫn enforce authz; đây chỉ là UX guard.

import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { Spinner } from "@/components/ui/spinner";
import { useEffect, type ReactNode } from "react";
import { isAdminUser } from "@/lib/helpers";

interface Props {
  children?: ReactNode;
}

const AdminRoute = ({ children }: Props) => {
  const { accessToken, user } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // Nếu user chưa có nhưng có token, có thể backend sẽ trả 403 → AdminMediaPage sẽ handle
  }, [accessToken, user]);

  if (!accessToken) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (!isAdminUser(user)) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <p className="font-semibold text-lg">Bạn không có quyền truy cập</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Trang này chỉ dành cho quản trị viên. Nếu bạn cần quyền, hãy liên hệ
            quản trị hệ thống và yêu cầu được thêm vào <code>ADMIN_EMAILS</code>.
          </p>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

export default AdminRoute;
