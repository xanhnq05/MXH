import { authService } from "../services/auth.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authController = {
  sendOtp: asyncHandler(async (req, res) => {
    const data = await authService.sendOtp(req.body);
    res.json(data);
  }),

  verifyOtp: asyncHandler(async (req, res) => {
    const data = await authService.verifyOtp(req.body);
    res.json(data);
  }),

  /** Bước 1: nhận thông tin cá nhân → gửi OTP */
  signUpStart: asyncHandler(async (req, res) => {
    const data = await authService.signUpStart(req.body);
    res.json(data);
  }),

  /** Bước 3: nhận mật khẩu → tạo user */
  signUpComplete: asyncHandler(async (req, res) => {
    const { user } = await authService.signUpComplete(req.body);
    res.status(201).json({
      message: "Đăng ký thành công",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
      },
      username: user.username,
    });
  }),

  /** API cũ giữ tương thích */
  signUp: asyncHandler(async (req, res) => {
    const { user } = await authService.signUp(req.body);
    res.status(201).json({
      message: "Đăng ký thành công",
      user: { _id: user._id, username: user.username, email: user.email },
    });
  }),

  signIn: asyncHandler(async (req, res) => {
    const data = await authService.signIn({
      ...req.body,
      req,
      res,
    });
    res.json({ message: "Đăng nhập thành công", ...data });
  }),

  refresh: asyncHandler(async (req, res) => {
    const data = await authService.refresh({ req, res });
    res.json(data);
  }),

  signOut: asyncHandler(async (req, res) => {
    await authService.signOut({ req, res });
    res.status(204).end();
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    const data = await authService.forgotPassword(req.body);
    res.json(data);
  }),

  resetPassword: asyncHandler(async (req, res) => {
    const data = await authService.resetPassword(req.body);
    res.json({ message: "Đặt lại mật khẩu thành công", ...data });
  }),

  changePassword: asyncHandler(async (req, res) => {
    const data = await authService.changePassword({
      userId: req.user._id,
      ...req.body,
    });
    res.json({ message: "Đổi mật khẩu thành công, vui lòng đăng nhập lại", ...data });
  }),
};
