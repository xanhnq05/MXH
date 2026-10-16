import { create } from "zustand";
import type { Conversation, Message } from "@/types/message";
import api from "@/lib/axios";

interface TypingInfo {
  userId: string;
  username: string;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  loadingConversations: boolean;
  loadingMessages: boolean;
  typing: Record<string, TypingInfo[]>; // conversationId -> list
  recording: Record<string, string[]>; // conversationId -> list userId
  nextCursor: Record<string, string | null>;

  fetchConversations: () => Promise<void>;
  setActiveConversation: (id: string | null) => void;
  fetchMessages: (conversationId: string) => Promise<void>;
  /**
   * Gửi tin nhắn. Ưu tiên socket `message:send` (kèm ack để biết kết quả),
   * fallback HTTP `POST /messages/:id/messages` khi socket chưa connect.
   */
  sendMessage: (conversationId: string, payload: Partial<Message>) => Promise<void>;
  addMessage: (conversationId: string, msg: Message) => void;
  setTyping: (conversationId: string, userId: string, username: string | null) => void;
  setRecording: (conversationId: string, userId: string, isRecording: boolean) => void;
  markConversationRead: (userId: string, lastMessageId: string) => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  loadingConversations: false,
  loadingMessages: false,
  typing: {},
  recording: {},
  nextCursor: {},

  fetchConversations: async () => {
    set({ loadingConversations: true });
    try {
      const res = await api.get("/conversations");
      set({ conversations: res.data.conversations });
    } catch (e) {
      console.error("fetchConversations", e);
    } finally {
      set({ loadingConversations: false });
    }
  },

  setActiveConversation: (id) => set({ activeConversationId: id }),

  fetchMessages: async (conversationId) => {
    set({ loadingMessages: true });
    try {
      const res = await api.get(`/messages/${conversationId}/messages?limit=30`);
      const items: Message[] = (res.data.items || []).reverse();
      set((s) => ({
        messages: { ...s.messages, [conversationId]: items },
        nextCursor: { ...s.nextCursor, [conversationId]: res.data.nextCursor },
      }));
    } catch (e) {
      console.error("fetchMessages", e);
    } finally {
      set({ loadingMessages: false });
    }
  },

  sendMessage: async (conversationId, payload) => {
    // Optimistic add — nếu là text/sticker/gif đã có đủ metadata,
    // hiện tại ta chờ server broadcast (qua socket) hoặc response (HTTP).
    // Để đơn giản và tránh duplicate, không thêm message vào store trước.
    const { getSocket } = await import("@/lib/socket");
    const socket = getSocket();
    if (socket?.connected) {
      // Dùng ack callback để biết kết quả
      const ack = await new Promise<{ ok: boolean; error?: string; status?: number; retryAfterMs?: number; message?: Message }>(
        (resolve) => {
          const t = setTimeout(
            () => resolve({ ok: false, error: "Timeout" }),
            15000
          );
          socket.emit(
            "message:send",
            { conversationId, ...payload },
            (response: any) => {
              clearTimeout(t);
              resolve(response || { ok: false, error: "Không nhận được phản hồi" });
            }
          );
        }
      );
      if (!ack.ok) {
        const e: any = new Error(ack.error || "Gửi thất bại");
        e.status = ack.status;
        e.retryAfterMs = ack.retryAfterMs;
        throw e;
      }
      // Server sẽ broadcast về qua `message:new` → addMessage tự chạy.
      return;
    }
    // Fallback HTTP
    try {
      const m = await api.post(`/messages/${conversationId}/messages`, {
        conversationId,
        ...payload,
      });
      get().addMessage(conversationId, m.data.message);
    } catch (e: any) {
      const err: any = new Error(
        e?.response?.data?.message || "Gửi thất bại"
      );
      err.status = e?.response?.status;
      throw err;
    }
  },

  addMessage: (conversationId, msg) => {
    set((s) => {
      const list = s.messages[conversationId] || [];
      // Tránh trùng
      if (list.some((m) => m._id === msg._id)) return s;
      return { messages: { ...s.messages, [conversationId]: [...list, msg] } };
    });
  },

  setTyping: (conversationId, userId, username) => {
    set((s) => {
      const list = s.typing[conversationId] || [];
      let next;
      if (username === null) {
        next = list.filter((t) => t.userId !== userId);
      } else {
        if (list.some((t) => t.userId === userId)) return s;
        next = [...list, { userId, username }];
      }
      return { typing: { ...s.typing, [conversationId]: next } };
    });
  },

  setRecording: (conversationId, userId, isRecording) => {
    set((s) => {
      const list = s.recording[conversationId] || [];
      const next = isRecording
        ? Array.from(new Set([...list, userId]))
        : list.filter((id) => id !== userId);
      return { recording: { ...s.recording, [conversationId]: next } };
    });
  },

  markConversationRead: (userId, lastMessageId) => {
    // Có thể dùng để cập nhật lastRead
  },

  clear: () =>
    set({
      conversations: [],
      messages: {},
      typing: {},
      recording: {},
      nextCursor: {},
      activeConversationId: null,
    }),
}));
