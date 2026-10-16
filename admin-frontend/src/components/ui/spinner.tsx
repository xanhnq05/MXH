import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
      role="status"
    >
      <span className="sr-only">Đang tải...</span>
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Spinner className="h-6 w-6 text-primary" />
    </div>
  );
}
