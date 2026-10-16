export interface Notification {
  _id: string;
  type:
    | "friend_request"
    | "friend_accept"
    | "friend_suggestion"
    | "post_like"
    | "post_comment"
    | "comment_reply"
    | "new_message"
    | "added_to_group"
    | "call_missed"
    | "system"
    | "admin_announcement"
    | "admin_warning"
    | "admin_promo"
    | "admin_maintenance";
  senderId?: any;
  refId?: string;
  meta?: any;
  icon?: string;
  text?: string;
  title?: string;
  message?: string;
  link?: string | null;
  senderName?: string;
  senderAvatar?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}
