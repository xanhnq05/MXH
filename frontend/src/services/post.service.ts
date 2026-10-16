import api from "@/lib/axios";
import type { Post, Comment } from "@/types/post";

export const postService = {
  feed: (cursor?: string) => api.get(`/posts/feed${cursor ? `?cursor=${cursor}` : ""}`).then((r) => r.data),
  getById: (id: string) => api.get(`/posts/${id}`).then((r) => r.data.post as Post),
  search: (q: string, params?: { cursor?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    qs.set("q", q);
    if (params?.cursor) qs.set("cursor", params.cursor);
    if (params?.limit) qs.set("limit", String(params.limit));
    return api
      .get(`/posts/search?${qs.toString()}`)
      .then((r) => r.data as { items: Post[]; nextCursor: string | null });
  },
  listByUser: (
    userId: string,
    params?: { cursor?: string; year?: string; tag?: string; authorId?: string }
  ) => {
    const qs = new URLSearchParams();
    if (params?.cursor) qs.set("cursor", params.cursor);
    if (params?.year) qs.set("year", params.year);
    if (params?.tag) qs.set("tag", params.tag);
    if (params?.authorId) qs.set("authorId", params.authorId);
    return api
      .get(`/posts/by-user/${userId}${qs.toString() ? `?${qs.toString()}` : ""}`)
      .then((r) => r.data);
  },
  getUserYears: (userId: string) =>
    api.get(`/posts/by-user/${userId}/years`).then((r) => r.data.years as number[]),
  getUserTags: (userId: string) =>
    api
      .get(`/posts/by-user/${userId}/tags`)
      .then((r) => r.data.tags as { tag: string; count: number }[]),
  create: (data: { content?: string; visibility?: string; tags?: string[] }, files?: File[]) => {
    const fd = new FormData();
    if (data.content) fd.append("content", data.content);
    if (data.visibility) fd.append("visibility", data.visibility);
    if (data.tags) fd.append("tags", data.tags.join(","));
    files?.forEach((f) => fd.append("files", f));
    return api.post("/posts", fd, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data.post);
  },
  update: (id: string, payload: any) => api.patch(`/posts/${id}`, payload).then((r) => r.data.post),
  remove: (id: string) => api.delete(`/posts/${id}`),
  like: (id: string) => api.put(`/posts/${id}/like`).then((r) => r.data as { liked: boolean; isLiked: boolean; likeCount: number }),
  unlike: (id: string) => api.delete(`/posts/${id}/like`).then((r) => r.data as { liked: boolean; isLiked: boolean; likeCount: number }),
  getLikers: (id: string) =>
    api.get(`/posts/${id}/likers`).then(
      (r) => r.data as { total: number; items: any[]; nextCursor: string | null }
    ),
};

export const commentService = {
  list: (postId: string, cursor?: string) =>
    api.get(`/posts/${postId}/comments${cursor ? `?cursor=${cursor}` : ""}`).then((r) => r.data),
  create: (
    postId: string,
    payload: {
      content?: string;
      type?: "text" | "sticker" | "gif";
      stickerId?: string;
      stickerUrl?: string;
      gifId?: string;
      gifUrl?: string;
      parentId?: string;
    }
  ) => api.post(`/posts/${postId}/comments`, payload).then((r) => r.data.comment as Comment),
  update: (id: string, content: string) => api.patch(`/comments/${id}`, { content }).then((r) => r.data.comment),
  remove: (id: string) => api.delete(`/comments/${id}`),
};
