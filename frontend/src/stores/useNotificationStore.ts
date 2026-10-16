import { create } from "zustand";
import type { Notification } from "@/types/notification";

interface NotificationState {
  list: Notification[];
  unreadCount: number;
  addNotification: (n: Notification) => void;
  setList: (list: Notification[]) => void;
  incrementUnread: () => void;
  setUnreadCount: (n: number) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  list: [],
  unreadCount: 0,
  addNotification: (n) =>
    set((s) => ({ list: [n, ...s.list].slice(0, 50) })),
  setList: (list) => set({ list }),
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  setUnreadCount: (n) => set({ unreadCount: n }),
  markRead: (id) =>
    set((s) => ({
      list: s.list.map((x) => (x._id === id ? { ...x, isRead: true } : x)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    })),
  markAllRead: () =>
    set((s) => ({
      list: s.list.map((x) => ({ ...x, isRead: true })),
      unreadCount: 0,
    })),
  clear: () => set({ list: [], unreadCount: 0 }),
}));
