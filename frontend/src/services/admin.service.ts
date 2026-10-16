// Admin service — gọi /api/admin/* (chỉ admin).
import api from "@/lib/axios";

export interface MediaAsset {
  _id: string;
  mediaType: "sticker" | "gif";
  name: string;
  description?: string;
  url: string;
  storageKey: string;
  thumbnailUrl?: string;
  thumbnailKey?: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  category?: string;
  tags: string[];
  keywords: string[];
  synonyms: string[];
  phrases: string[];
  language?: string;
  sentiment?: string;
  isActive: boolean;
  isLegacy?: boolean;
  priority: number;
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MediaListResponse {
  items: MediaAsset[];
  total: number;
  page: number;
  limit: number;
}

export interface MediaListParams {
  page?: number;
  limit?: number;
  mediaType?: "sticker" | "gif";
  category?: string;
  isActive?: boolean;
  search?: string;
}

export const adminMediaService = {
  list: (params: MediaListParams = {}) =>
    api
      .get("/admin/media", { params })
      .then((r) => r.data as MediaListResponse),

  get: (id: string) =>
    api.get(`/admin/media/${id}`).then((r) => r.data.asset as MediaAsset),

  create: (file: File, meta: Partial<MediaAsset>) => {
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
