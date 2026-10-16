import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
import { useChatStore } from "@/stores/useChatStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { useCallStore } from "@/stores/useCallStore";
import { useMessageSound } from "./useSound";

export const useSocket = () => {
  const { accessToken } = useAuthStore();
  const { addMessage, setTyping, setRecording } = useChatStore();
  const { addNotification, incrementUnread } = useNotificationStore();
  const { setIncomingCall } = useCallStore();
  const { play } = useMessageSound();
  const initialized = useRef(false);

  useEffect(() => {
    if (!accessToken) {
      disconnectSocket();
      initialized.current = false;
      return;
    }
    if (initialized.current) return;
    initialized.current = true;

    const socket = connectSocket();
    const handler = (msg: any) => {
      if (msg.conversationId === useChatStore.getState().activeConversationId) {
        play();
      }
    };

    socket.on("message:new", (m) => {
      addMessage(m.conversationId, m);
      if (m.conversationId === useChatStore.getState().activeConversationId) {
        play();
      }
    });
    socket.on("message:read", (data) => {
      useChatStore.getState().markConversationRead(data.userId, data.lastMessageId);
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
      socket.off("message:new", handler);
      socket.off("message:read");
      socket.off("typing:start");
      socket.off("typing:stop");
      socket.off("recording:start");
      socket.off("recording:stop");
      socket.off("notification:new");
      socket.off("user:online");
      socket.off("user:offline");
      socket.off("call:offer");
      socket.off("call:offer:group");
    };
  }, [accessToken]);

  return { socket: getSocket() };
};
