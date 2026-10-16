import { cn } from "@/lib/utils";

export const Spinner = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
      className
    )}
    role="status"
  >
    <span className="sr-only">Đang tải...</span>
  </div>
);
