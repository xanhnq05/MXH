import { useEffect } from "react";
import { useThemeStore } from "@/stores/useThemeStore";

/**
 * Hook áp dụng theme lên <html>.
 * - Áp dụng ngay từ script inline trước khi React mount để tránh flash
 * - Hỗ trợ 3 mode: light | dark | system
 */
export const useTheme = () => {
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (mode: "light" | "dark") => {
      root.classList.toggle("dark", mode === "dark");
    };

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mq.matches ? "dark" : "light");
      const handler = (e: MediaQueryListEvent) =>
        applyTheme(e.matches ? "dark" : "light");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      applyTheme(theme);
    }
  }, [theme]);

  return { theme, setTheme };
};

/**
 * Helper toggle nhanh giữa light/dark.
 */
export const toggleTheme = (current: "light" | "dark" | "system") => {
  if (current === "dark") return "light";
  return "dark";
};
