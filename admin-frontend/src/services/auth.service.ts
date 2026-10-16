// Auth service — đăng nhập/đăng xuất/refresh.
// Tái sử dụng endpoint backend user (admin cũng là user).

import api from "@/lib/axios";

export const authService = {
  signIn: async (data: { username: string; password: string }) => {
    const res = await api.post("/auth/signin", data);
    return res.data as { accessToken: string; refreshToken?: string; user: any };
  },
  signOut: async () => {
    return api.post("/auth/signout", {});
  },
};
