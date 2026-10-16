// Types chung cho admin app

export interface AdminUser {
  _id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  country?: string;
  city?: string;
  school?: string;
  workplace?: string;
  e2eePublicKey?: string;
  isOnline: boolean;
  lastSeen?: string;
  isBanned: boolean;
  bannedUntil?: string | null;
  bannedAt?: string | null;
  bannedReason?: string;
  warningCount: number;
  riskScore?: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BanRecord {
  _id: string;
  userId: string | AdminUser;
  bannedBy: string | { _id: string; email: string; displayName?: string; username?: string };
  reason: string;
  category: "spam" | "abuse" | "hate" | "nsfw" | "scam" | "impersonation" | "other";
  scope: string[];
  expiresAt: string | null;
  isActive: boolean;
  liftedBy?: string | { _id: string; email: string; displayName?: string; username?: string } | null;
  liftedAt?: string | null;
  liftReason?: string;
  createdAt: string;
}

export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
export type ReportTargetType = "user" | "post" | "comment" | "message" | "sticker";
export type ReportCategory = "spam" | "abuse" | "hate" | "nsfw" | "scam" | "impersonation" | "other";
export type ReportResolution = "ban_user" | "delete_content" | "warn" | "no_action";
export type ReportPriority = "low" | "normal" | "high" | "critical";

export interface AdminReport {
  _id: string;
  reporterId: { _id: string; username: string; displayName: string; avatarUrl?: string; email?: string };
  targetType: ReportTargetType;
  targetId: string;
  targetSnapshot?: any;
  category: ReportCategory;
  description: string;
  status: ReportStatus;
  priority: ReportPriority;
  assignedTo?: { _id: string; username: string; displayName: string; email?: string } | null;
  resolvedBy?: { _id: string; username: string; displayName: string; email?: string } | null;
  resolution?: ReportResolution | null;
  resolutionNote?: string;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

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

export interface AdminAuditLog {
  _id: string;
  adminId: { _id: string; email: string; displayName?: string; username?: string } | string;
  adminEmail: string;
  adminRole: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  before?: any;
  after?: any;
  metadata?: any;
  ip: string;
  userAgent: string;
  createdAt: string;
}

export interface AnalyticsOverview {
  users: { total: number; new30d: number; growthPct: number };
  posts: { total: number; new30d: number };
  messages: { total: number; new30d: number };
  media: { total: number; active: number };
  reports: { total: number; open: number };
  bans: { active: number };
  generatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export type AdminNotificationType =
  | "admin_announcement"
  | "admin_warning"
  | "admin_promo"
  | "admin_maintenance";
