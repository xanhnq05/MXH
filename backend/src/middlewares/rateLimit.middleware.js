// Rate limit - chong brute force / spam.
// Trong test (NODE_ENV=test) -> disable.
import rateLimit from "express-rate-limit";

const isTest = process.env.NODE_ENV === "test";

export const apiLimiter = isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: "Qua nhieu yeu cau, vui long thu lai sau." },
    });

export const authLimiter = isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 60 * 1000,
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: "Thu dang nhap qua nhieu lan, vui long doi 1 phut." },
    });
