import { Router } from "express";
import { commentController } from "../controllers/post.controller.js";
import { protectedRoute } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { updateCommentSchema } from "../validators/post.validator.js";

const router = Router();
router.use(protectedRoute);

router.patch("/:id", validate(updateCommentSchema), commentController.update);
router.delete("/:id", commentController.remove);

export default router;
