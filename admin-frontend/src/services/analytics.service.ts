// Analytics service

import api from "@/lib/axios";
import type { AnalyticsOverview } from "@/types";

export const analyticsService = {
  overview: () =>
    api.get("/admin/analytics/overview").then((r) => r.data as AnalyticsOverview),

  userGrowth: (days = 30) =>
    api
      .get("/admin/analytics/user-growth", { params: { days } })
      .then((r) => r.data.data as { date: string; count: number }[]),

  messageVolume: (days = 30) =>
    api
      .get("/admin/analytics/message-volume", { params: { days } })
      .then((r) => r.data.data as { date: string; count: number }[]),

  reportsByCategory: () =>
    api
      .get("/admin/analytics/reports-by-category")
      .then((r) => r.data.data as { _id: string; count: number }[]),

  reportsByStatus: () =>
    api
      .get("/admin/analytics/reports-by-status")
      .then((r) => r.data.data as { _id: string; count: number }[]),

  topReporters: (limit = 10) =>
    api
      .get("/admin/analytics/top-reporters", { params: { limit } })
      .then((r) => r.data.data as { count: number; user: any }[]),

  topReportedUsers: (limit = 10) =>
    api
      .get("/admin/analytics/top-reported-users", { params: { limit } })
      .then((r) => r.data.data as { count: number; user: any }[]),
};
