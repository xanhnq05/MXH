import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/useAuthStore";

// Ưu tiên VITE_SOCKET_URL, fallback VITE_API_URL (strip /api), cuối cùng localhost
const rawApi = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || rawApi.replace(/\/api\/?$/, "");

let socket: Socket | null = null;

export const getSocket = (): Socket | null => socket;

export const connectSocket = (): Socket => {
  if (socket?.connected) return socket;

  const { accessToken } = useAuthStore.getState();
  socket = io(SOCKET_URL, {
    auth: { accessToken },
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => {
    console.log("🟢 Socket connected:", socket?.id);
  });
  socket.on("disconnect", (reason) => {
    console.log("🔴 Socket disconnected:", reason);
  });
  socket.on("connect_error", (err) => {
    console.warn("Socket connect error:", err.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
