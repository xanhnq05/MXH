import { Router } from "express";
import { notificationController } from "../controllers/notification.controller.js";
import { protectedRoute } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(protectedRoute);

router.get("/", notificationController.list);
router.get("/unread-count", notificationController.unreadCount);
router.patch("/:id/read", notificationController.markRead);
router.patch("/read-all", notificationController.markAllRead);

export default router;
