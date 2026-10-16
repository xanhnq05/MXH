import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
import { useChatStore } from "@/stores/useChatStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useCallStore } from "@/stores/useCallStore";
import { useMessageSound } from "./useSound";

export const useSocket = () => {
  const { accessToken } = useAuthStore();
  const { addMessage, setTyping, setRecording } = useChatStore();
    const { addNotification, incrementUnread, removeNotifications } = useNotificationStore();
  const { setIncomingCall } = useCallStore();
  const { play } = useMessageSound();

  // Stable ref to track whether listeners are currently registered
  const listenersRef = useRef<boolean>(false);

  useEffect(() => {
    if (!accessToken) {
      disconnectSocket();
      listenersRef.current = false;
      return;
    }

    const socket = connectSocket();

    // Prevent double-registration in StrictMode
    if (listenersRef.current) return;
    listenersRef.current = true;

    const handler = (msg: any) => {
      if (msg.conversationId === useChatStore.getState().activeConversationId) {
        play();
      }
    };

    socket.on("message:new", (m) => {
      addMessage(m.conversationId, m);
      if (m.conversationId === useChatStore.getState().activeConversationId) {
        play();
      } else {
        // Cập nhật preview trong InboxList (lastMessage + order)
        useChatStore.getState().refreshConversationPreview(m);
      }
    });
    socket.on("message:read", (data) => {
      // data: { conversationId, userId, lastMessageId, readAt }
      if (data?.conversationId && data?.userId && data?.readAt) {
        useChatStore
          .getState()
          .markMessageRead(data.conversationId, data.userId, data.readAt);
      }
      useChatStore
        .getState()
        .markConversationRead(data.userId, data.lastMessageId);
    });
    socket.on("message:delivered", (data) => {
      // data: { messageId, conversationId, recipientId, deliveredAt }
      if (data?.messageId && data?.recipientId && data?.deliveredAt) {
        useChatStore.getState().markMessageDelivered(
          data.conversationId,
          data.messageId,
          data.recipientId,
          data.deliveredAt
        );
      }
    });
    socket.on("typing:start", (data) => {
      setTyping(data.conversationId, data.userId, data.username);
    });
    socket.on("typing:stop", (data) => {
      setTyping(data.conversationId, data.userId, null);
    });
    socket.on("recording:start", (data) => {
      setRecording(data.conversationId, data.userId, true);
    });
    socket.on("recording:stop", (data) => {
      setRecording(data.conversationId, data.userId, false);
    });
    socket.on("notification:new", (n) => {
      addNotification(n);
      incrementUnread();
    });
    socket.on("notification:deleted", (data) => {
      // Khi admin xóa campaign -> xóa các notif tương ứng khỏi list realtime
      if (data && Array.isArray(data.ids)) {
        removeNotifications(data.ids);
      }
    });
    socket.on("user:online", (data) => {
      useAuthStore.getState().updateUserStatus(data.userId, true);
    });
    socket.on("user:offline", (data) => {
      useAuthStore.getState().updateUserStatus(data.userId, false);
    });
    socket.on("call:offer", (data) => {
      setIncomingCall(data);
    });
    socket.on("call:offer:group", (data) => {
      setIncomingCall({ ...data, isGroup: true });
    });

    return () => {
      listenersRef.current = false;
      socket.off("message:new");
      socket.off("message:read");
      socket.off("message:delivered");
      socket.off("typing:start");
      socket.off("typing:stop");
      socket.off("recording:start");
      socket.off("recording:stop");
      socket.off("notification:new");
      socket.off("notification:deleted");
      socket.off("user:online");
      socket.off("user:offline");
      socket.off("call:offer");
      socket.off("call:offer:group");
    };
  }, [accessToken, addMessage, setTyping, setRecording, addNotification, incrementUnread, removeNotifications, setIncomingCall, play]);

  return { socket: getSocket() };
};
