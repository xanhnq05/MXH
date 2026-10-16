// Bắt lỗi tập trung — đặt CUỐI cùng trong chain app.use(...).
// 4 tham số (err, req, res, next) bắt buộc để Express nhận diện là error handler.

import { ApiError } from "../utils/ApiError.js";
import { ZodError } from "zod";

export const errorMiddleware = (err, req, res, next) => {
  // Lỗi Zod validation
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Dữ liệu không hợp lệ",
      details: err.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
  }

  // Lỗi do mình ném ra (ApiError)
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      message: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  // Lỗi Mongoose validation
  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: "Dữ liệu không hợp lệ",
      details: Object.values(err.errors).map((e) => e.message),
    });
  }

  // Lỗi Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res
      .status(409)
      .json({ message: `${field} đã tồn tại trong hệ thống` });
  }

  // Lỗi JWT
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ message: "Token không hợp lệ" });
  }

  console.error("💥 Unhandled error:", err);
  res.status(500).json({
    message: "Lỗi hệ thống",
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
    }),
  });
};

export const notFoundMiddleware = (req, res) => {
  res.status(404).json({ message: `Không tìm thấy ${req.originalUrl}` });
};
