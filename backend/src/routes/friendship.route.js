import { Router } from "express";
import {
  friendshipController,
  blockController,
} from "../controllers/friendship.controller.js";
import { protectedRoute } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { friendActionSchema, blockSchema } from "../validators/friendship.validator.js";

const router = Router();
router.use(protectedRoute);

// Friend requests
router.post("/request", validate(friendActionSchema), friendshipController.sendRequest);
router.post("/accept", validate(friendActionSchema), friendshipController.accept);
router.post("/reject", validate(friendActionSchema), friendshipController.reject);
router.post("/cancel", validate(friendActionSchema), friendshipController.cancel);
router.delete("/:userId", friendshipController.unfriend);

// Friend lists
router.get("/", friendshipController.list);
router.get("/requests/incoming", friendshipController.incoming);
router.get("/requests/sent", friendshipController.sent);
router.get("/suggestions", friendshipController.suggestions);

// Block
router.post("/block", validate(blockSchema), blockController.block);
router.delete("/block/:userId", blockController.unblock);
router.get("/block", blockController.list);

export default router;
