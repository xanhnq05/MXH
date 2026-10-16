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
    // Gửi qua socket ưu tiên, fallback HTTP
    const { getSocket } = await import("@/lib/socket");
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit("message:send", { conversationId, ...payload });
    } else {
      // fallback
      const m = await api.post(`/messages/${conversationId}/messages`, payload);
      get().addMessage(conversationId, m.data.message);
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
