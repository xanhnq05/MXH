import api from "@/lib/axios";

export const friendshipService = {
  sendRequest: (userId: string) => api.post("/friends/request", { userId }),
  accept: (userId: string) => api.post("/friends/accept", { userId }),
  reject: (userId: string) => api.post("/friends/reject", { userId }),
  cancel: (userId: string) => api.post("/friends/cancel", { userId }),
  unfriend: (userId: string) => api.delete(`/friends/${userId}`),
  list: () => api.get("/friends").then((r) => r.data.friends),
  incoming: () => api.get("/friends/requests/incoming").then((r) => r.data.requests),
  sent: () => api.get("/friends/requests/sent").then((r) => r.data.requests),
  suggestions: (limit = 20) =>
    api.get(`/friends/suggestions?limit=${limit}`).then((r) => r.data.suggestions),
};

export const blockService = {
  block: (userId: string) => api.post("/friends/block", { userId }),
  unblock: (userId: string) => api.delete(`/friends/block/${userId}`),
  list: () => api.get("/friends/block").then((r) => r.data.blocks),
};

export const notificationService = {
  list: (unreadOnly = false) =>
    api.get(`/notifications${unreadOnly ? "?unread=true" : ""}`).then((r) => r.data),
  unreadCount: () => api.get("/notifications/unread-count").then((r) => r.data.count),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/read-all"),
};

export const stickerService = {
  listPacks: () => api.get("/stickers/packs").then((r) => r.data.packs),
  getPack: (key: string) => api.get(`/stickers/packs/${key}`).then((r) => r.data.pack),
  search: (q: string) => api.get(`/stickers/search?q=${encodeURIComponent(q)}`).then((r) => r.data.stickers),
};

export const callService = {
  start: (data: { conversationId: string; type: "audio" | "video"; mode?: "direct" | "group" }) =>
    api.post("/calls/start", data).then((r) => r.data.call),
  end: (id: string, status?: string) => api.patch(`/calls/${id}/end`, { status }).then((r) => r.data.call),
  list: () => api.get("/calls").then((r) => r.data.calls),
};
