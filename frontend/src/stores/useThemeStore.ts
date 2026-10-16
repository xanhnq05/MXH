import { create } from "zustand";

type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: (localStorage.getItem("theme") as Theme) || "system",
  setTheme: (t) => {
    localStorage.setItem("theme", t);
    set({ theme: t });
  },
}));
