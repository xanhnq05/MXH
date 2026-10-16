// Auth service — toàn bộ business logic cho signup, signin, OTP, refresh, ...

import bcrypt from "bcrypt";
import crypto from "crypto";
import User from "../models/User.js";
import Session from "../models/Session.js";
import OtpVerification from "../models/OtpVerification.js";
import { ApiError } from "../utils/ApiError.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken.js";
import { generateOtpCode, hashOtp, verifyOtpHash } from "../utils/otp.js";
import { mailService } from "./mail.service.js";
import { env } from "../configs/env.config.js";

const REFRESH_TTL_MS = env.REFRESH_TOKEN_TTL_MS; // 7 ngày
const OTP_TTL_MS = 5 * 60 * 1000; // 5 phút
const OTP_MAX_ATTEMPTS = 5;

const setRefreshCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: REFRESH_TTL_MS,
    path: "/api/auth",
  });
};

const buildAuthResponse = (user, accessToken) => ({
  user: {
    _id: user._id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    theme: user.theme,
    soundEnabled: user.soundEnabled,
    e2eePublicKey: user.e2eePublicKey,
    e2eeEcdhPublicKey: user.e2eeEcdhPublicKey,
  },
  accessToken,
});

/** Sinh username từ email + random suffix để tránh trùng */
const generateUsernameFromEmail = (email) => {
  const local = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
  const base = local.slice(0, 20) || "user";
  const random = crypto.randomBytes(2).toString("hex");
  return `${base}_${random}`;
};

export const authService = {
  /** Gửi OTP — dùng cho cả signup, forgot_password */
  async sendOtp({ email, type }) {
    const normalized = email.toLowerCase().trim();
    const code = generateOtpCode();
    const codeHash = hashOtp(code);

    // Xoá OTP cũ cùng email + type
    await OtpVerification.deleteMany({ email: normalized, type });

    await OtpVerification.create({
      email: normalized,
      codeHash,
      type,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    });

    try {
      await mailService.sendOtp({ to: normalized, code, type });
    } catch (err) {
      console.error("Gửi mail OTP thất bại:", err.message);
      throw new ApiError(500, "Gửi OTP thất bại, vui lòng thử lại");
    }

    return {
      message: "Đã gửi OTP đến email",
      expiresIn: OTP_TTL_MS / 1000,
    };
  },

  /** Verify OTP */
  async verifyOtp({ email, code, type }) {
    const normalized = email.toLowerCase().trim();
    const record = await OtpVerification.findOne({
      email: normalized,
      type,
      isUsed: false,
    }).sort({ createdAt: -1 });

    if (!record) throw ApiError.badRequest("OTP không tồn tại hoặc đã dùng");
    if (record.expiresAt < new Date())
      throw ApiError.badRequest("OTP đã hết hạn");
    if (record.attempts >= OTP_MAX_ATTEMPTS)
      throw ApiError.badRequest("Bạn đã nhập sai quá nhiều lần");

    const ok = verifyOtpHash(code, record.codeHash);
    if (!ok) {
      record.attempts += 1;
      await record.save();
      throw ApiError.badRequest("OTP không chính xác");
    }

    record.isUsed = true;
    await record.save();
    return { verified: true };
  },

  /**
   * Bước 1 đăng ký: nhận thông tin cá nhân, kiểm tra email có sẵn không
   * → Nếu OK: gửi OTP
   */
  async signUpStart({ fullName, email, birthday, phone }) {
    const normalizedEmail = email.toLowerCase().trim();

    // Check email đã tồn tại chưa
    const exist = await User.findOne({ email: normalizedEmail });
    if (exist) {
      throw new ApiError(409, "Email đã được sử dụng");
    }

    // Gửi OTP signup
    await this.sendOtp({ email: normalizedEmail, type: "signup" });

    return {
      message: "Vui lòng kiểm tra email để lấy mã OTP",
      email: normalizedEmail,
      // Trả về thông tin đã nhận để client dùng ở bước sau
      pending: { fullName, email: normalizedEmail, birthday, phone: phone || "" },
    };
  },

  /**
   * Bước 3 đăng ký: nhận email (đã verify OTP) + password
   * → Tạo user
   */
  async signUpComplete({ email, password, fullName, birthday, phone }) {
    const normalizedEmail = email.toLowerCase().trim();

    // Check đã verify OTP signup chưa
    const verifiedOtp = await OtpVerification.findOne({
      email: normalizedEmail,
      type: "signup",
      isUsed: true,
    }).sort({ createdAt: -1 });

    if (!verifiedOtp) {
      throw new ApiError(
        400,
        "Email chưa được xác thực. Vui lòng nhập lại OTP."
      );
    }

    // Check email đã tồn tại chưa
    const exist = await User.findOne({ email: normalizedEmail });
    if (exist) {
      throw new ApiError(409, "Email đã được sử dụng");
    }

    // Tạo username ngẫu nhiên
    const username = generateUsernameFromEmail(normalizedEmail);

    // Hash + tạo user — displayName mặc định = fullName (user có thể sửa sau)
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      hashedPassword,
      email: normalizedEmail,
      fullName: fullName || username,
      displayName: fullName || username,
      ...(birthday && { birthday: new Date(birthday) }),
      ...(phone && { phone }),
    });

    return { user };
  },

  /**
   * API cũ giữ tương thích, không dùng nữa
   * @deprecated
   */
  async signUp({ username, password, email, displayName, otp }) {
    // Verify OTP
    await this.verifyOtp({ email, otp, type: "signup" });

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = (username || generateUsernameFromEmail(normalizedEmail))
      .toLowerCase()
      .trim();

    // Check trùng
    const dup = await User.findOne({
      $or: [
        { username: normalizedUsername },
        { email: normalizedEmail },
      ],
    });
    if (dup) {
      const field = dup.username === normalizedUsername ? "username" : "email";
      throw new ApiError(409, `${field} đã được sử dụng`);
    }

    // Hash + tạo user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: normalizedUsername,
      hashedPassword,
      email: normalizedEmail,
      displayName: displayName || normalizedUsername,
    });

    return { user };
  },

  /** Đăng nhập (cho phép nhập username HOẶC email) */
  async signIn({ username, password, req, res }) {
    const id = username.toLowerCase().trim();
    const isEmail = id.includes("@");
    const user = await User.findOne(
      isEmail ? { email: id } : { username: id }
    );
    if (!user) throw new ApiError(401, "Sai username hoặc mật khẩu");

    const ok = await bcrypt.compare(password, user.hashedPassword);
    if (!ok) throw new ApiError(401, "Sai username hoặc mật khẩu");

    const accessToken = generateAccessToken({ userId: user._id });
    const refreshToken = generateRefreshToken();

    await Session.create({
      userId: user._id,
      refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      userAgent: req?.headers?.["user-agent"],
      ip: req?.ip,
    });

    setRefreshCookie(res, refreshToken);
    return buildAuthResponse(user, accessToken);
  },

  /** Refresh access token */
  async refresh({ req, res }) {
    const token = req.cookies?.refreshToken;
    if (!token) throw new ApiError(401, "Không tìm thấy refresh token");

    const session = await Session.findOne({ refreshToken: token });
    if (!session)
      throw new ApiError(403, "Refresh token không hợp lệ hoặc đã bị thu hồi");
    if (session.expiresAt < new Date())
      throw new ApiError(403, "Refresh token đã hết hạn");

    const user = await User.findById(session.userId);
    if (!user) throw new ApiError(404, "Người dùng không tồn tại");

    const accessToken = generateAccessToken({ userId: user._id });
    return buildAuthResponse(user, accessToken);
  },

  /** Đăng xuất */
  async signOut({ req, res }) {
    const token = req.cookies?.refreshToken;
    if (token) {
      await Session.deleteOne({ refreshToken: token });
    }
    res.clearCookie("refreshToken", { path: "/api/auth" });
    return { success: true };
  },

  /** Quên mật khẩu — gửi OTP */
  async forgotPassword({ email }) {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) throw new ApiError(404, "Email chưa đăng ký tài khoản");
    return this.sendOtp({ email, type: "forgot_password" });
  },

  /** Reset mật khẩu bằng OTP */
  async resetPassword({ email, otp, newPassword }) {
    await this.verifyOtp({ email, otp, type: "forgot_password" });
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { hashedPassword },
      { new: true }
    );
    if (!user) throw new ApiError(404, "Email chưa đăng ký tài khoản");
    // Thu hồi mọi session
    await Session.deleteMany({ userId: user._id });
    return { success: true };
  },

  /** Đổi mật khẩu (đã đăng nhập) */
  async changePassword({ userId, currentPassword, newPassword }) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "Người dùng không tồn tại");
    const ok = await bcrypt.compare(currentPassword, user.hashedPassword);
    if (!ok) throw new ApiError(401, "Mật khẩu hiện tại không đúng");
    user.hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.save();
    // Thu hồi mọi session (kể cả hiện tại) để bắt đăng nhập lại
    await Session.deleteMany({ userId });
    return { success: true };
  },
};
