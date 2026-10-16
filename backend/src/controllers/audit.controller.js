// audit.controller — xem audit log.

import { asyncHandler } from "../utils/asyncHandler.js";
import { auditService } from "../services/audit.service.js";

export const auditController = {
  list: asyncHandler(async (req, res) => {
    const { page, limit, adminId, action, targetType, from, to } = req.query;
    const data = await auditService.list({
      page: Number(page) || 1,
      limit: Math.min(Number(limit) || 50, 200),
      adminId,
      action,
      targetType,
      from,
      to,
    });
    res.json(data);
  }),
};
