// MessageList — danh sách tin nhắn với auto-scroll thông minh.
// Chỉ tự cuộn xuống khi user đang ở gần cuối; nếu user đang đọc lịch sử thì giữ nguyên.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import MessageBubble from "@/components/chat/MessageBubble";
import { TimeDivider } from "@/components/chat/TimeDivider";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message, User, Conversation } from "@/types/message";

interface MessageListProps {
  messages: Message[];
  currentUser: User;
  isGroup: boolean;
  loading?: boolean;
  onReply: (msg: Message) => void;
  onDeleted: (msgId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  conversation?: Conversation | null;
}

/**
 * Khoảng cách tối thiểu (ms) giữa 2 message để chèn time divider.
 * Spec: > 5 phút
 */
const DIVIDER_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Quyết định có chèn divider TRƯỚC message `m` không.
 * - Có: nếu (a) ngày khác với message trước, hoặc (b) cách > 5 phút.
 *   Nhưng nếu ngày khác, label sẽ theo ngày (do formatTimeLabel xử lý).
 * - Còn lại: false.
 */
const shouldShowDivider = (prev: Message | undefined, curr: Message): boolean => {
  if (!prev) return true; // message đầu tiên
  const prevDate = new Date(prev.createdAt);
  const currDate = new Date(curr.createdAt);
  // Khác ngày (theo local) → luôn hiện divider
  const prevDay = prevDate.toDateString();
  const currDay = currDate.toDateString();
  if (prevDay !== currDay) return true;
  // Cùng ngày, cách > 5 phút
  return currDate.getTime() - prevDate.getTime() > DIVIDER_THRESHOLD_MS;
};

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
  conversation,
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

  // Lắng nghe event scroll-to-message (khi user click vào reply quote)
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (!id) return;
      const container = scrollRef.current;
      if (!container) return;
      // Tìm bubble có data-msg-id
      const target = container.querySelector(
        `[data-msg-id="${CSS.escape(id)}"]`
      ) as HTMLElement | null;
      if (!target) return;
      // Scroll mượt tới bubble, canh giữa
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const offset =
        targetRect.top - containerRect.top + container.scrollTop - 100;
      container.scrollTo({ top: offset, behavior: "smooth" });
      // Flash highlight
      target.classList.add("mxh-flash-highlight");
      setTimeout(() => {
        target.classList.remove("mxh-flash-highlight");
      }, 1400);
    };
    window.addEventListener("mxh:scroll-to-message", handler);
    return () => window.removeEventListener("mxh:scroll-to-message", handler);
  }, []);

  const jumpToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setStickToBottom(true);
    setShowJumpToBottom(false);
  };

  return (
    <div className="relative flex-1 min-h-0 bg-orange-50/30 dark:bg-slate-900">
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
          <div className="space-y-0.5">
            {messages.map((m, i) => {
              const sender = typeof m.senderId === "object" ? (m.senderId as User) : null;
              const isMe = sender?._id === currentUser._id;
              const prev = messages[i - 1];

              // Xác định cụm message liên tiếp cùng sender
              const prevSender = prev
                ? typeof prev.senderId === "object"
                  ? (prev.senderId as User)._id
                  : (prev.senderId as string)
                : null;
              const currSender = sender?._id;
              const sameAsPrev = !!prev && prevSender === currSender;
              const withinMinute = sameAsPrev
                ? new Date(m.createdAt).getTime() -
                    new Date(prev!.createdAt).getTime() <
                  60_000
                : false;
              const isFirstOfCluster = !sameAsPrev || !withinMinute;

              // showAvatar: chỉ hiện ở đầu cụm (kể cả mình lẫn người khác)
              const showAvatar = isFirstOfCluster;
              // showName: chỉ hiện tên ở đầu cụm khi group
              const showName = isGroup && isFirstOfCluster;

              // Tìm tin nhắn cuối cùng của cụm isMe liên tiếp để gắn status
              // (chỉ áp dụng khi sender là mình, để tránh status hiện ở mỗi dòng)
              const isLastOfMyCluster = (() => {
                if (!isMe) return true; // không liên quan
                const next = messages[i + 1];
                if (!next) return true;
                const nextSender =
                  typeof next.senderId === "object"
                    ? (next.senderId as User)._id
                    : (next.senderId as string);
                if (nextSender !== currSender) return true;
                // cùng sender: còn trong cụm nếu cách < 1 phút
                return (
                  new Date(next.createdAt).getTime() -
                    new Date(m.createdAt).getTime() >=
                  60_000
                );
              })();

              const showDivider = shouldShowDivider(prev, m);

              return (
                <div
                  key={m._id}
                  className={cn(
                    "transition-colors hover:bg-accent/30",
                    !isFirstOfCluster ? "mt-0.5" : "mt-2.5"
                  )}
                >
                  {showDivider && <TimeDivider at={m.createdAt} />}
                  <MessageBubble
                    msg={m}
                    isMe={isMe}
                    showAvatar={showAvatar}
                    showName={showName}
                    currentUser={currentUser}
                    onReply={onReply}
                    onDeleted={onDeleted}
                    isGroup={isGroup}
                    conversation={conversation}
                    showStatus={isLastOfMyCluster}
                  />
                </div>
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
