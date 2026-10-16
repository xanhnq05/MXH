// NotificationClickHandler - Component xử lý click notification globally.
// Đặt ở App.tsx để mọi nơi trong app có thể dispatch notification click.

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { resolveNotificationRoute } from "@/helpers/notification-router";
import { AdminNotificationModal } from "@/components/notifications/AdminNotificationModal";

/**
 * Mỗi lần location thay đổi, kiểm tra state.fromNotification.
 * Nếu có → xử lý route.
 *
 * State shape khi navigate:
 *   navigate(path, { state: { fromNotification: notificationObj } })
 */
export const NotificationClickHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [modalNotif, setModalNotif] = useState<any | null>(null);

  useEffect(() => {
    const state = location.state as any;
    const notif = state?.fromNotification;
    if (!notif) return;

    // Clear state để không trigger lại
    window.history.replaceState({}, document.title);

    const route = resolveNotificationRoute(notif);
    if (route.kind === "modal") {
      setModalNotif(notif);
    }
    // 'navigate' đã được xử lý ở caller
  }, [location.pathname]);

  return (
    <AdminNotificationModal
      open={!!modalNotif}
      onOpenChange={(open) => !open && setModalNotif(null)}
      notification={modalNotif}
    />
  );
};

/**
 * Helper function để navigate kèm notification.
 * Component nào cần click vào notification thì dùng hàm này.
 */
export function navigateToNotification(navigate: any, notif: any) {
  const route = resolveNotificationRoute(notif);
  if (route.kind === "navigate") {
    navigate(route.path, { state: { fromNotification: notif, ...(route.state || {}) } });
  } else if (route.kind === "modal") {
    // Vẫn navigate đến /notifications nhưng gắn state để modal mở
    navigate("/notifications", {
      state: {
        fromNotification: notif,
        openModal: true,
      },
    });
  }
}
