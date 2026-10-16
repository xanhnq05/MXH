// Xác minh access token từ header Authorization: Bearer <token>.
// Sau khi xác minh, gắn `req.user` (toàn bộ document User trừ hashedPassword).

import { verifyAccessToken } from "../utils/generateToken.js";
import User from "../models/User.js";

export const protectedRoute = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ message: "Không tìm thấy access token" });
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      const message =
        err.name === "TokenExpiredError"
          ? "Access token đã hết hạn"
          : "Access token không hợp lệ";
      return res.status(403).json({ message });
    }

    const user = await User.findById(decoded.userId).select(
      "-hashedPassword"
    );
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Lỗi trong authMiddleware:", error);
    res.status(500).json({ message: "Lỗi hệ thống" });
  }
};
