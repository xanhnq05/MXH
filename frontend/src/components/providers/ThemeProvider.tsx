import { ReactNode } from "react";
import { useTheme } from "@/hooks/useTheme";

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  useTheme();
  return <>{children}</>;
};
