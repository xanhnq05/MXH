import type { User } from "./user";
export type { User };

export interface Member {
  userId: User;
  role: "owner" | "admin" | "member";
  nickname?: string | null;
  joinedAt: string;
  lastReadMessageId?: string | null;
}

export interface Conversation {
  _id: string;
  type: "direct" | "group";
  name?: string;
  avatarUrl?: string;
  members: Member[];
  lastMessage?: Message;
  lastMessageAt: string;
  pinnedMessages?: string[];
  mutedBy?: string[];
  // Nhóm mở (anyone with joinLink can join) | kín (chỉ mời)
  joinType?: "open" | "closed";
  joinLink?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MessageType =
  | "text"
  | "image"
  | "file"
  | "voice"
  | "sticker"
  | "gif"
  | "system"
  | "share_post";

export interface EncryptedKey {
  userId: string;
  encryptedKey: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: User | string;
  type: MessageType;
  content: string;
  fileUrl?: string;
  fileKey?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number;
  stickerId?: string;
  stickerUrl?: string;
  // share_post
  postId?: string;
  postUrl?: string;
  replyTo?: Message | string | null;
  isEncrypted?: boolean;
  iv?: string;
  authTag?: string;
  encryptedKeys?: EncryptedKey[];
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: string;
  /**
   * deliveries: trạng thái "đã nhận" + "đã đọc" của từng member.
   * - deliveredAt: server đã push message tới client của user
   * - readAt: user đã mở conversation và gọi markRead
   */
  deliveries?: {
    userId: User | string;
    deliveredAt: string;
    readAt?: string | null;
  }[];
  createdAt: string;
  updatedAt: string;
}
