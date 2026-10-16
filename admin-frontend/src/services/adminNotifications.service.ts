// Admin Notifications service — gửi thông báo broadcast/targeted/filter + lịch sử

import api from "@/lib/axios";

export type AdminNotificationType =
  | "admin_announcement"
  | "admin_warning"
  | "admin_promo"
  | "admin_maintenance";

export interface SendBroadcastPayload {
  type: AdminNotificationType;
  title: string;
  message: string;
  link?: string;
}

export interface SendTargetedPayload extends SendBroadcastPayload {
  userIds: string[];
}

export interface SendByFilterPayload extends SendBroadcastPayload {
  filter: {
    country?: string;
    isBanned?: boolean;
  };
}

export interface SendResult {
  success: boolean;
  message: string;
  sent: number;
  totalUsers: number;
}

export interface NotificationCampaign {
  _id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  link: string | null;
  recipientCount: number;
  sentAt: string;
}

export interface CampaignRecipient {
  _id: string;
  recipientId: {
    _id: string;
    username: string;
    displayName: string;
    email?: string;
    avatarUrl?: string;
  };
  isRead: boolean;
  createdAt: string;
}

export const adminNotificationsService = {
  /** Gửi broadcast tới toàn bộ user */
  broadcast: (payload: SendBroadcastPayload) =>
    api.post("/admin/notifications/broadcast", payload).then((r) => r.data as SendResult),

  /** Gửi tới 1 hoặc nhiều user cụ thể */
  targeted: (payload: SendTargetedPayload) =>
    api.post("/admin/notifications/targeted", payload).then((r) => r.data as SendResult),

  /** Gửi theo filter (country, isBanned...) */
  sendByFilter: (payload: SendByFilterPayload) =>
    api.post("/admin/notifications/filter", payload).then((r) => r.data as SendResult),

  /** Lịch sử các campaign đã gửi */
  history: (params: { page?: number; limit?: number } = {}) =>
    api
      .get("/admin/notifications/history", { params })
      .then(
        (r) =>
          r.data as {
            items: NotificationCampaign[];
            total: number;
            page: number;
            limit: number;
          }
      ),

  /** Chi tiết 1 campaign - danh sách user đã nhận */
  campaignDetail: (
    params: {
      type: string;
      title: string;
      message: string;
      link?: string;
      sentAt: string;
      page?: number;
      limit?: number;
    }
  ) =>
    api.get("/admin/notifications/campaign-detail", { params }).then(
      (r) =>
        r.data as {
          items: CampaignRecipient[];
          total: number;
          page: number;
          limit: number;
        }
    ),

  /** Đếm số notif của 1 campaign (preview trước khi xóa) */
  campaignCount: (params: {
    type: string;
    title: string;
    message: string;
    link?: string;
    sentAt: string;
  }) =>
    api
      .get("/admin/notifications/campaign-count", { params })
      .then((r) => r.data as { total: number; unread: number }),

  /**
   * Xóa toàn bộ notification của 1 campaign khỏi DB user.
   * Backend sẽ emit realtime notification:deleted để user FE tự cập nhật.
   */
  deleteCampaign: (payload: {
    type: string;
    title: string;
    message: string;
    link?: string;
    sentAt: string;
  }) =>
    api
      .delete("/admin/notifications/campaign", { data: payload })
      .then((r) => r.data as { success: boolean; message: string; deleted: number }),
};
