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
router.post(
  "/:conversationId/messages/upload",
  uploadMiddleware.single("file"),
  messageController.upload
);
router.post(
  "/:conversationId/read",
  validate(markReadSchema),
  messageController.markRead
);

router.delete("/messages/:id", messageController.remove);

export default router;
