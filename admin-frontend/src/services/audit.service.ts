// Audit log service

import api from "@/lib/axios";
import type { AdminAuditLog, PaginatedResponse } from "@/types";

export interface ListAuditParams {
  page?: number;
  limit?: number;
  adminId?: string;
  action?: string;
  targetType?: string;
  from?: string;
  to?: string;
}

export const auditService = {
  list: (params: ListAuditParams = {}) =>
    api
      .get("/admin/audit-logs", { params })
      .then((r) => r.data as PaginatedResponse<AdminAuditLog>),
};
