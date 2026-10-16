import { chatService } from "../services/chat.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const conversationController = {
  list: asyncHandler(async (req, res) => {
    res.json({ conversations: await chatService.listForUser(req.user._id) });
  }),

  getOrCreateDirect: asyncHandler(async (req, res) => {
    res.json({
      conversation: await chatService.getOrCreateDirect(
        req.user._id,
        req.body.userId
      ),
    });
  }),

  createGroup: asyncHandler(async (req, res) => {
    res
      .status(201)
      .json({ conversation: await chatService.createGroup(req.user._id, req.body) });
  }),

  getById: asyncHandler(async (req, res) => {
    res.json({ conversation: await chatService.getById(req.user._id, req.params.id) });
  }),

  updateGroup: asyncHandler(async (req, res) => {
    res.json({
      conversation: await chatService.updateGroup(
        req.user._id,
        req.params.id,
        req.body
      ),
    });
  }),

  deleteGroup: asyncHandler(async (req, res) => {
    await chatService.deleteGroup(req.user._id, req.params.id);
    res.status(204).end();
  }),

  leaveGroup: asyncHandler(async (req, res) => {
    const r = await chatService.leaveGroup(req.user._id, req.params.id);
    res.json({ message: "Đã rời nhóm", ...r });
  }),

  addMembers: asyncHandler(async (req, res) => {
    res.json({
      conversation: await chatService.addMembers(
        req.user._id,
        req.params.id,
        req.body.memberIds
      ),
    });
  }),

  removeMember: asyncHandler(async (req, res) => {
    await chatService.removeMember(req.user._id, req.params.id, req.params.userId);
    res.json({ message: "Đã xoá thành viên" });
  }),

  changeRole: asyncHandler(async (req, res) => {
    res.json({
      conversation: await chatService.changeRole(
        req.user._id,
        req.params.id,
        req.body.userId,
        req.body.newRole
      ),
    });
  }),

  transferOwnership: asyncHandler(async (req, res) => {
    res.json({
      conversation: await chatService.transferOwnership(
        req.user._id,
        req.params.id,
        req.body.userId
      ),
    });
  }),

  setNickname: asyncHandler(async (req, res) => {
    res.json({
      conversation: await chatService.setNickname(
        req.user._id,
        req.params.id,
        req.body.nickname
      ),
    });
  }),

  mute: asyncHandler(async (req, res) => {
    res.json(
      await chatService.mute(req.user._id, req.params.id, req.body.mute)
    );
  }),

  pinMessage: asyncHandler(async (req, res) => {
    res.json(
      await chatService.pinMessage(req.user._id, req.params.id, req.body.messageId)
    );
  }),
  unpinMessage: asyncHandler(async (req, res) => {
    res.json(
      await chatService.unpinMessage(req.user._id, req.params.id, req.body.messageId)
    );
  }),
};
