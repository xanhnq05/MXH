// TimeDivider — Divider ngày/giờ giữa các message trong chat.
// Quy tắc format theo spec:
//   - Hôm nay: chỉ giờ (vd "21:15")
//   - Hôm qua: "Hôm qua 22:02"
//   - Cũ hơn: "Thứ Tư, 22/02" hoặc "12/03/2025"
//
// Được chèn vào MessageList khi khoảng cách giữa 2 message liên tiếp > 5 phút
// (do MessageList xử lý logic quyết định, component này chỉ render).

import { format, isToday, isYesterday } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TimeDividerProps {
  /** ISO string của message tại điểm chèn divider */
  at: string;
  /** Optional: loại divider — "date" cho đầu ngày, "gap" cho khoảng nghỉ */
  variant?: "date" | "gap";
  className?: string;
}

/** Format label theo spec */
export const formatTimeLabel = (iso: string): string => {
  const d = new Date(iso);
  if (isToday(d)) {
    return format(d, "HH:mm");
  }
  if (isYesterday(d)) {
    return `Hôm qua ${format(d, "HH:mm")}`;
  }
  // Trong tuần → Thứ + dd/MM
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return `${format(d, "EEEE", { locale: vi })}, ${format(d, "dd/MM")}`;
  }
  // Cũ hơn
  return format(d, "dd/MM/yyyy");
};

export const TimeDivider = ({ at, variant = "gap", className }: TimeDividerProps) => {
  const label = formatTimeLabel(at);
  return (
    <div
      className={cn(
        "flex items-center justify-center my-3 select-none",
        className
      )}
      role="separator"
    >
      <div className="flex items-center gap-2 px-2">
        <div className="h-px w-8 sm:w-12 bg-slate-200 dark:bg-slate-700" />
        <span
          className={cn(
            "text-[11px] font-medium text-slate-500 dark:text-slate-400",
            variant === "date" && "text-slate-600 font-semibold"
          )}
        >
          {label}
        </span>
        <div className="h-px w-8 sm:w-12 bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  );
};
