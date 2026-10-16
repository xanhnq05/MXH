// Admin Users service

import api from "@/lib/axios";
import type { AdminUser, BanRecord, PaginatedResponse } from "@/types";

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "banned" | "deleted";
  isBanned?: boolean;
  country?: string;
  sort?: string;
}

export const adminUsersService = {
  list: (params: ListUsersParams = {}) =>
    api
      .get("/admin/users", { params })
      .then((r) => r.data as PaginatedResponse<AdminUser>),

  get: (id: string) =>
    api
      .get(`/admin/users/${id}`)
      .then((r) => r.data as { user: AdminUser; bans: BanRecord[] }),

  update: (id: string, patch: Partial<AdminUser>) =>
    api
      .patch(`/admin/users/${id}`, patch)
      .then((r) => r.data.user as AdminUser),

  warn: (id: string, reason: string) =>
    api
      .post(`/admin/users/${id}/warn`, { reason })
      .then((r) => r.data.user as AdminUser),

  ban: (
    id: string,
    data: {
      reason: string;
      category: string;
      scope?: string[];
      expiresAt?: string | null;
      reportIds?: string[];
    }
  ) =>
    api
      .post(`/admin/users/${id}/ban`, data)
      .then((r) => r.data.ban as BanRecord),

  unban: (id: string, reason?: string) =>
    api
      .post(`/admin/users/${id}/unban`, { reason })
      .then((r) => r.data),

  softDelete: (id: string) =>
    api.delete(`/admin/users/${id}`).then((r) => r.data),
};
