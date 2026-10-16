import { userService } from "../services/user.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const userController = {
  getMe: asyncHandler(async (req, res) => {
    res.json({ user: await userService.getMe(req.user._id) });
  }),

  getById: asyncHandler(async (req, res) => {
    res.json({ user: await userService.getById(req.user._id, req.params.id) });
  }),

  presence: asyncHandler(async (req, res) => {
    res.json(
      await userService.getPresence(req.user._id, req.params.id)
    );
  }),

  search: asyncHandler(async (req, res) => {
    const users = await userService.search(req.user._id, req.query.q);
    res.json({ users });
  }),

  updateProfile: asyncHandler(async (req, res) => {
    res.json({ user: await userService.updateProfile(req.user._id, req.body) });
  }),

  updatePreferences: asyncHandler(async (req, res) => {
    res.json({
      user: await userService.updatePreferences(req.user._id, req.body),
    });
  }),

  uploadAvatar: asyncHandler(async (req, res) => {
    res.json({ user: await userService.uploadAvatar(req.user._id, req.file) });
  }),

  uploadCover: asyncHandler(async (req, res) => {
    res.json({ user: await userService.uploadCover(req.user._id, req.file) });
  }),

  removeCover: asyncHandler(async (req, res) => {
    res.json({ user: await userService.removeCover(req.user._id) });
  }),

  removeAvatar: asyncHandler(async (req, res) => {
    res.json({ user: await userService.removeAvatar(req.user._id) });
  }),

  setE2EEKeys: asyncHandler(async (req, res) => {
    res.json({ user: await userService.setE2EEKeys(req.user._id, req.body) });
  }),

  /** Xóa tài khoản vĩnh viễn */
  deleteAccount: asyncHandler(async (req, res) => {
    await userService.deleteAccount(req.user._id);
    res.clearCookie("refreshToken");
    res.json({ message: "Tài khoản đã được xóa vĩnh viễn" });
  }),
};
