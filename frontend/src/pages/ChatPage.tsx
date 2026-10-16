// ChatPage — Threads-like gọn + Instagram DM information architecture.
// Bố cục: InboxList trái (ẩn mobile khi mở hội thoại) + ChatPanel phải.
// Header: avatar, tên, last seen, online dot, overflow menu.

import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { useChatStore } from "@/stores/useChatStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { chatService } from "@/services/chat.service";
import { InboxList } from "@/components/chat/InboxList";
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
    }
  }, [conversationId, setActiveConversation, fetchMessages]);

  const activeConv = conversations.find((c) => c._id === conversationId);
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

  const handleCreateGroup = async () => {
    const name = window.prompt("Tên nhóm:");
    if (!name) return;
    try {
      const c = await chatService.createGroup(name, []);
      navigate(`/chat/${c._id}`);
    } catch {
      toast.error("Tạo nhóm thất bại");
    }
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
    </div>
  );
};

export default ChatPage;
