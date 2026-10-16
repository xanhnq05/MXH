import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format ngày sinh về dạng dd/mm/yyyy
 * - Input có thể là: ISO Date string ("1990-05-15T00:00:00.000Z"),
 *   date string ("YYYY-MM-DD" hoặc "1990-05-15"), hoặc Date object
 * - Trả về "" nếu không parse được
 */
export function formatBirthday(value?: string | Date | null): string {
  if (!value) return "";
  let d: Date;
  if (value instanceof Date) {
    d = value;
  } else {
    // Tránh lệch múi giờ: nếu là "YYYY-MM-DD" thì parse thủ công
    const isoMatch = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
    if (isoMatch) {
      const [y, m, day] = value.split("-").map(Number);
      d = new Date(y, m - 1, day);
    } else {
      d = new Date(value);
    }
  }
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
