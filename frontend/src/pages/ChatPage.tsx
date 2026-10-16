// ChatPage — Threads-like gọn + Instagram DM information architecture.
// Bố cục: InboxList trái (ẩn mobile khi mở hội thoại) + ChatPanel phải.
// Header: avatar, tên, last seen, online dot, overflow menu.

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { useChatStore } from "@/stores/useChatStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { chatService } from "@/services/chat.service";
import { InboxList } from "@/components/chat/InboxList";
import { CreateGroupModal } from "@/components/chat/CreateGroupModal";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { MessageComposer } from "@/components/chat/MessageComposer";
import type { Message } from "@/types/message";

const ChatPage = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    conversations,
    messages,
    loadingConversations,
    loadingMessages,
    fetchConversations,
    setActiveConversation,
    fetchMessages,
    sendMessage,
  } = useChatStore();

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [showSidebar, setShowSidebar] = useState(!conversationId);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  // Track last messageId đã markRead để tránh gọi lại
  const markReadTimerRef = useRef<{ messageId?: string } | null>(null);

  // Sync sidebar visibility with route
  useEffect(() => {
    setShowSidebar(!conversationId);
  }, [conversationId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (conversationId) {
      setActiveConversation(conversationId);
      fetchMessages(conversationId);
      // Join socket room để nhận message:new của conversation này
      // (kể cả message do chính mình gửi)
      (async () => {
        const { getSocket } = await import("@/lib/socket");
        const s = getSocket();
        if (s?.connected) s.emit("conversation:join", conversationId);
      })();
    }
  }, [conversationId, setActiveConversation, fetchMessages]);

  // Auto markRead khi mở conversation: gọi server để broadcast message:read
  // (chỉ khi đã load xong messages và có lastMessageId)
  useEffect(() => {
    if (!conversationId) return;
    const list = messages[conversationId];
    if (!list || list.length === 0) return;
    const last = list[list.length - 1];
    if (!last?._id) return;
    // Tránh gọi lại khi message id không đổi
    if ((markReadTimerRef as any).current?.messageId === last._id) return;
    // Bỏ qua nếu last message là của mình (không cần mark read cho mình)
    const myId = user?._id;
    const senderId =
      typeof last.senderId === "object" ? (last.senderId as any)._id : last.senderId;
    if (senderId === myId) {
      (markReadTimerRef as any).current = { messageId: last._id };
      return;
    }
    // Debounce 500ms
    const timer = setTimeout(() => {
      useChatStore.getState().markAllRead(conversationId, last._id);
      (markReadTimerRef as any).current = { messageId: last._id };
    }, 500);
    return () => clearTimeout(timer);
  }, [conversationId, messages, user?._id]);

  const safeConversations = Array.isArray(conversations) ? conversations : [];
  const activeConv = safeConversations.find((c) => c._id === conversationId);
  const convMessages = conversationId ? messages[conversationId] || [] : [];

  const handleSend = useCallback(
    async (payload: any) => {
      if (!conversationId) return;
      try {
        await sendMessage(conversationId, payload);
      } catch (e: any) {
        const m = e?.response?.data?.message;
        toast.error(m || "Gửi thất bại");
        throw e;
      }
    },
    [conversationId, sendMessage]
  );

  const handleDeleteMessage = useCallback(
    (msgId: string) => {
      if (!conversationId) return;
      const list = messages[conversationId] || [];
      useChatStore.setState({
        messages: {
          ...messages,
          [conversationId]: list.filter((m) => m._id !== msgId),
        },
      });
    },
    [conversationId, messages]
  );

  const handleCreateGroup = () => {
    setCreateGroupOpen(true);
  };

  return (
    <div className="flex h-full bg-background">
      {/* Inbox */}
      <aside
        className={`${
          showSidebar ? "flex" : "hidden"
        } lg:flex w-full lg:w-[340px] xl:w-[360px] border-r flex-col overflow-hidden`}
      >
        <InboxList
          searchQ={searchQ}
          onSearchChange={setSearchQ}
          onSelect={() => setShowSidebar(false)}
          onCreateGroup={handleCreateGroup}
        />
      </aside>

      {/* Conversation */}
      <main
        className={`${
          !showSidebar ? "flex" : "hidden"
        } lg:flex flex-1 flex-col overflow-hidden min-w-0`}
      >
        {conversationId && activeConv ? (
          <>
            <ChatHeader
              conversation={activeConv}
              onBack={() => {
                setShowSidebar(true);
                navigate("/chat");
              }}
              onOpenDetails={() => {
                if (activeConv.type === "group") {
                  navigate(`/chat/${activeConv._id}/settings`);
                }
              }}
            />
            <MessageList
              messages={convMessages}
              currentUser={user!}
              isGroup={activeConv.type === "group"}
              loading={loadingMessages}
              onReply={setReplyTo}
              onDeleted={handleDeleteMessage}
              conversation={activeConv}
            />
            <MessageComposer
              conversationId={conversationId}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              onSend={handleSend}
            />
          </>
        ) : (
          <div className="flex-1 hidden lg:flex items-center justify-center px-6 text-center">
            <div>
              <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center text-2xl mb-4">
                💬
              </div>
              <p className="font-semibold">Chọn một cuộc trò chuyện</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-[280px]">
                Hoặc tạo nhóm mới từ danh sách bên trái để bắt đầu trò chuyện.
              </p>
            </div>
          </div>
        )}
      </main>

      <CreateGroupModal
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        onCreated={(id) => {
          fetchConversations();
          navigate(`/chat/${id}`);
        }}
      />
    </div>
  );
};

export default ChatPage;
