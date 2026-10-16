// analytics.controller — endpoints analytics cho dashboard.

import { asyncHandler } from "../utils/asyncHandler.js";
import { analyticsService } from "../services/analytics.service.js";

export const analyticsController = {
  overview: asyncHandler(async (req, res) => {
    res.json(await analyticsService.overview());
  }),

  userGrowth: asyncHandler(async (req, res) => {
    const days = Math.min(Number(req.query.days) || 30, 365);
    res.json({ data: await analyticsService.userGrowth(days) });
  }),

  messageVolume: asyncHandler(async (req, res) => {
    const days = Math.min(Number(req.query.days) || 30, 365);
    res.json({ data: await analyticsService.messageVolume(days) });
  }),

  reportsByCategory: asyncHandler(async (req, res) => {
    res.json({ data: await analyticsService.reportsByCategory() });
  }),

  reportsByStatus: asyncHandler(async (req, res) => {
    res.json({ data: await analyticsService.reportsByStatus() });
  }),

  topReporters: asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    res.json({ data: await analyticsService.topReporters(limit) });
  }),

  topReportedUsers: asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    res.json({ data: await analyticsService.topReportedUsers(limit) });
  }),
};
