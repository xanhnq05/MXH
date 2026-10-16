// Block service — chặn / bỏ chặn user.

import Block from "../models/Block.js";
import { ApiError } from "../utils/ApiError.js";
import { notificationService } from "./notification.service.js";
import Friendship from "../models/Friendship.js";

export const blockService = {
  async block(meId, targetId) {
    if (meId.toString() === targetId.toString())
      throw new ApiError(400, "Không thể tự chặn chính mình");
    const exists = await Block.findOne({ blocker: meId, blocked: targetId });
    if (exists) throw new ApiError(409, "Đã chặn người này");
    await Block.create({ blocker: meId, blocked: targetId });

    // Đồng thời huỷ quan hệ bạn nếu có
    await Friendship.deleteMany({
      $or: [
        { requester: meId, recipient: targetId },
        { requester: targetId, recipient: meId },
      ],
    });

    return { success: true };
  },

  async unblock(meId, targetId) {
    const r = await Block.findOneAndDelete({ blocker: meId, blocked: targetId });
    if (!r) throw new ApiError(404, "Chưa chặn người này");
    return { success: true };
  },

  async list(meId, { cursor, limit = 20 } = {}) {
    const { paginate } = await import("../utils/pagination.js");
    const { items, nextCursor } = await paginate({
      model: Block,
      filter: { blocker: meId },
      cursor,
      limit,
      populate: [{ path: "blocked", select: "username displayName avatarUrl" }],
    });
    return { items, nextCursor };
  },
};
