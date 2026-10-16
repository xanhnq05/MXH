// helpers/notification-router.ts
// Helper xác định route + state khi click vào notification.
// Tập trung logic routing để dễ bảo trì + dùng chung cho nhiều component.

import type { Notification } from "@/types/notification";

export type NotificationRoute =
  | { kind: "modal"; payload: { title: string; message: string; link?: string | null } }
  | { kind: "navigate"; path: string; state?: any; highlight?: string };

/**
 * Lấy id từ senderId (có thể là object hoặc string)
 */
const getSenderId = (n: Notification): string => {
  if (!n.senderId) return "";
  if (typeof n.senderId === "string") return n.senderId;
  return (n.senderId as any)._id || "";
};

/**
 * Lấy tên hiển thị từ senderId
 */
const getSenderName = (n: Notification): string => {
  if (n.senderName) return n.senderName;
  if (typeof n.senderId === "object" && n.senderId) {
    return (n.senderId as any).displayName || (n.senderId as any).username || "Một người";
  }
  return "Một người";
};

/**
 * Xác định route khi click vào 1 notification
 */
export function resolveNotificationRoute(n: Notification): NotificationRoute {
  // ============== Admin notifications (modal) ==============
  if (
    n.type === "admin_announcement" ||
    n.type === "admin_warning" ||
    n.type === "admin_promo" ||
    n.type === "admin_maintenance"
  ) {
    const meta = n.meta || {};
    return {
      kind: "modal",
      payload: {
        title: meta.title || "Thông báo từ Admin",
        message: meta.message || "",
        link: meta.link || null,
      },
    };
  }

  // ============== Friend request -> trang lời mời kết bạn ==============
  if (n.type === "friend_request") {
    return {
      kind: "navigate",
      path: "/friends",
      state: { tab: "incoming" },
    };
  }

  // ============== Friend accept -> trang cá nhân người đó ==============
  if (n.type === "friend_accept") {
    const senderId = getSenderId(n);
    if (senderId) {
      return { kind: "navigate", path: `/profile/${senderId}` };
    }
    return { kind: "navigate", path: "/friends" };
  }

  // ============== Friend suggestion ==============
  if (n.type === "friend_suggestion") {
    const senderId = getSenderId(n);
    return {
      kind: "navigate",
      path: "/friends",
      state: { tab: "suggestions", highlight: senderId },
    };
  }

  // ============== Post like -> bài viết ==============
  if (n.type === "post_like") {
    if (n.refId) {
      return { kind: "navigate", path: `/post/${n.refId}` };
    }
  }

  // ============== Post comment / comment reply -> bài viết + scroll tới comment ==============
  if (n.type === "post_comment" || n.type === "comment_reply") {
    if (n.refId) {
      return {
        kind: "navigate",
        path: `/post/${n.refId}`,
        state: { highlightComment: true },
        highlight: "comments",
      };
    }
  }

  // ============== New message -> chat ==============
  if (n.type === "new_message") {
    if (n.refId) {
      return { kind: "navigate", path: `/chat/${n.refId}` };
    }
    return { kind: "navigate", path: "/chat" };
  }

  // ============== Added to group -> chat group ==============
  if (n.type === "added_to_group") {
    if (n.refId) {
      return { kind: "navigate", path: `/chat/${n.refId}` };
    }
    return { kind: "navigate", path: "/chat" };
  }

  // ============== Call missed -> trang cá nhân ==============
  if (n.type === "call_missed") {
    const senderId = getSenderId(n);
    if (senderId) {
      return { kind: "navigate", path: `/profile/${senderId}` };
    }
    return { kind: "navigate", path: "/" };
  }

  // ============== System -> home ==============
  if (n.type === "system") {
    const link = n.meta?.link;
    if (link && typeof link === "string") {
      return { kind: "navigate", path: link };
    }
    return { kind: "navigate", path: "/" };
  }

  // Default
  return { kind: "navigate", path: "/notifications" };
}

/** Lấy text ngắn để hiển thị khi hover */
export function getNotificationDescription(n: Notification): string {
  const meta = n.meta || {};
  if (n.type?.startsWith("admin_")) {
    return meta.message || n.text || "Thông báo từ Admin";
  }
  return n.text || "Bạn có thông báo mới";
}

/** Lấy title ngắn */
export function getNotificationTitle(n: Notification): string {
  const meta = n.meta || {};
  if (n.type?.startsWith("admin_")) {
    return meta.title || "Thông báo từ Admin";
  }
  if (n.type === "new_message") {
    return `Tin nhắn mới từ ${getSenderName(n)}`;
  }
  return n.text || "Thông báo";
}
