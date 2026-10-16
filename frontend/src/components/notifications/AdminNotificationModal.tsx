// AdminNotificationModal - Modal hiển thị thông báo admin
// Trigger khi user click vào notification từ admin.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Megaphone, AlertTriangle, Gift, Wrench, ExternalLink, Bell } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { cn } from "@/lib/utils";
import { notificationService } from "@/services/other.service";

const TYPE_META = {
  admin_announcement: { icon: Megaphone, color: "text-blue-600", bg: "bg-blue-50", label: "Thông báo chung" },
  admin_warning: { icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-50", label: "Cảnh báo" },
  admin_promo: { icon: Gift, color: "text-pink-600", bg: "bg-pink-50", label: "Khuyến mãi" },
  admin_maintenance: { icon: Wrench, color: "text-orange-600", bg: "bg-orange-50", label: "Bảo trì" },
};

interface AdminNotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: any | null;
}

export const AdminNotificationModal = ({
  open,
  onOpenChange,
  notification,
}: AdminNotificationModalProps) => {
  const navigate = useNavigate();
  const { markRead } = useNotificationStore();
  const [read, setRead] = useState(false);

  useEffect(() => {
    if (open && notification && !notification.isRead && !read) {
      // Mark as read
      notificationService.markRead(notification._id).catch(() => {});
      markRead(notification._id);
      setRead(true);
    }
    if (!open) setRead(false);
  }, [open, notification, markRead, read]);

  if (!notification) return null;

  const meta = notification.meta || {};
  const title = meta.title || notification.title || "Thông báo từ Admin";
  const message = meta.message || notification.message || "";
  const link = meta.link || notification.link || null;
  const typeMeta = (TYPE_META as any)[notification.type] || TYPE_META.admin_announcement;
  const Icon = typeMeta.icon;

  const handleLinkClick = () => {
    if (!link) return;
    onOpenChange(false);
    // Nếu là URL đầy đủ → mở tab mới, nếu là path → navigate
    if (/^https?:\/\//.test(link)) {
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
      navigate(link);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                typeMeta.bg
              )}
            >
              <Icon className={cn("h-6 w-6", typeMeta.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5 text-slate-400" />
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">
                  {typeMeta.label}
                </p>
              </div>
              <DialogTitle className="mt-0.5 text-base">{title}</DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          {message && (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {message}
            </p>
          )}

          <p className="text-xs text-slate-400">
            {formatDistanceToNow(new Date(notification.createdAt), {
              addSuffix: true,
              locale: vi,
            })}
          </p>
        </div>

        <DialogFooter className="gap-2">
          {link && (
            <Button
              variant="default"
              onClick={handleLinkClick}
              className="bg-greenx-gradient hover:opacity-90 text-white gap-1.5"
            >
              <ExternalLink className="h-4 w-4" />
              Xem chi tiết
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminNotificationModal;
