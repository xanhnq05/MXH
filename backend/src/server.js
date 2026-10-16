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

const app = express();
const httpServer = createServer(app);

// ===== Security & parsers =====
app.set("trust proxy", 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin: env.CLIENT_URL,
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

// ===== 404 + Error handler (cuối cùng) =====
app.use(notFoundMiddleware);
app.use(errorMiddleware);

// ===== Khởi động =====
const start = async () => {
  await connectDB();
  setupSocket(httpServer);
  httpServer.listen(env.PORT, () => {
    console.log(`🚀 MXH backend đang chạy tại http://localhost:${env.PORT}`);
    console.log(`🌐 CORS cho phép: ${env.CLIENT_URL}`);
  });
};

start().catch((err) => {
  console.error("💥 Khởi động thất bại:", err);
  process.exit(1);
});
