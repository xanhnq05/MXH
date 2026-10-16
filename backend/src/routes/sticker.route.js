import { Router } from "express";
import { stickerController } from "../controllers/sticker.controller.js";
import { protectedRoute } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(protectedRoute);

router.get("/packs", stickerController.listPacks);
router.get("/packs/:key", stickerController.getPack);
router.get("/search", stickerController.search);

export default router;
