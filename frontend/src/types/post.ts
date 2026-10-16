import type { User } from "./user";

export interface Post {
  _id: string;
  author: User | string;
  content: string;
  media: PostMedia[];
  visibility: "public" | "friends" | "private";
  likeCount: number;
  commentCount: number;
  shareCount: number;
  tags: string[];
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PostMedia {
  type: "image" | "video";
  url: string;
  storageKey: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
}

export interface Comment {
  _id: string;
  postId: string;
  author: User | string;
  parentId: string | null;
  type: "text" | "sticker" | "gif";
  content: string;
  stickerId: string | null;
  stickerUrl: string | null;
  gifId: string | null;
  gifUrl: string | null;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}
