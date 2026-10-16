// adminUsers.controller — endpoints quản lý user (admin).

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { adminUsersService } from "../services/adminUsers.service.js";
import { banService } from "../services/ban.service.js";
import { auditService } from "../services/audit.service.js";

export const adminUsersController = {
  list: asyncHandler(async (req, res) => {
    const { page, limit, search, status, isBanned, country, sort } = req.query;
    const data = await adminUsersService.list({
      page: Number(page) || 1,
      limit: Math.min(Number(limit) || 20, 100),
      search,
      status,
      isBanned: isBanned === undefined ? undefined : isBanned === "true" || isBanned === true,
      country,
      sort,
    });
    res.json(data);
  }),

  get: asyncHandler(async (req, res) => {
    const user = await adminUsersService.getById(req.params.id);
    const bans = await banService.listByUser(req.params.id);
    res.json({ user, bans });
  }),

  update: asyncHandler(async (req, res) => {
    const before = await adminUsersService.getById(req.params.id);
    const user = await adminUsersService.update(req.params.id, req.body);
    await auditService.log(req, {
      action: "user.update",
      targetType: "user",
      targetId: user._id,
      before: { displayName: before.displayName, bio: before.bio, country: before.country },
      after: { displayName: user.displayName, bio: user.bio, country: user.country },
    });
    res.json({ user });
  }),

  warn: asyncHandler(async (req, res) => {
    const { reason } = req.body;
    if (!reason) throw new ApiError(400, "Vui lòng nhập lý do cảnh báo");
    const user = await adminUsersService.warn(req.params.id, reason, req.user._id);
    await auditService.log(req, {
      action: "user.warn",
      targetType: "user",
      targetId: user._id,
      after: { warningCount: user.warningCount, reason },
    });
    res.json({ user });
  }),

  ban: asyncHandler(async (req, res) => {
    const { reason, category, scope, expiresAt, reportIds } = req.body;
    if (!reason || !category) throw new ApiError(400, "Thiếu lý do hoặc category");
    const ban = await banService.ban({
      userId: req.params.id,
      bannedBy: req.user._id,
      reason,
      category,
      scope,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      evidenceReportIds: Array.isArray(reportIds) ? reportIds : [],
    });
    await auditService.log(req, {
      action: "user.ban",
      targetType: "user",
      targetId: req.params.id,
      after: { reason, category, scope, expiresAt: ban.expiresAt },
    });
    res.status(201).json({ ban });
  }),

  unban: asyncHandler(async (req, res) => {
    const { reason } = req.body || {};
    const result = await banService.unban({
      userId: req.params.id,
      liftedBy: req.user._id,
      liftReason: reason || "",
    });
    await auditService.log(req, {
      action: "user.unban",
      targetType: "user",
      targetId: req.params.id,
      after: { reason: reason || "" },
    });
    res.json({ success: true, modified: result.modifiedCount || 0 });
  }),

  softDelete: asyncHandler(async (req, res) => {
    const user = await adminUsersService.softDelete(req.params.id);
    await auditService.log(req, {
      action: "user.soft_delete",
      targetType: "user",
      targetId: req.params.id,
    });
    res.json({ user });
  }),
};
