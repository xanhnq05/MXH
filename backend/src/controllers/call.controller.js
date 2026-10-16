import { callService } from "../services/call.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const callController = {
  start: asyncHandler(async (req, res) => {
    res.json({ call: await callService.startCall(req.user._id, req.body) });
  }),
  end: asyncHandler(async (req, res) => {
    res.json({
      call: await callService.endCall(req.user._id, req.params.id, req.body),
    });
  }),
  list: asyncHandler(async (req, res) => {
    res.json({ calls: await callService.listForUser(req.user._id, req.query) });
  }),
};
