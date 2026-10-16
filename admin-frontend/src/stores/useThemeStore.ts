// Theme store — light/dark cho admin.

import { create } from "zustand";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const KEY = "adminTheme";

const getInitial = (): Theme => {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(KEY) as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const applyTheme = (t: Theme) => {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(t);
  localStorage.setItem(KEY, t);
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitial(),
  setTheme: (t) => {
    applyTheme(t);
    set({ theme: t });
  },
  toggle: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    applyTheme(next);
    set({ theme: next });
  },
}));

// Khởi tạo theme ngay khi module load
if (typeof window !== "undefined") {
  applyTheme(getInitial());
}
