export interface Notification {
  _id: string;
  type:
    | "friend_request"
    | "friend_accept"
    | "post_like"
    | "post_comment"
    | "comment_reply"
    | "new_message"
    | "added_to_group"
    | "call_missed"
    | "system";
  senderId?: any;
  refId?: string;
  meta?: any;
  icon?: string;
  text?: string;
  senderName?: string;
  senderAvatar?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}
