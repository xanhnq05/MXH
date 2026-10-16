import { ReactNode } from "react";
import { useSocket } from "@/hooks/useSocket";

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  useSocket();
  return <>{children}</>;
};
