// Quản lý kết nối socket: presence, room, helpers.
// Mỗi user khi connect sẽ join vào room `user:<userId>` để nhận event cá nhân.

import { Server } from "socket.io";
import cookie from "cookie";
import cookieParser from "cookie-parser";
import { verifyAccessToken } from "../utils/generateToken.js";
import User from "../models/User.js";
import { env } from "../configs/env.config.js";

let io = null;
const userSockets = new Map(); // userId -> Set<socketId>

export const setupSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
    pingTimeout: 30000,
  });

  // Middleware xác thực socket: client gửi accessToken trong handshake.auth
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.accessToken ||
        parseCookieToken(socket.handshake.headers?.cookie);
      if (!token) return next(new Error("Unauthorized"));

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select(
        "-hashedPassword"
      );
      if (!user) return next(new Error("User not found"));

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Unauthorized: " + err.message));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    console.log(`🟢 Socket connected: ${userId}`);

    // Track sockets của user
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);

    // Cập nhật online
    User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() })
      .then(() => {
        io.emit("user:online", { userId });
      })
      .catch(() => {});

    // Join room cá nhân
    socket.join(`user:${userId}`);

    // ===== Chat handlers =====
    socket.on("conversation:join", (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });
    socket.on("conversation:leave", (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Typing
    socket.on("typing:start", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("typing:start", {
        conversationId,
        userId,
        username: socket.user.username,
      });
    });
    socket.on("typing:stop", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("typing:stop", {
        conversationId,
        userId,
      });
    });

    // Recording
    socket.on("recording:start", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("recording:start", {
        conversationId,
        userId,
      });
    });
    socket.on("recording:stop", ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit("recording:stop", {
        conversationId,
        userId,
      });
    });

    // ===== Call handlers (WebRTC signaling) =====
    socket.on("call:offer", (data) => {
      // data: { toUserId, conversationId, sdp, type, callId }
      io.to(`user:${data.toUserId}`).emit("call:offer", {
        fromUserId: userId,
        fromUser: {
          _id: socket.user._id,
          username: socket.user.username,
          displayName: socket.user.displayName,
          avatarUrl: socket.user.avatarUrl,
        },
        ...data,
      });
    });
    socket.on("call:answer", (data) => {
      io.to(`user:${data.toUserId}`).emit("call:answer", { fromUserId: userId, ...data });
    });
    socket.on("call:ice-candidate", (data) => {
      io.to(`user:${data.toUserId}`).emit("call:ice-candidate", {
        fromUserId: userId,
        ...data,
      });
    });
    socket.on("call:reject", (data) => {
      io.to(`user:${data.toUserId}`).emit("call:reject", { fromUserId: userId, ...data });
    });
    socket.on("call:end", (data) => {
      io.to(`user:${data.toUserId}`).emit("call:end", { fromUserId: userId, ...data });
    });
    // Group call: broadcast cho cả conversation
    socket.on("call:offer:group", (data) => {
      socket.to(`conversation:${data.conversationId}`).emit("call:offer:group", {
        fromUserId: userId,
        ...data,
      });
    });
    socket.on("call:answer:group", (data) => {
      socket.to(`conversation:${data.conversationId}`).emit("call:answer:group", {
        fromUserId: userId,
        ...data,
      });
    });
    socket.on("call:ice:group", (data) => {
      socket.to(`conversation:${data.conversationId}`).emit("call:ice:group", {
        fromUserId: userId,
        ...data,
      });
    });

    // ===== Disconnect =====
    socket.on("disconnect", async () => {
      const set = userSockets.get(userId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          userSockets.delete(userId);
          // Lưu lastSeen + broadcast offline
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
          }).catch(() => {});
          io.emit("user:offline", { userId, lastSeen: new Date() });
        }
      }
      console.log(`🔴 Socket disconnected: ${userId}`);
    });
  });

  return io;
};

// ===== Helpers =====
export const getIO = () => {
  if (!io) throw new Error("Socket.IO chưa được khởi tạo");
  return io;
};

export const emitToUser = (userId, event, data) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

export const emitToConversation = (conversationId, event, data) => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit(event, data);
};

const parseCookieToken = (rawCookie) => {
  if (!rawCookie) return null;
  try {
    const parsed = cookie.parse(rawCookie);
    // refreshToken là httpOnly — FE không thể gửi → cần truyền accessToken trong auth
    return parsed.accessToken || null;
  } catch {
    return null;
  }
};
