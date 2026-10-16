import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useChatStore } from "@/stores/useChatStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { chatService } from "@/services/chat.service";
import { useCallManager } from "@/components/call/GlobalCallManager";
import { Phone, Video, Plus, Search, Settings, X } from "lucide-react";
import { toast } from "sonner";
import MessageInput from "@/components/chat/MessageInput";
import MessageBubble from "@/components/chat/MessageBubble";
import type { Message, User } from "@/types/message";

const ChatPage = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    conversations,
    messages,
    fetchConversations,
    setActiveConversation,
    fetchMessages,
    sendMessage,
    addMessage,
  } = useChatStore();
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const call = useCallManager();

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (conversationId) {
      setActiveConversation(conversationId);
      fetchMessages(conversationId);
      setShowSidebar(false); // Ẩn sidebar khi vào conversation
    } else {
      setShowSidebar(true);
    }
  }, [conversationId]);

  const activeConv = conversations.find((c) => c._id === conversationId);
  const convMessages = conversationId ? messages[conversationId] || [] : [];

  const getOtherMember = (conv: any) => {
    if (conv.type === "direct") {
      return conv.members.find((m: any) => m.userId._id !== user?._id)?.userId;
    }
    return null;
  };

  const handleSend = async (payload: any) => {
    if (!conversationId) return;
    try {
      await sendMessage(conversationId, payload);
    } catch (e) {
      toast.error("Gửi thất bại");
    }
  };

  const handleStartCall = (type: "audio" | "video") => {
    if (!activeConv || activeConv.type !== "direct" || !user) return;
    const other = getOtherMember(activeConv);
    if (!other) return;
    call.startDirectCall({
      conversationId: activeConv._id,
      remoteUserId: other._id,
      remoteUser: other,
      type,
    });
  };

  const handleDeleteMessage = (msgId: string) => {
    if (!conversationId) return;
    const list = messages[conversationId] || [];
    useChatStore.setState({
      messages: {
        ...messages,
        [conversationId]: list.filter((m) => m._id !== msgId),
      },
    });
  };

  const filteredConvs = conversations.filter((c) => {
    if (!searchQ) return true;
    if (c.type === "group") {
      return c.name?.toLowerCase().includes(searchQ.toLowerCase());
    }
    const other = getOtherMember(c);
    return (
      other?.displayName?.toLowerCase().includes(searchQ.toLowerCase()) ||
      other?.username?.toLowerCase().includes(searchQ.toLowerCase())
    );
  });

  return (
    <div className="flex h-full">
      {/* Conversation list - ẩn trên mobile khi đang chat */}
      <aside
        className={`${
          showSidebar ? "flex" : "hidden"
        } lg:flex w-full lg:w-80 border-r flex-col overflow-hidden`}
      >
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Tin nhắn</h2>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                const name = prompt("Tên nhóm:");
                if (!name) return;
                chatService
                  .createGroup(name, [])
                  .then((c) => navigate(`/chat/${c._id}`))
                  .catch(() => toast.error("Tạo nhóm thất bại"));
              }}
              title="Tạo nhóm"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQ}
              onChange={(v: string) => setSearchQ(v)}
              placeholder="Tìm hội thoại..."
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConvs.length === 0 && (
            <p className="text-center text-sm text-muted-foreground p-8">
              Chưa có hội thoại
            </p>
          )}
          {filteredConvs.map((c) => {
            const other = getOtherMember(c);
            const name = c.type === "group" ? c.name : other?.displayName;
            const lastMsg = c.lastMessage;
            const isGroup = c.type === "group";
            return (
              <button
                key={c._id}
                onClick={() => navigate(`/chat/${c._id}`)}
                className={`w-full flex items-center gap-3 p-3 hover:bg-accent border-b text-left ${
                  conversationId === c._id ? "bg-accent" : ""
                }`}
              >
                <Avatar className="shrink-0">
                  <AvatarImage src={isGroup ? c.avatarUrl : other?.avatarUrl} />
                  <AvatarFallback>{name?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">{name}</p>
                    {lastMsg && (
                      <p className="text-xs text-muted-foreground shrink-0 ml-2">
                        {new Date(lastMsg.createdAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {lastMsg?.content ||
                      (lastMsg?.type && lastMsg.type !== "text"
                        ? `[${lastMsg.type}]`
                        : "Chưa có tin nhắn")}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Chat window */}
      <div
        className={`${
          !showSidebar ? "flex" : "hidden"
        } lg:flex flex-1 flex-col overflow-hidden`}
      >
        {conversationId && activeConv ? (
          <>
            {/* Header */}
            <div className="border-b p-3 flex items-center justify-between bg-background shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => navigate("/chat")}
                >
                  <X className="h-5 w-5" />
                </Button>
                <Avatar className="shrink-0">
                  <AvatarImage
                    src={
                      activeConv.type === "group"
                        ? activeConv.avatarUrl
                        : getOtherMember(activeConv)?.avatarUrl
                    }
                  />
                  <AvatarFallback>
                    {activeConv.type === "group"
                      ? activeConv.name?.[0]?.toUpperCase()
                      : getOtherMember(activeConv)?.displayName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {activeConv.type === "group"
                      ? activeConv.name
                      : getOtherMember(activeConv)?.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {activeConv.type === "group"
                      ? `${activeConv.members.length} thành viên`
                      : getOtherMember(activeConv)?.isOnline
                      ? "🟢 Đang online"
                      : "Offline"}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {activeConv.type === "direct" && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleStartCall("audio")}
                      title="Gọi thoại"
                    >
                      <Phone className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleStartCall("video")}
                      title="Gọi video"
                    >
                      <Video className="h-5 w-5" />
                    </Button>
                  </>
                )}
                {activeConv.type === "group" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/chat/${activeConv._id}/settings`)}
                    title="Cài đặt nhóm"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {convMessages.length === 0 && (
                <p className="text-center text-sm text-muted-foreground mt-8">
                  Hãy gửi tin nhắn đầu tiên
                </p>
              )}
              {convMessages.map((m, i) => {
                const sender = typeof m.senderId === "object" ? (m.senderId as User) : null;
                const isMe = sender?._id === user?._id;
                const prev = convMessages[i - 1];
                const showAvatar =
                  !isMe && (!prev || (typeof prev.senderId === "object" && (prev.senderId as User)._id !== sender?._id));
                const showName = activeConv.type === "group" && !isMe && showAvatar;
                return (
                  <MessageBubble
                    key={m._id}
                    msg={m}
                    isMe={isMe}
                    showAvatar={showAvatar}
                    showName={showName}
                    currentUser={user!}
                    onReply={setReplyTo}
                    onDeleted={handleDeleteMessage}
                    isGroup={activeConv.type === "group"}
                  />
                );
              })}
            </div>

            {/* Input */}
            <MessageInput
              conversationId={conversationId}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              onSend={handleSend}
            />
          </>
        ) : (
          <div className="flex-1 hidden lg:flex items-center justify-center text-muted-foreground">
            Chọn một cuộc trò chuyện
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
