// InboxList — danh sách hội thoại (Threads-like gọn, IG DM information architecture).
// Highlight active = border + cam nhạt; không đổi background đậm gây chói.
// Empty / loading / error state đều có hướng dẫn.

import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Search, Plus, MessageCircle, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { useChatStore } from "@/stores/useChatStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { chatService } from "@/services/chat.service";
import { CreateGroupModal } from "./CreateGroupModal";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/message";

interface InboxListProps {
  searchQ: string;
  onSearchChange: (q: string) => void;
  onSelect?: () => void;
  onCreateGroup?: () => void;
}

const formatPreviewTime = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60 * 60 * 24 * 7) {
    return d.toLocaleDateString("vi-VN", { weekday: "short" });
  }
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
};

const getOtherMember = (conv: Conversation, myId?: string) => {
  if (conv.type === "direct") {
    return conv.members.find((m) => m.userId._id !== myId)?.userId;
  }
  return null;
};

const getInitials = (name?: string) =>
  (name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const InboxList = ({
  searchQ,
  onSearchChange,
  onSelect,
  onCreateGroup,
}: InboxListProps) => {
  const { user } = useAuthStore();
  const rawConversations = useChatStore((s) => s.conversations);
  const conversations = Array.isArray(rawConversations) ? rawConversations : [];
  const { loadingConversations, fetchConversations } = useChatStore();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      if (c.type === "group") {
        return c.name?.toLowerCase().includes(q);
      }
      const other = getOtherMember(c, user?._id);
      return (
        other?.displayName?.toLowerCase().includes(q) ||
        other?.username?.toLowerCase().includes(q)
      );
    });
  }, [conversations, searchQ, user?._id]);

  const handleCreateGroup = () => {
    if (onCreateGroup) {
      onCreateGroup();
      return;
    }
    // Mở modal tạo nhóm
    setCreateOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Tin nhắn</h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleCreateGroup}
            title="Tạo nhóm mới"
            className="text-muted-foreground hover:text-primary"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQ}
            onChange={onSearchChange as any}
            placeholder="Tìm bạn bè..."
            className="pl-9"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loadingConversations && conversations.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            <Spinner className="mr-2" />
            Đang tải hội thoại...
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={<MessageCircle className="h-10 w-10" />}
            title="Chưa có hội thoại"
            description="Bắt đầu trò chuyện với bạn bè hoặc tạo nhóm mới."
            actionLabel="Tạo nhóm"
            onAction={handleCreateGroup}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Search className="h-8 w-8" />}
            title="Không tìm thấy"
            description={`Không có hội thoại nào khớp với "${searchQ}".`}
          />
        ) : (
          <ul className="divide-y">
            {filtered.map((c) => {
              const other = getOtherMember(c, user?._id);
              const isGroup = c.type === "group";
              const name = isGroup ? c.name : other?.displayName;
              const lastMsg = c.lastMessage;
              const preview = lastMsg?.content ||
                (lastMsg?.type && lastMsg.type !== "text"
                  ? mediaPreviewLabel(lastMsg.type as string)
                  : "Chưa có tin nhắn");

              return (
                <li key={c._id}>
                  <button
                    type="button"
                    onClick={() => {
                      navigate(`/chat/${c._id}`);
                      onSelect?.();
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                      "hover:bg-accent/60 focus-visible:outline-none focus-visible:bg-accent",
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={isGroup ? c.avatarUrl : other?.avatarUrl}
                        />
                        <AvatarFallback className="bg-greenx-gradient text-white text-sm font-semibold">
                          {getInitials(name)}
                        </AvatarFallback>
                      </Avatar>
                      {other?.isOnline && !isGroup && (
                        <span
                          aria-label="Đang online"
                          className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm truncate text-foreground dark:text-white">
                          {name}
                        </p>
                        {lastMsg?.createdAt && (
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {formatPreviewTime(lastMsg.createdAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {preview}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {!loadingConversations && conversations.length > 0 && (
          <div className="px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={() => fetchConversations()}
            >
              Làm mới
            </Button>
          </div>
        )}
      </div>

      <CreateGroupModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => {
          fetchConversations();
          navigate(`/chat/${id}`);
        }}
      />
    </div>
  );
};

const mediaPreviewLabel = (type: string) => {
  switch (type) {
    case "image":
      return "📷 Hình ảnh";
    case "file":
      return "📎 Tệp đính kèm";
    case "voice":
      return "🎤 Tin nhắn thoại";
    case "sticker":
      return "🖼️ Sticker";
    case "gif":
      return "🎞️ GIF";
    case "share_post":
      return "🔗 Bài viết";
    default:
      return "";
  }
};

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState = ({ icon, title, description, actionLabel, onAction }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center text-muted-foreground">
    <div className="mb-3 opacity-50">{icon}</div>
    <p className="font-medium text-foreground">{title}</p>
    {description && <p className="text-xs mt-1 max-w-[260px]">{description}</p>}
    {actionLabel && onAction && (
      <Button variant="outline" size="sm" className="mt-4" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);

interface InboxErrorStateProps {
  error: string;
  onRetry: () => void;
}

export const InboxErrorState = ({ error, onRetry }: InboxErrorStateProps) => (
  <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center text-muted-foreground">
    <AlertCircle className="h-8 w-8 text-destructive mb-3" />
    <p className="font-medium text-foreground">Không tải được hội thoại</p>
    <p className="text-xs mt-1 max-w-[260px]">{error}</p>
    <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
      Thử lại
    </Button>
  </div>
);
