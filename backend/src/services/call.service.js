// Call service — quản lý CallLog, signaling metadata.
// RTC connection thực sự do client + socket xử lý (offer/answer/ICE).

import CallLog from "../models/CallLog.js";
import Conversation from "../models/Conversation.js";
import { ApiError } from "../utils/ApiError.js";

const assertMember = async (meId, convId) => {
  const conv = await Conversation.findById(convId);
  if (!conv) throw new ApiError(404, "Hội thoại không tồn tại");
  if (!conv.members.some((m) => m.userId.toString() === meId.toString()))
    throw new ApiError(403, "Bạn không phải thành viên");
  return conv;
};

export const callService = {
  async startCall(meId, { conversationId, type, mode }) {
    const conv = await assertMember(meId, conversationId);
    const log = await CallLog.create({
      type,
      mode: mode || (conv.type === "group" ? "group" : "direct"),
      conversationId,
      callerId: meId,
      participants: conv.members.map((m) => m.userId),
      startedAt: new Date(),
      status: "ongoing",
    });
    return log;
  },

  async endCall(meId, callId, { status = "ended" } = {}) {
    const log = await CallLog.findById(callId);
    if (!log) throw new ApiError(404, "Cuộc gọi không tồn tại");
    log.endedAt = new Date();
    log.duration = Math.floor((log.endedAt - log.startedAt) / 1000);
    log.status = status;
    await log.save();
    return log;
  },

  async listForUser(meId, { limit = 30 } = {}) {
    return CallLog.find({ participants: meId })
      .sort({ startedAt: -1 })
      .limit(limit)
      .populate("callerId", "username displayName avatarUrl")
      .populate("participants", "username displayName avatarUrl");
  },
};
