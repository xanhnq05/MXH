import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { Spinner } from "@/components/ui/spinner";
import { useEffect, type ReactNode } from "react";
import api from "@/lib/axios";

interface Props {
  children?: ReactNode;
}

const ProtectedRoute = ({ children }: Props) => {
  const { accessToken, user, setUser, loading } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (accessToken && !user) {
      api
        .get("/users/me")
        .then((res) => setUser(res.data.user))
        .catch(() => useAuthStore.getState().clearState());
    }
  }, [accessToken, user, setUser]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!accessToken) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Nếu có children thì render children, ngược lại dùng Outlet (cho nested routes)
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
