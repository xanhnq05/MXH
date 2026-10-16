import { friendshipService } from "../services/friendship.service.js";
import { blockService } from "../services/block.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const friendshipController = {
  sendRequest: asyncHandler(async (req, res) => {
    const result = await friendshipService.sendRequest(req.user._id, req.body.userId);
    res.json({ message: "Đã gửi lời mời kết bạn", ...result });
  }),
  accept: asyncHandler(async (req, res) => {
    res.json({
      message: "Đã chấp nhận lời mời",
      friendship: await friendshipService.acceptRequest(req.user._id, req.body.userId),
    });
  }),
  reject: asyncHandler(async (req, res) => {
    await friendshipService.rejectRequest(req.user._id, req.body.userId);
    res.json({ message: "Đã từ chối" });
  }),
  cancel: asyncHandler(async (req, res) => {
    await friendshipService.cancelRequest(req.user._id, req.body.userId);
    res.json({ message: "Đã huỷ lời mời" });
  }),
  unfriend: asyncHandler(async (req, res) => {
    await friendshipService.unfriend(req.user._id, req.params.userId);
    res.json({ message: "Đã huỷ kết bạn" });
  }),
  list: asyncHandler(async (req, res) => {
    res.json(
      await friendshipService.listFriends(req.user._id, {
        cursor: req.query.cursor,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      })
    );
  }),
  incoming: asyncHandler(async (req, res) => {
    res.json(
      await friendshipService.listIncoming(req.user._id, {
        cursor: req.query.cursor,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      })
    );
  }),
  sent: asyncHandler(async (req, res) => {
    res.json(
      await friendshipService.listSent(req.user._id, {
        cursor: req.query.cursor,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      })
    );
  }),
  suggestions: asyncHandler(async (req, res) => {
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    res.json({
      suggestions: await friendshipService.listSuggestions(req.user._id, limit),
    });
  }),
};

export const blockController = {
  block: asyncHandler(async (req, res) => {
    await blockService.block(req.user._id, req.body.userId);
    res.json({ message: "Đã chặn người dùng" });
  }),
  unblock: asyncHandler(async (req, res) => {
    await blockService.unblock(req.user._id, req.params.userId);
    res.json({ message: "Đã bỏ chặn" });
  }),
  list: asyncHandler(async (req, res) => {
    res.json(
      await blockService.list(req.user._id, {
        cursor: req.query.cursor,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      })
    );
  }),
};
