// Rate limit - chong brute force / spam.
// Trong test (NODE_ENV=test) -> disable.
// Trong development -> tang cao de khong anh huong UX (Mac/Win share IP).
// Trong production -> giu muc thap, key theo userId neu co token, fallback IP.
import rateLimit from "express-rate-limit";

const isTest = process.env.NODE_ENV === "test";
const isProd = process.env.NODE_ENV === "production";

// Helper: dung userId neu da auth, fallback IP
const keyFn = (req) =>
  (req && req.user && (req.user.userId || req.user.id)) ||
  (req && req.ip) ||
  "unknown";

export const apiLimiter = isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      // Dev: 5000 req/15p cho moi user (hoac IP) de khong bi 429 khi test
      // Prod: 300 req/15p - du cho app chat binh thuong
      max: isProd ? 300 : 5000,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: keyFn,
      message: { message: "Qua nhieu yeu cau, vui long thu lai sau." },
    });

export const authLimiter = isTest
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 60 * 1000,
      max: isProd ? 5 : 30,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: "Thu dang nhap qua nhieu lan, vui long doi 1 phut." },
    });
