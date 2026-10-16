// Admin Media service

import api from "@/lib/axios";
import type { MediaAsset, PaginatedResponse } from "@/types";

export interface ListMediaParams {
  page?: number;
  limit?: number;
  mediaType?: "sticker" | "gif";
  category?: string;
  isActive?: boolean;
  search?: string;
}

export const adminMediaService = {
  list: (params: ListMediaParams = {}) =>
    api
      .get("/admin/media", { params })
      .then((r) => r.data as PaginatedResponse<MediaAsset>),

  get: (id: string) =>
    api.get(`/admin/media/${id}`).then((r) => r.data.asset as MediaAsset),

  create: (file: File, meta: Record<string, any>) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("meta", JSON.stringify(meta));
    return api
      .post("/admin/media", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data.asset as MediaAsset);
  },

  update: (id: string, patch: Partial<MediaAsset>) =>
    api
      .patch(`/admin/media/${id}`, patch)
      .then((r) => r.data.asset as MediaAsset),

  setActive: (id: string, isActive: boolean) =>
    api
      .patch(`/admin/media/${id}/active`, { isActive })
      .then((r) => r.data.asset as MediaAsset),

  softDelete: (id: string) =>
    api.delete(`/admin/media/${id}`).then((r) => r.data),

  hardDelete: (id: string) =>
    api.delete(`/admin/media/${id}/hard`).then((r) => r.data),
};
