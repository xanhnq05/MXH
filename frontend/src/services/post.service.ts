import api from "@/lib/axios";
import type { Post, Comment } from "@/types/post";

export const postService = {
  feed: (cursor?: string) => api.get(`/posts/feed${cursor ? `?cursor=${cursor}` : ""}`).then((r) => r.data),
  getById: (id: string) => api.get(`/posts/${id}`).then((r) => r.data.post as Post),
  listByUser: (userId: string, cursor?: string) =>
    api.get(`/posts/listByUser/${userId}${cursor ? `?cursor=${cursor}` : ""}`).catch(() =>
      // fallback nếu backend mount khác path
      api.get(`/users/${userId}/posts${cursor ? `?cursor=${cursor}` : ""}`)
    ).then((r: any) => r.data),
  create: (data: { content?: string; visibility?: string }, files?: File[]) => {
    const fd = new FormData();
    if (data.content) fd.append("content", data.content);
    if (data.visibility) fd.append("visibility", data.visibility);
    files?.forEach((f) => fd.append("files", f));
    return api.post("/posts", fd, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data.post);
  },
  update: (id: string, payload: any) => api.patch(`/posts/${id}`, payload).then((r) => r.data.post),
  remove: (id: string) => api.delete(`/posts/${id}`),
  like: (id: string) => api.put(`/posts/${id}/like`).then((r) => r.data),
  unlike: (id: string) => api.delete(`/posts/${id}/like`).then((r) => r.data),
};

export const commentService = {
  list: (postId: string, cursor?: string) =>
    api.get(`/posts/${postId}/comments${cursor ? `?cursor=${cursor}` : ""}`).then((r) => r.data),
  create: (postId: string, payload: { content: string; parentId?: string }) =>
    api.post(`/posts/${postId}/comments`, payload).then((r) => r.data.comment as Comment),
  update: (id: string, content: string) => api.patch(`/comments/${id}`, { content }).then((r) => r.data.comment),
  remove: (id: string) => api.delete(`/comments/${id}`),
};
