import { Router } from "express";
import { callController } from "../controllers/call.controller.js";
import { protectedRoute } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(protectedRoute);

router.post("/start", callController.start);
router.patch("/:id/end", callController.end);
router.get("/", callController.list);

export default router;
