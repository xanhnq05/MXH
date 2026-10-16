import api from "@/lib/axios";
import type { User } from "@/types/user";

export const userService = {
  getMe: () => api.get("/users/me").then((r) => r.data.user as User),
  getById: (id: string) =>
    api.get(`/users/${id}`).then((r) => r.data.user as User),
  search: (q: string) =>
    api
      .get(`/users/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.data.users as User[]),
  updateProfile: (payload: Partial<User>) =>
    api.patch("/users/me", payload).then((r) => r.data.user),
  updatePreferences: (payload: Partial<User>) =>
    api.patch("/users/me/preferences", payload).then((r) => r.data.user),
  uploadAvatar: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api
      .post("/users/me/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data.user);
  },
  uploadCover: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api
      .post("/users/me/cover", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data.user);
  },
  setE2EEKeys: (payload: { publicKey?: string; ecdhPublicKey?: string }) =>
    api.post("/users/me/e2ee-keys", payload).then((r) => r.data.user),
  deleteAccount: () => api.delete("/users/me").then((r) => r.data),
};
