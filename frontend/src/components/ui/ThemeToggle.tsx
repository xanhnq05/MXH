// ThemeToggle - nút chuyển 3 chế độ: light / dark / system
// Hỗ trợ 2 variant: dropdown (full) và icon (compact)

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useThemeStore } from "@/stores/useThemeStore";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

interface ThemeToggleProps {
  variant?: "icon" | "menu" | "segmented";
  className?: string;
}

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: "light", label: "Sáng", icon: <Sun className="h-4 w-4" /> },
  { value: "dark", label: "Tối", icon: <Moon className="h-4 w-4" /> },
  { value: "system", label: "Hệ thống", icon: <Monitor className="h-4 w-4" /> },
];

export function ThemeToggle({ variant = "icon", className }: ThemeToggleProps) {
  const { theme, setTheme } = useThemeStore();
  const [open, setOpen] = useState(false);

  // Close menu khi click ra ngoài
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-theme-toggle]")) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // === Compact icon button (chỉ toggle light/dark) ===
  if (variant === "icon") {
    const current = theme === "system" ? "light" : theme === "dark" ? "light" : "dark";
    return (
      <button
        onClick={() => setTheme(current)}
        title={current === "dark" ? "Chuyển sang chế độ tối" : "Chuyển sang chế độ sáng"}
        className={cn(
          "p-2 rounded-lg hover:bg-orange-50 text-slate-500 hover:text-orange-600 transition-colors",
          "dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-orange-400",
          className
        )}
      >
        {theme === "dark" ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </button>
    );
  }

  // === Segmented (3 nút ngang) ===
  if (variant === "segmented") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-0.5 p-1 rounded-lg border bg-slate-50 border-slate-200",
          "dark:bg-slate-800 dark:border-slate-700",
          className
        )}
        data-theme-toggle
      >
        {THEME_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors",
              theme === opt.value
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  // === Menu (dropdown) ===
  const current = THEME_OPTIONS.find((o) => o.value === theme) || THEME_OPTIONS[0];
  return (
    <div className="relative" data-theme-toggle>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
          "text-slate-600 hover:bg-orange-50 hover:text-orange-600",
          "dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-orange-400",
          className
        )}
      >
        {current.icon}
        <span className="flex-1 text-left">Giao diện: {current.label}</span>
      </button>
      {open && (
        <div
          className={cn(
            "absolute left-0 right-0 mt-1 z-50 rounded-xl border shadow-lg overflow-hidden",
            "bg-white border-orange-100",
            "dark:bg-slate-800 dark:border-slate-700"
          )}
        >
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setTheme(opt.value);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                theme === opt.value
                  ? "bg-orange-50 text-orange-600 dark:bg-slate-700 dark:text-orange-400"
                  : "text-slate-700 hover:bg-orange-50 dark:text-slate-200 dark:hover:bg-slate-700"
              )}
            >
              {opt.icon}
              <span className="flex-1 text-left">{opt.label}</span>
              {theme === opt.value && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ThemeToggle;
