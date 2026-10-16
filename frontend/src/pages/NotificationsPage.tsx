// NotificationsPage - Redesign với theme cam GreenX + avatar + realtime
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Bell, CheckCheck, Clock, Heart, MessageCircle, UserPlus, UserCheck, Users, Phone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { notificationService } from "@/services/other.service";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/notification";

const NOTIFICATION_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  friend_request: { icon: <UserPlus className="h-5 w-5" />, color: "text-blue-500 bg-blue-50" },
  friend_accept: { icon: <UserCheck className="h-5 w-5" />, color: "text-green-500 bg-green-50" },
  post_like: { icon: <Heart className="h-5 w-5" />, color: "text-red-500 bg-red-50" },
  post_comment: { icon: <MessageCircle className="h-5 w-5" />, color: "text-blue-500 bg-blue-50" },
  comment_reply: { icon: <MessageCircle className="h-5 w-5" />, color: "text-blue-500 bg-blue-50" },
  new_message: { icon: <MessageCircle className="h-5 w-5" />, color: "text-purple-500 bg-purple-50" },
  added_to_group: { icon: <Users className="h-5 w-5" />, color: "text-teal-500 bg-teal-50" },
  call_missed: { icon: <Phone className="h-5 w-5" />, color: "text-orange-500 bg-orange-50" },
  system: { icon: <Bell className="h-5 w-5" />, color: "text-slate-500 bg-slate-50" },
};

const NOTIFICATION_LINKS: Record<string, (refId: string, senderId: string) => string> = {
  friend_request: (refId, senderId) => `/profile/${senderId}`,
  friend_accept: (refId, senderId) => `/profile/${senderId}`,
  post_like: (refId) => `/post/${refId}`,
  post_comment: (refId) => `/post/${refId}`,
  comment_reply: (refId) => `/post/${refId}`,
  new_message: () => "/chat",
  added_to_group: (refId) => `/chat?conversationId=${refId}`,
  call_missed: (refId) => `/profile/${refId}`,
  system: () => "/",
};

const getInitials = (name?: string) =>
  (name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const NotificationsPage = () => {
  const { list, setList, markRead, markAllRead, unreadCount, setUnreadCount } =
    useNotificationStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const data = await notificationService.list();
      setList(data.items || []);
      const count = await notificationService.unreadCount();
      setUnreadCount(count);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (n: Notification) => {
    if (n.isRead) return;
    await notificationService.markRead(n._id);
    markRead(n._id);
  };

  return (
    <div className="h-full overflow-y-auto bg-orange-50/30">
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Thông báo</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-slate-500 mt-0.5">
                {unreadCount} thông báo chưa đọc
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await markAllRead();
                await load();
              }}
              className="border-orange-200 text-orange-600 hover:bg-orange-50 gap-1.5"
            >
              <CheckCheck className="h-4 w-4" />
              Đánh dấu tất cả đã đọc
            </Button>
          )}
        </div>

        {/* Notifications list */}
        <div className="space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
            </div>
          )}

          {!loading && list.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-orange-100">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-50 flex items-center justify-center text-orange-400 mb-3">
                <Bell className="h-8 w-8" />
              </div>
              <p className="font-semibold text-slate-700">Chưa có thông báo</p>
              <p className="text-sm text-slate-500 mt-1">
                Các thông báo về lời mời kết bạn, tin nhắn sẽ hiện ở đây
              </p>
            </div>
          )}

          {list.map((n) => {
            const cfg = NOTIFICATION_ICONS[n.type] || NOTIFICATION_ICONS.system;
            const link = NOTIFICATION_LINKS[n.type]?.(n.refId || "", String(n.senderId?._id || n.senderId || "")) || "/";
            const senderName = n.senderName || (typeof n.senderId === "object" ? n.senderId?.displayName : null) || n.text?.split(" ")[0] || "Một người";
            const senderAvatar = n.senderAvatar || (typeof n.senderId === "object" ? n.senderId?.avatarUrl : null) || "";

            return (
              <Link
                key={n._id}
                to={link}
                onClick={() => handleMarkRead(n)}
                className={cn(
                  "flex items-start gap-3 p-3 sm:p-4 rounded-2xl border transition-all",
                  n.isRead
                    ? "bg-white border-orange-100 opacity-70"
                    : "bg-white border-orange-200 shadow-sm"
                )}
              >
                {/* Sender avatar or notification icon */}
                {n.senderId ? (
                  <div className="relative">
                    <Avatar className="h-12 w-12 sm:h-14 sm:w-14 ring-2 ring-orange-100">
                      <AvatarImage src={senderAvatar} alt={senderName} />
                      <AvatarFallback className="bg-greenx-gradient text-white font-semibold">
                        {getInitials(senderName)}
                      </AvatarFallback>
                    </Avatar>
                    {/* Type icon badge */}
                    <div
                      className={cn(
                        "absolute -bottom-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center shadow-sm",
                        cfg.color
                      )}
                    >
                      <span className="text-white [&_*]:h-3 [&_*]:w-3">{cfg.icon}</span>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center shadow-sm shrink-0",
                      cfg.color
                    )}
                  >
                    {cfg.icon}
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm leading-relaxed", n.isRead ? "text-slate-500" : "text-slate-800 font-medium")}>
                    <span className="font-semibold">{senderName}</span>{" "}
                    {n.text}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <p className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(n.createdAt), {
                        addSuffix: true,
                        locale: vi,
                      })}
                    </p>
                  </div>
                </div>

                {/* Unread dot */}
                {!n.isRead && (
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0 mt-2" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
