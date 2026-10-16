import { useEffect } from "react";
import { useThemeStore } from "@/stores/useThemeStore";

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
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches ? "dark" : "light");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      applyTheme(theme);
    }
  }, [theme]);

  return { theme, setTheme };
};
