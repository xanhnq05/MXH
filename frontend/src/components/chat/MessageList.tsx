// MessageList — danh sách tin nhắn với auto-scroll thông minh.
// Chỉ tự cuộn xuống khi user đang ở gần cuối; nếu user đang đọc lịch sử thì giữ nguyên.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import MessageBubble from "@/components/chat/MessageBubble";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import type { Message, User } from "@/types/message";

interface MessageListProps {
  messages: Message[];
  currentUser: User;
  isGroup: boolean;
  loading?: boolean;
  onReply: (msg: Message) => void;
  onDeleted: (msgId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const STICKY_OFFSET = 80; // px from bottom that still counts as "near bottom"

export const MessageList = ({
  messages,
  currentUser,
  isGroup,
  loading,
  onReply,
  onDeleted,
  onLoadMore,
  hasMore,
}: MessageListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(0);
  const lastIdRef = useRef<string | null>(null);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [stickToBottom, setStickToBottom] = useState(true);

  // Track whether the user is near the bottom
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = distanceFromBottom <= STICKY_OFFSET;
    setStickToBottom(near);
    setShowJumpToBottom(!near && messages.length > 0);
  };

  // Auto-scroll on new message only if user is near bottom
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const newCount = messages.length;
    const lastMsg = messages[newCount - 1];
    const isNew = lastMsg && lastMsg._id !== lastIdRef.current;
    if (isNew && stickToBottom) {
      el.scrollTop = el.scrollHeight;
    } else if (isNew && !stickToBottom && lastMsg?.senderId &&
      (typeof lastMsg.senderId === "object" && (lastMsg.senderId as User)._id === currentUser._id) &&
      stickToBottom) {
      // sent by me and near bottom → scroll
      el.scrollTop = el.scrollHeight;
    }
    lastCountRef.current = newCount;
    lastIdRef.current = lastMsg?._id ?? null;
  }, [messages, stickToBottom, currentUser._id]);

  // Initial mount: scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const jumpToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setStickToBottom(true);
    setShowJumpToBottom(false);
  };

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-auto px-3 md:px-4 py-4"
      >
        {hasMore && (
          <div className="flex justify-center mb-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={onLoadMore}
            >
              Tải thêm tin nhắn cũ
            </Button>
          </div>
        )}

        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            <Spinner className="mr-2" /> Đang tải tin nhắn...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm px-6 text-center">
            <p className="font-medium text-foreground">Hãy gửi tin nhắn đầu tiên</p>
            <p className="text-xs mt-1 max-w-[260px]">
              Nhắn một câu chào, gửi ảnh hoặc sticker để bắt đầu cuộc trò chuyện.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {messages.map((m, i) => {
              const sender = typeof m.senderId === "object" ? (m.senderId as User) : null;
              const isMe = sender?._id === currentUser._id;
              const prev = messages[i - 1];
              const showAvatar =
                !isMe &&
                (!prev ||
                  (typeof prev.senderId === "object" &&
                    (prev.senderId as User)._id !== sender?._id));
              const showName = isGroup && !isMe && showAvatar;
              return (
                <MessageBubble
                  key={m._id}
                  msg={m}
                  isMe={isMe}
                  showAvatar={showAvatar}
                  showName={showName}
                  currentUser={currentUser}
                  onReply={onReply}
                  onDeleted={onDeleted}
                  isGroup={isGroup}
                />
              );
            })}
          </div>
        )}
      </div>

      {showJumpToBottom && (
        <Button
          size="icon"
          variant="secondary"
          onClick={jumpToBottom}
          className="absolute bottom-4 right-4 h-9 w-9 rounded-full shadow-lg"
          title="Cuộn xuống cuối"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
