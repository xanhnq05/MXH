// MXH — Backend entry point
// - Express 5 + Mongoose + Socket.IO + Helmet + Rate limit
// - Sau khi mount routes, errorMiddleware nằm CUỐI cùng.

import express from "express";
import { createServer } from "http";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import { env } from "./configs/env.config.js";
import { connectDB } from "./libs/db.js";
import { setupSocket } from "./libs/socket.js";
import { apiLimiter } from "./middlewares/rateLimit.middleware.js";
import { errorMiddleware, notFoundMiddleware } from "./middlewares/error.middleware.js";

// Routes
import authRoute from "./routes/auth.route.js";
import userRoute from "./routes/user.route.js";
import postRoute from "./routes/post.route.js";
import commentRoute from "./routes/comment.route.js";
import friendshipRoute from "./routes/friendship.route.js";
import conversationRoute from "./routes/conversation.route.js";
import messageRoute from "./routes/message.route.js";
import notificationRoute from "./routes/notification.route.js";
import callRoute from "./routes/call.route.js";
import stickerRoute from "./routes/sticker.route.js";
import gifRoute from "./routes/gif.route.js";
import adminRoute from "./routes/admin.route.js";
import reportsRoute from "./routes/reports.route.js";

const app = express();
const httpServer = createServer(app);

// ===== Security & parsers =====
app.set("trust proxy", 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
// CORS: cho phép nhiều domain (vd: greenx.app + www.greenx.app + vercel preview)
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
if (!allowedOrigins.length) {
  // Fallback: dùng 2 env cũ
  if (env.CLIENT_URL) allowedOrigins.push(env.CLIENT_URL);
  if (env.ADMIN_CLIENT_URL) allowedOrigins.push(env.ADMIN_CLIENT_URL);
}
app.use(
  cors({
    origin: (origin, cb) => {
      // Cho phép Postman/curl (không có Origin)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      // Cho phép mọi subdomain vercel.app (preview deploys)
      if (/\.vercel\.app$/.test(new URL(origin).hostname)) return cb(null, true);
      cb(new Error("CORS not allowed: " + origin));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// ===== Health check =====
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ===== Public routes =====
app.use("/api/auth", authRoute);

// ===== Global rate limit (chỉ áp dụng cho routes private) =====
app.use("/api", apiLimiter);

// ===== Private routes =====
app.use("/api/users", userRoute);
app.use("/api/posts", postRoute);
app.use("/api/comments", commentRoute);
app.use("/api/friends", friendshipRoute);
app.use("/api/conversations", conversationRoute);
app.use("/api/messages", messageRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/calls", callRoute);
app.use("/api/stickers", stickerRoute);
app.use("/api/gifs", gifRoute);
app.use("/api/admin", adminRoute);
app.use("/api/reports", reportsRoute);

// ===== 404 + Error handler (cuối cùng) =====
app.use(notFoundMiddleware);
app.use(errorMiddleware);

// ===== Khởi động =====
const start = async () => {
  await connectDB();
  setupSocket(httpServer);
  // Render yêu cầu bind 0.0.0.0 (không phải localhost)
  httpServer.listen(env.PORT, "0.0.0.0", () => {
    console.log(`MXH backend dang chay tai 0.0.0.0:${env.PORT}`);
    console.log(`CORS cho phep: ${[env.CLIENT_URL, env.ADMIN_CLIENT_URL].filter(Boolean).join(", ")}`);
  });
};

start().catch((err) => {
  console.error("💥 Khởi động thất bại:", err);
  process.exit(1);
});
