// NotificationsPage - Redesign với theme cam GreenX + avatar + realtime
// Click notification sẽ routing đến trang phù hợp (hoặc mở modal cho admin).
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  Bell,
  CheckCheck,
  Clock,
  Heart,
  MessageCircle,
  UserPlus,
  UserCheck,
  Users,
  Phone,
  Megaphone,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { notificationService } from "@/services/other.service";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/notification";
import { navigateToNotification } from "@/components/notifications/NotificationClickHandler";
import { AdminNotificationModal } from "@/components/notifications/AdminNotificationModal";
import { resolveNotificationRoute } from "@/helpers/notification-router";

const NOTIFICATION_ICONS: Record<string, { icon: React.ReactNode; color: string; bg: string; bgDark: string }> = {
  friend_request: { icon: <UserPlus className="h-5 w-5" />, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50", bgDark: "dark:bg-blue-500/20" },
  friend_accept: { icon: <UserCheck className="h-5 w-5" />, color: "text-green-600 dark:text-green-400", bg: "bg-green-50", bgDark: "dark:bg-green-500/20" },
  friend_suggestion: { icon: <Sparkles className="h-5 w-5" />, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50", bgDark: "dark:bg-purple-500/20" },
  post_like: { icon: <Heart className="h-5 w-5" />, color: "text-red-500 dark:text-red-400", bg: "bg-red-50", bgDark: "dark:bg-red-500/20" },
  post_comment: { icon: <MessageCircle className="h-5 w-5" />, color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-50", bgDark: "dark:bg-blue-500/20" },
  comment_reply: { icon: <MessageCircle className="h-5 w-5" />, color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-50", bgDark: "dark:bg-blue-500/20" },
  new_message: { icon: <MessageCircle className="h-5 w-5" />, color: "text-purple-500 dark:text-purple-400", bg: "bg-purple-50", bgDark: "dark:bg-purple-500/20" },
  added_to_group: { icon: <Users className="h-5 w-5" />, color: "text-teal-500 dark:text-teal-400", bg: "bg-teal-50", bgDark: "dark:bg-teal-500/20" },
  call_missed: { icon: <Phone className="h-5 w-5" />, color: "text-orange-500 dark:text-orange-400", bg: "bg-orange-50", bgDark: "dark:bg-orange-500/20" },
  system: { icon: <Bell className="h-5 w-5" />, color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-50", bgDark: "dark:bg-slate-700" },
  admin_announcement: { icon: <Megaphone className="h-5 w-5" />, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50", bgDark: "dark:bg-blue-500/20" },
  admin_warning: { icon: <Bell className="h-5 w-5" />, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50", bgDark: "dark:bg-yellow-500/20" },
  admin_promo: { icon: <Bell className="h-5 w-5" />, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50", bgDark: "dark:bg-pink-500/20" },
  admin_maintenance: { icon: <Bell className="h-5 w-5" />, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50", bgDark: "dark:bg-orange-500/20" },
};

const getInitials = (name?: string) =>
  (name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const NotificationsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { list, setList, markRead, markAllRead, unreadCount, setUnreadCount } =
    useNotificationStore();
  const [loading, setLoading] = useState(true);
  const [modalNotif, setModalNotif] = useState<Notification | null>(null);

  const load = useCallback(async () => {
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
  }, [setList, setUnreadCount]);

  useEffect(() => {
    load();
  }, [load]);

  // Mở modal nếu location.state có openModal + fromNotification
  useEffect(() => {
    const state = location.state as any;
    if (state?.openModal && state?.fromNotification) {
      setModalNotif(state.fromNotification);
      // Clear state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleClick = async (n: Notification) => {
    if (!n.isRead) {
      try {
        await notificationService.markRead(n._id);
      } catch {}
      markRead(n._id);
    }
    navigateToNotification(navigate, n);
  };

  return (
    <div className="h-full overflow-y-auto bg-orange-50/30 dark:bg-slate-950">
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Thông báo</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
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
              className="border-orange-200 dark:border-slate-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-slate-800 dark:bg-slate-900 gap-1.5"
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
              <div className="h-8 w-8 rounded-full border-2 border-orange-200 dark:border-slate-700 border-t-orange-500 animate-spin" />
            </div>
          )}

          {!loading && list.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-orange-100 dark:border-slate-800">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-50 dark:bg-orange-500/20 flex items-center justify-center text-orange-400 mb-3">
                <Bell className="h-8 w-8" />
              </div>
              <p className="font-semibold text-slate-700 dark:text-white">Chưa có thông báo</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Các thông báo về lời mời kết bạn, tin nhắn sẽ hiện ở đây
              </p>
            </div>
          )}

          {list.map((n) => {
            const cfg = NOTIFICATION_ICONS[n.type] || NOTIFICATION_ICONS.system;
            const senderName =
              n.senderName ||
              (typeof n.senderId === "object" ? n.senderId?.displayName : null) ||
              n.text?.split(" ")[0] ||
              "Một người";
            const senderAvatar =
              n.senderAvatar ||
              (typeof n.senderId === "object" ? n.senderId?.avatarUrl : null) ||
              "";
            const isAdminNotif = n.type?.startsWith("admin_");
            const adminTitle = isAdminNotif ? n.meta?.title || n.title : null;

            return (
              <button
                key={n._id}
                onClick={() => handleClick(n)}
                className={cn(
                  "w-full text-left flex items-start gap-3 p-3 sm:p-4 rounded-2xl border transition-colors",
                  n.isRead
                    ? "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800"
                    : "bg-white dark:bg-slate-900 border-orange-300 dark:border-orange-500/50 shadow-sm"
                )}
              >
                {/* Sender avatar or notification icon */}
                {!isAdminNotif && n.senderId ? (
                  <div className="relative">
                    <Avatar className="h-12 w-12 sm:h-14 sm:w-14 ring-2 ring-orange-100 dark:ring-slate-700">
                      <AvatarImage src={senderAvatar} alt={senderName} />
                      <AvatarFallback className="bg-greenx-gradient text-white font-semibold">
                        {getInitials(senderName)}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        "absolute -bottom-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center shadow-sm",
                        cfg.bg,
                        cfg.bgDark
                      )}
                    >
                      <span className={cn("[&_*]:h-3 [&_*]:w-3", cfg.color)}>{cfg.icon}</span>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shadow-sm shrink-0",
                      cfg.bg,
                      cfg.bgDark
                    )}
                  >
                    <span className={cn("[&_*]:h-6 [&_*]:w-6", cfg.color)}>{cfg.icon}</span>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {isAdminNotif && adminTitle ? (
                    <p
                      className={cn(
                        "text-sm leading-relaxed",
                        n.isRead ? "font-normal text-slate-600 dark:text-slate-400" : "font-semibold text-slate-900 dark:text-white"
                      )}
                    >
                      {adminTitle}
                    </p>
                  ) : (
                    <p
                      className={cn(
                        "text-sm leading-relaxed",
                        n.isRead ? "font-normal text-slate-600 dark:text-slate-400" : "font-semibold text-slate-900 dark:text-white"
                      )}
                    >
                      <span className={n.isRead ? "font-medium" : "font-bold"}>
                        {senderName}
                      </span>{" "}
                      {n.text}
                    </p>
                  )}
                  {isAdminNotif && n.meta?.message && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {n.meta.message}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Clock className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                    <p className="text-xs text-slate-400 dark:text-slate-500">
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
              </button>
            );
          })}
        </div>
      </div>

      <AdminNotificationModal
        open={!!modalNotif}
        onOpenChange={(open) => !open && setModalNotif(null)}
        notification={modalNotif}
      />
    </div>
  );
};

export default NotificationsPage;
