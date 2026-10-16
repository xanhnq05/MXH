// Admin Reports service

import api from "@/lib/axios";
import type {
  AdminReport,
  PaginatedResponse,
  ReportCategory,
  ReportResolution,
  ReportStatus,
  ReportTargetType,
} from "@/types";

export interface ListReportsParams {
  page?: number;
  limit?: number;
  status?: ReportStatus;
  targetType?: ReportTargetType;
  category?: ReportCategory;
  priority?: string;
  search?: string;
}

export const adminReportsService = {
  counts: () => api.get("/admin/reports/counts").then((r) => r.data),
  list: (params: ListReportsParams = {}) =>
    api
      .get("/admin/reports", { params })
      .then((r) => r.data as PaginatedResponse<AdminReport>),
  get: (id: string) =>
    api.get(`/admin/reports/${id}`).then((r) => r.data.report as AdminReport),
  assign: (id: string) =>
    api
      .patch(`/admin/reports/${id}/assign`)
      .then((r) => r.data.report as AdminReport),
  resolve: (id: string, resolution: ReportResolution, resolutionNote?: string) =>
    api
      .post(`/admin/reports/${id}/resolve`, { resolution, resolutionNote })
      .then((r) => r.data.report as AdminReport),
  dismiss: (id: string, resolutionNote?: string) =>
    api
      .post(`/admin/reports/${id}/dismiss`, { resolutionNote })
      .then((r) => r.data.report as AdminReport),
};
