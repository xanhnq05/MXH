// analytics.service — tổng hợp số liệu cho dashboard admin.

import User from "../models/User.js";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Message from "../models/Message.js";
import MediaAsset from "../models/MediaAsset.js";
import Report from "../models/Report.js";
import Ban from "../models/Ban.js";

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
};

const fillMissingDays = (buckets, fromDays) => {
  const out = [];
  for (let i = fromDays - 1; i >= 0; i--) {
    const d = daysAgo(i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, count: buckets[key] || 0 });
  }
  return out;
};

export const analyticsService = {
  async overview() {
    const now = new Date();
    const last30 = daysAgo(30);
    const prev30 = daysAgo(60);

    const [
      totalUsers,
      newUsers30d,
      newUsersPrev30,
      totalPosts,
      newPosts30d,
      totalMessages,
      newMessages30d,
      totalMedia,
      activeMedia,
      totalReports,
      openReports,
      activeBans,
    ] = await Promise.all([
      User.countDocuments({ isDeleted: false }),
      User.countDocuments({ createdAt: { $gte: last30 }, isDeleted: false }),
      User.countDocuments({ createdAt: { $gte: prev30, $lt: last30 }, isDeleted: false }),
      Post.countDocuments({ deletedAt: null }),
      Post.countDocuments({ createdAt: { $gte: last30 }, deletedAt: null }),
      Message.estimatedDocumentCount(),
      Message.countDocuments({ createdAt: { $gte: last30 } }),
      MediaAsset.countDocuments(),
      MediaAsset.countDocuments({ isActive: true }),
      Report.countDocuments(),
      Report.countDocuments({ status: "open" }),
      Ban.countDocuments({ isActive: true }),
    ]);

    const userGrowthPct = newUsersPrev30 === 0
      ? (newUsers30d > 0 ? 100 : 0)
      : Math.round(((newUsers30d - newUsersPrev30) / newUsersPrev30) * 1000) / 10;

    return {
      users: { total: totalUsers, new30d: newUsers30d, growthPct: userGrowthPct },
      posts: { total: totalPosts, new30d: newPosts30d },
      messages: { total: totalMessages, new30d: newMessages30d },
      media: { total: totalMedia, active: activeMedia },
      reports: { total: totalReports, open: openReports },
      bans: { active: activeBans },
      generatedAt: now.toISOString(),
    };
  },

  async userGrowth(days = 30) {
    const since = daysAgo(days);
    const buckets = await User.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]);
    const map = Object.fromEntries(buckets.map((b) => [b._id, b.count]));
    return fillMissingDays(map, days);
  },

  async messageVolume(days = 30) {
    const since = daysAgo(days);
    const buckets = await Message.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
    ]);
    const map = Object.fromEntries(buckets.map((b) => [b._id, b.count]));
    return fillMissingDays(map, days);
  },

  async reportsByCategory() {
    return Report.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  },

  async reportsByStatus() {
    return Report.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  },

  async topReporters(limit = 10) {
    return Report.aggregate([
      { $group: { _id: "$reporterId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          count: 1,
          user: {
            _id: "$user._id",
            username: "$user.username",
            displayName: "$user.displayName",
            avatarUrl: "$user.avatarUrl",
          },
        },
      },
    ]);
  },

  async topReportedUsers(limit = 10) {
    return Report.aggregate([
      { $match: { targetType: "user" } },
      { $group: { _id: "$targetId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          count: 1,
          user: {
            _id: "$user._id",
            username: "$user.username",
            displayName: "$user.displayName",
            avatarUrl: "$user.avatarUrl",
            isBanned: "$user.isBanned",
          },
        },
      },
    ]);
  },
};

export default analyticsService;
