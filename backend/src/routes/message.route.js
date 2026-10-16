import { Router } from "express";
import { messageController } from "../controllers/message.controller.js";
import { protectedRoute } from "../middlewares/auth.middleware.js";
import { uploadMiddleware } from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { sendMessageSchema, markReadSchema } from "../validators/chat.validator.js";

const router = Router();
router.use(protectedRoute);

// Messages của 1 conversation
router.get("/:conversationId/messages", messageController.list);
router.post(
  "/:conversationId/messages",
  validate(sendMessageSchema),
  messageController.send
);

/**
 * Upload file/ảnh/voice chỉ để lấy URL/key/size.
 * KHÔNG tạo message — tránh double-upload và double-message.
 * Client phải emit `message:send` qua socket sau khi upload xong.
 */
router.post(
  "/:conversationId/upload",
  uploadMiddleware.single("file"),
  messageController.upload
);

/**
 * Legacy: upload + tạo message trong 1 bước (đã deprecated).
 * Endpoint cũ `/messages/upload` vẫn hoạt động để tương thích ngược.
 * @deprecated Dùng `/upload` rồi `socket.emit("message:send")`.
 */
router.post(
  "/:conversationId/messages/upload",
  uploadMiddleware.single("file"),
  messageController.uploadAndSend
);

router.post(
  "/:conversationId/read",
  validate(markReadSchema),
  messageController.markRead
);

router.delete("/messages/:id", messageController.remove);

export default router;
