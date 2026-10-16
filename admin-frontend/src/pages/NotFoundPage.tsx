// NotFoundPage
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

const NotFoundPage = () => {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-7xl font-bold text-muted-foreground">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Trang không tồn tại</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Có thể đường dẫn đã sai hoặc bạn không có quyền truy cập.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Về dashboard</Link>
      </Button>
    </div>
  );
};

export default NotFoundPage;
