import api from "@/lib/axios";
import type { Conversation, Message } from "@/types/message";

export const chatService = {
  listConversations: () => api.get("/conversations").then((r) => r.data.conversations as Conversation[]),
  getOrCreateDirect: (userId: string) =>
    api.post("/conversations/direct", { userId }).then((r) => r.data.conversation as Conversation),
  createGroup: (name: string, memberIds: string[]) =>
    api.post("/conversations/group", { name, memberIds }).then((r) => r.data.conversation as Conversation),
  getConversation: (id: string) => api.get(`/conversations/${id}`).then((r) => r.data.conversation as Conversation),
  updateGroup: (id: string, payload: { name?: string; avatarUrl?: string; avatarId?: string }) =>
    api.patch(`/conversations/${id}`, payload).then((r) => r.data.conversation),
  deleteGroup: (id: string) => api.delete(`/conversations/${id}`),
  leaveGroup: (id: string) => api.post(`/conversations/${id}/leave`).then((r) => r.data),
  addMembers: (id: string, memberIds: string[]) =>
    api.post(`/conversations/${id}/members`, { memberIds }).then((r) => r.data.conversation),
  removeMember: (id: string, userId: string) =>
    api.delete(`/conversations/${id}/members/${userId}`),
  changeRole: (id: string, userId: string, newRole: "owner" | "admin" | "member") =>
    api.patch(`/conversations/${id}/role`, { userId, newRole }).then((r) => r.data.conversation),
  setNickname: (id: string, nickname: string | null) =>
    api.patch(`/conversations/${id}/nickname`, { nickname }).then((r) => r.data.conversation),
  mute: (id: string, mute: boolean) =>
    api.patch(`/conversations/${id}/mute`, { mute }).then((r) => r.data),
  pinMessage: (id: string, messageId: string) =>
    api.post(`/conversations/${id}/pin`, { messageId }).then((r) => r.data),
  unpinMessage: (id: string, messageId: string) =>
    api.post(`/conversations/${id}/unpin`, { messageId }).then((r) => r.data),

  listMessages: (conversationId: string, cursor?: string) =>
    api.get(`/messages/${conversationId}/messages${cursor ? `?cursor=${cursor}` : ""}`).then((r) => r.data as { items: Message[]; nextCursor: string | null }),
  sendMessage: (conversationId: string, payload: any) =>
    api.post(`/messages/${conversationId}/messages`, payload).then((r) => r.data.message as Message),
  uploadMessageFile: (conversationId: string, file: File, content?: string, duration?: number) => {
    const fd = new FormData();
    fd.append("file", file);
    if (content) fd.append("content", content);
    if (duration) fd.append("duration", String(duration));
    return api.post(`/messages/${conversationId}/messages/upload`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data.message as Message);
  },
  markRead: (conversationId: string, lastMessageId: string) =>
    api.post(`/messages/${conversationId}/read`, { lastMessageId }),
  removeMessage: (id: string) => api.delete(`/messages/messages/${id}`),
};
