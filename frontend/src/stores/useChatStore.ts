import { create } from "zustand";
import type { Conversation, Message } from "@/types/message";
import api from "@/lib/axios";
import { useAuthStore } from "./useAuthStore";

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
   * Cập nhật preview (lastMessage + lastMessageAt + đẩy lên đầu) cho 1 conversation
   * khi nhận message:new mà user chưa mở conv đó.
   */
  refreshConversationPreview: (msg: Message) => void;
  /**
   * Gửi tin nhắn. Ưu tiên socket `message:send` (kèm ack để biết kết quả),
   * fallback HTTP `POST /messages/:id/messages` khi socket chưa connect.
   */
  sendMessage: (conversationId: string, payload: Partial<Message>) => Promise<void>;
  /**
   * Gửi lại message đã failed. Reset về pending, gọi lại sendMessage.
   */
  retryMessage: (conversationId: string, messageId: string) => Promise<void>;
  addMessage: (conversationId: string, msg: Message) => void;
  setTyping: (conversationId: string, userId: string, username: string | null) => void;
  setRecording: (conversationId: string, userId: string, isRecording: boolean) => void;
  markConversationRead: (userId: string, lastMessageId: string) => void;
  /**
   * Đánh dấu đã đọc hết conv (cập nhật trên server)
   * → server sẽ broadcast message:read để các sender update tick.
   */
  markAllRead: (conversationId: string, lastMessageId: string) => Promise<void>;
  /**
   * Cập nhật trạng thái delivered/read cho 1 message (từ socket event).
   * - delivered: thêm userId vào deliveries (nếu chưa có)
   * - read: thêm readAt
   */
  markMessageDelivered: (
    conversationId: string,
    messageId: string,
    userId: string,
    at: string
  ) => void;
  markMessageRead: (
    conversationId: string,
    userId: string,
    at: string
  ) => void;
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
      const list = Array.isArray(res.data?.items)
        ? res.data.items
        : Array.isArray(res.data?.conversations)
          ? res.data.conversations
          : [];
      set({ conversations: list });
    } catch (e) {
      console.error("fetchConversations", e);
      set({ conversations: [] });
    } finally {
      set({ loadingConversations: false });
    }
  },

  setActiveConversation: (id) => set({ activeConversationId: id }),

  refreshConversationPreview: (msg) => {
    set((s) => {
      const list = Array.isArray(s.conversations) ? s.conversations : [];
      const idx = list.findIndex((c) => c._id === msg.conversationId);
      if (idx === -1) return s;
      const updated = { ...list[idx] };
      updated.lastMessage = {
        _id: msg._id,
        content: msg.content,
        type: msg.type,
        fileUrl: msg.fileUrl,
        stickerUrl: msg.stickerUrl,
        createdAt: msg.createdAt,
      } as any;
      updated.lastMessageAt = msg.createdAt;
      const next = [updated, ...list.slice(0, idx), ...list.slice(idx + 1)];
      return { conversations: next };
    });
  },

  fetchMessages: async (conversationId) => {
    set({ loadingMessages: true });
    try {
      const res = await api.get(`/messages/${conversationId}/messages?limit=30`);
      const raw: any[] = Array.isArray(res.data?.items) ? res.data.items : [];
      const items: Message[] = raw.slice().reverse();
      set((s) => ({
        messages: { ...s.messages, [conversationId]: items },
        nextCursor: { ...s.nextCursor, [conversationId]: res.data?.nextCursor ?? null },
      }));
    } catch (e) {
      console.error("fetchMessages", e);
    } finally {
      set({ loadingMessages: false });
    }
  },

  sendMessage: async (conversationId, payload) => {
    // Tạo temp message để hiển thị ngay (optimistic).
    // Server sẽ broadcast về qua `message:new` → addMessage tự chạy,
    // và ta sẽ thay thế tempId bằng _id thật.
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const myId = useAuthStore?.getState?.()?.user?._id;
    const tempMsg: any = {
      _id: tempId,
      conversationId,
      senderId: myId || { _id: "me" },
      content: payload.content || "",
      type: payload.type || "text",
      fileUrl: payload.fileUrl,
      fileKey: payload.fileKey,
      fileName: payload.fileName,
      fileSize: payload.fileSize,
      stickerId: payload.stickerId,
      stickerUrl: payload.stickerUrl,
      replyTo: payload.replyTo,
      createdAt: new Date().toISOString(),
      isEncrypted: payload.isEncrypted,
      isRead: false,
      _pending: true,
    };
    get().addMessage(conversationId, tempMsg);

    const setFailed = () => {
      set((s) => {
        const list = s.messages[conversationId] || [];
        return {
          messages: {
            ...s.messages,
            [conversationId]: list.map((m) =>
              m._id === tempId
                ? ({ ...m, _pending: false, _failed: true } as any)
                : m
            ),
          },
        };
      });
    };

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
        // Đánh dấu failed (giữ message để user thấy + có thể retry)
        setFailed();
        const e: any = new Error(ack.error || "Gửi thất bại");
        e.status = ack.status;
        e.retryAfterMs = ack.retryAfterMs;
        e._tempId = tempId;
        throw e;
      }
      // Thay thế temp message bằng message thật từ server (nếu socket broadcast trước ack thì đã có rồi → dedup)
      if (ack.message) {
        set((s) => {
          const list = s.messages[conversationId] || [];
          // Nếu đã có message thật (do broadcast), chỉ xóa temp
          if (list.some((m) => m._id === ack.message!._id)) {
            return {
              messages: {
                ...s.messages,
                [conversationId]: list.filter((m) => m._id !== tempId),
              },
            };
          }
          // Nếu chưa có (chậm broadcast), thay thế temp
          return {
            messages: {
              ...s.messages,
              [conversationId]: list.map((m) => (m._id === tempId ? ack.message! : m)),
            },
          };
        });
      }
      return;
    }
    // Fallback HTTP
    try {
      const m = await api.post(`/messages/${conversationId}/messages`, {
        conversationId,
        ...payload,
      });
      // Thay thế temp bằng message thật
      set((s) => {
        const list = s.messages[conversationId] || [];
        return {
          messages: {
            ...s.messages,
            [conversationId]: list.map((mm) =>
              mm._id === tempId ? m.data.message : mm
            ),
          },
        };
      });
    } catch (e: any) {
      // Đánh dấu failed (giữ message để user thấy + có thể retry)
      setFailed();
      const err: any = new Error(
        e?.response?.data?.message || "Gửi thất bại"
      );
      err.status = e?.response?.status;
      err._tempId = tempId;
      throw err;
    }
  },

  /**
   * Thử gửi lại message đã failed.
   * Tìm theo _id (tempId hoặc _id thật), reset trạng thái về pending,
   * rồi gọi lại sendMessage.
   */
  retryMessage: async (conversationId: string, messageId: string) => {
    const list = get().messages[conversationId] || [];
    const m = list.find((x) => x._id === messageId);
    if (!m) return;
    // Reset failed → pending
    set((s) => {
      const lst = s.messages[conversationId] || [];
      return {
        messages: {
          ...s.messages,
          [conversationId]: lst.map((x) =>
            x._id === messageId
              ? ({ ...x, _failed: false, _pending: true } as any)
              : x
          ),
        },
      };
    });
    try {
      await get().sendMessage(conversationId, {
        content: m.content,
        type: m.type,
        fileUrl: m.fileUrl,
        fileKey: (m as any).fileKey,
        fileName: m.fileName,
        fileSize: m.fileSize,
        stickerId: (m as any).stickerId,
        stickerUrl: m.stickerUrl,
        replyTo: typeof m.replyTo === "object" ? m.replyTo?._id : m.replyTo,
        isEncrypted: (m as any).isEncrypted,
      } as any);
    } catch {
      // đã set _failed lại trong sendMessage
    }
  },

  addMessage: (conversationId, msg) => {
    set((s) => {
      const list = s.messages[conversationId] || [];
      // Tránh trùng theo _id
      if (list.some((m) => m._id === msg._id)) return s;
      // Nếu đang có temp message của cùng sender gần đây với cùng content → thay thế
      const tempIdx = list.findIndex(
        (m) =>
          (m._id as string).startsWith("temp_") &&
          typeof m.senderId === "object" &&
          (m.senderId as any)._id === (msg.senderId as any)?._id &&
          m.content === msg.content &&
          Math.abs(
            new Date(m.createdAt as string).getTime() -
              new Date(msg.createdAt as string).getTime()
          ) < 10000
      );
      if (tempIdx >= 0) {
        const newList = [...list];
        newList[tempIdx] = msg;
        return { messages: { ...s.messages, [conversationId]: newList } };
      }
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

  markAllRead: async (conversationId, lastMessageId) => {
    try {
      await api.post(`/messages/${conversationId}/read`, { lastMessageId });
    } catch (e) {
      console.warn("markAllRead failed", e);
    }
  },

  /**
   * Đánh dấu 1 message đã được delivered tới userId (server vừa push).
   * Nếu userId đã có trong deliveries → cập nhật deliveredAt.
   * Nếu chưa có → thêm mới.
   */
  markMessageDelivered: (conversationId, messageId, userId, at) => {
    set((s) => {
      const list = s.messages[conversationId] || [];
      const idx = list.findIndex((m) => m._id === messageId);
      if (idx === -1) return s;
      const m = list[idx];
      const deliveries = Array.isArray(m.deliveries) ? [...m.deliveries] : [];
      const dIdx = deliveries.findIndex(
        (d) => (d.userId as any)?._id === userId || d.userId === userId
      );
      if (dIdx >= 0) {
        deliveries[dIdx] = { ...deliveries[dIdx], deliveredAt: at };
      } else {
        deliveries.push({ userId, deliveredAt: at, readAt: null });
      }
      const newList = [...list];
      newList[idx] = { ...m, deliveries };
      return { messages: { ...s.messages, [conversationId]: newList } };
    });
  },

  /**
   * Đánh dấu tất cả message trước at (timestamp) của userId đã được đọc.
   */
  markMessageRead: (conversationId, userId, at) => {
    set((s) => {
      const list = s.messages[conversationId] || [];
      const atTime = new Date(at).getTime();
      let changed = false;
      const newList = list.map((m) => {
        // Chỉ áp dụng cho message mà user này chưa đọc (readAt null)
        const deliveries = Array.isArray(m.deliveries) ? [...m.deliveries] : [];
        const dIdx = deliveries.findIndex(
          (d) => (d.userId as any)?._id === userId || d.userId === userId
        );
        const msgTime = new Date(m.createdAt).getTime();
        if (msgTime > atTime) return m; // message mới hơn at, bỏ qua
        if (dIdx === -1) {
          // Thêm mới với deliveredAt = at (server cùng lúc ghi delivered)
          changed = true;
          deliveries.push({ userId, deliveredAt: at, readAt: at });
          return { ...m, deliveries };
        }
        if (!deliveries[dIdx].readAt) {
          changed = true;
          deliveries[dIdx] = { ...deliveries[dIdx], readAt: at };
          return { ...m, deliveries };
        }
        return m;
      });
      if (!changed) return s;
      return { messages: { ...s.messages, [conversationId]: newList } };
    });
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
