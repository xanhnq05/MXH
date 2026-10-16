// E2E test setup: tao app Express rieng (khong listen port) de test.
import mongoose from "mongoose";
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";

import authRoute from "../src/routes/auth.route.js";
import userRoute from "../src/routes/user.route.js";
import postRoute from "../src/routes/post.route.js";
import conversationRoute from "../src/routes/conversation.route.js";
import messageRoute from "../src/routes/message.route.js";
import notificationRoute from "../src/routes/notification.route.js";
import friendshipRoute from "../src/routes/friendship.route.js";
import stickerRoute from "../src/routes/sticker.route.js";
import gifRoute from "../src/routes/gif.route.js";
import adminRoute from "../src/routes/admin.route.js";
import { errorMiddleware, notFoundMiddleware } from "../src/middlewares/error.middleware.js";
import { connectDB } from "../src/libs/db.js";
import * as mailMod from "../src/services/mail.service.js";
import * as uploadMod from "../src/services/upload.service.js";

// Patch mail service ngay khi load setupE2E
const _sendOtp = mailMod.mailService.sendOtp.bind(mailMod.mailService);
const _sendGeneric = mailMod.mailService.sendGeneric.bind(mailMod.mailService);
mailMod.mailService.sendOtp = async (...args) => ({ messageId: "mock" });
mailMod.mailService.sendGeneric = async (...args) => ({ messageId: "mock" });

// Patch upload service
const _uploadFile = uploadMod.uploadService.uploadFile.bind(uploadMod.uploadService);
const _uploadMany = uploadMod.uploadService.uploadMany.bind(uploadMod.uploadService);
uploadMod.uploadService.uploadFile = async ({ originalName }) => ({
  url: `https://test.supabase.co/mock/${Date.now()}_${originalName}`,
  key: `mock/${Date.now()}_${originalName}`,
  size: 1024,
  mimeType: "image/jpeg",
});
uploadMod.uploadService.uploadMany = async ({ files }) =>
  (files || []).map((f, i) => ({
    url: `https://test.supabase.co/mock/${i}_${f.originalname}`,
    key: `mock/${i}_${f.originalname}`,
    size: 1024,
    mimeType: f.mimetype,
  }));
uploadMod.uploadService.deleteFile = async () => {};
uploadMod.uploadService.getSignedUrl = async () => "https://test.supabase.co/signed";

export const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(cors({ origin: "http://localhost:5173", credentials: true }));

  app.get("/api/health", (_req, res) =>
    res.json({ status: "ok", time: new Date().toISOString() })
  );
  app.use("/api/auth", authRoute);
  app.use("/api/users", userRoute);
  app.use("/api/posts", postRoute);
  app.use("/api/conversations", conversationRoute);
  app.use("/api/messages", messageRoute);
  app.use("/api/notifications", notificationRoute);
  app.use("/api/friends", friendshipRoute);
  app.use("/api/stickers", stickerRoute);
  app.use("/api/gifs", gifRoute);
  app.use("/api/admin", adminRoute);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
};

export const setupTestDB = async () => {
  await connectDB();
};

export const clearTestDB = async () => {
  const collections = await mongoose.connection.db.collections();
  for (const c of collections) {
    await c.deleteMany({});
  }
};

export const closeTestDB = async () => {
  await mongoose.disconnect();
};
