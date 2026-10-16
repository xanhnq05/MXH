// ChatHeader — header hội thoại: avatar, tên, trạng thái, actions gom vào overflow menu.
// Bảo toàn call UI; không redesign call logic.

import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  BellOff,
  Bell,
  Pin,
  UserMinus,
  Settings as SettingsIcon,
  Info,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCallManager } from "@/components/call/GlobalCallManager";
import { useChatStore } from "@/stores/useChatStore";
import { chatService } from "@/services/chat.service";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/ConfirmDialogProvider";
import { cn } from "@/lib/utils";
import type { Conversation, Message } from "@/types/message";

interface ChatHeaderProps {
  conversation: Conversation;
  onBack?: () => void;
  onOpenDetails?: () => void;
}

const getOtherMember = (conv: Conversation, myId?: string) => {
  if (conv.type === "direct") {
    return conv.members.find((m) => m.userId._id !== myId)?.userId;
  }
  return null;
};

const formatLastSeen = (iso?: string) => {
  if (!iso) return "Offline";
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "Vừa truy cập";
  if (diffMin < 60) return `Hoạt động ${diffMin} phút trước`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hoạt động ${diffH} giờ trước`;
  return `Hoạt động ${d.toLocaleDateString("vi-VN")}`;
};

export const ChatHeader = ({ conversation, onBack, onOpenDetails }: ChatHeaderProps) => {
  const { user } = useAuthStore();
  const call = useCallManager();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const isGroup = conversation.type === "group";
  const other = getOtherMember(conversation, user?._id);
  const name = isGroup ? conversation.name : other?.displayName;
  const subtitle = isGroup
    ? `${conversation.members.length} thành viên`
    : other?.isOnline
      ? "Đang hoạt động"
      : formatLastSeen(other?.lastSeen);

  const isMuted = conversation.mutedBy?.some(
    (id) => id.toString() === user?._id
  );

  const handleStartCall = (type: "audio" | "video") => {
    if (!other || isGroup || !user) return;
    call.startDirectCall({
      conversationId: conversation._id,
      remoteUserId: other._id,
      remoteUser: other,
      type,
    });
  };

  const handleToggleMute = async () => {
    try {
      await chatService.mute(conversation._id, !isMuted);
      toast.success(isMuted ? "Đã bật thông báo" : "Đã tắt thông báo");
    } catch {
      toast.error("Không thể thay đổi");
    }
  };

  const handleLeaveGroup = async () => {
    const ok = await confirm({
      title: "Rời khỏi nhóm?",
      message: "Bạn sẽ không nhận được tin nhắn mới từ nhóm này nữa.",
      confirmLabel: "Rời nhóm",
      variant: "warning",
    });
    if (!ok) return;
    try {
      await chatService.leaveGroup(conversation._id);
      toast.success("Đã rời nhóm");
      navigate("/chat");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Không thể rời nhóm");
    }
  };

  return (
    <div className="border-b border-slate-200 dark:border-slate-800 px-3 py-2.5 flex items-center justify-between bg-background/95 dark:bg-slate-900/95 backdrop-blur shrink-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            title="Quay lại"
            className="lg:hidden -ml-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <button
          type="button"
          onClick={onOpenDetails}
          className="flex items-center gap-3 min-w-0 flex-1 text-left rounded-md px-1 py-1 hover:bg-accent/50 transition-colors"
        >
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={isGroup ? conversation.avatarUrl : other?.avatarUrl}
              />
              <AvatarFallback className="bg-greenx-gradient text-white text-sm font-semibold">
                {name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {other?.isOnline && !isGroup && (
              <span
                aria-label="Đang online"
                className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate text-foreground dark:text-white">{name}</p>
            <p
              className={cn(
                "text-xs truncate",
                other?.isOnline && !isGroup
                  ? "text-green-600 dark:text-green-400 font-medium"
                  : "text-muted-foreground dark:text-slate-400"
              )}
            >
              {subtitle}
            </p>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        {!isGroup && other && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleStartCall("audio")}
              title="Gọi thoại"
              className="text-muted-foreground hover:text-primary"
            >
              <Phone className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleStartCall("video")}
              title="Gọi video"
              className="text-muted-foreground hover:text-primary"
            >
              <Video className="h-5 w-5" />
            </Button>
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              title="Thêm"
              className="text-muted-foreground hover:text-primary"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={onOpenDetails}>
              <Info className="h-4 w-4 mr-2" /> Thông tin hội thoại
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleMute}>
              {isMuted ? (
                <>
                  <Bell className="h-4 w-4 mr-2" /> Bật thông báo
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4 mr-2" /> Tắt thông báo
                </>
              )}
            </DropdownMenuItem>
            {conversation.pinnedMessages && conversation.pinnedMessages.length > 0 && (
              <DropdownMenuItem
                onClick={() => {
                  const id = conversation.pinnedMessages?.[0];
                  if (id) navigate(`/chat/${conversation._id}#pinned-${id}`);
                }}
              >
                <Pin className="h-4 w-4 mr-2" /> Tin nhắn đã ghim
              </DropdownMenuItem>
            )}
            {isGroup && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate(`/chat/${conversation._id}/settings`)}
                >
                  <SettingsIcon className="h-4 w-4 mr-2" /> Cài đặt nhóm
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLeaveGroup}
                  className="text-destructive focus:text-destructive"
                >
                  <UserMinus className="h-4 w-4 mr-2" /> Rời nhóm
                </DropdownMenuItem>
              </>
            )}
            {!isGroup && other && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate(`/profile/${other._id}`)}
                >
                  <Info className="h-4 w-4 mr-2" /> Xem trang cá nhân
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export type { Message };
