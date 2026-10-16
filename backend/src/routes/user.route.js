import { Router } from "express";
import { userController } from "../controllers/user.controller.js";
import { protectedRoute } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { uploadMiddleware } from "../middlewares/upload.middleware.js";
import {
  updateProfileSchema,
  updatePreferencesSchema,
  setE2EEKeysSchema,
  searchUserSchema,
} from "../validators/user.validator.js";

const router = Router();

router.use(protectedRoute);

router.get("/me", userController.getMe);
router.patch("/me", validate(updateProfileSchema), userController.updateProfile);
router.patch(
  "/me/preferences",
  validate(updatePreferencesSchema),
  userController.updatePreferences
);
router.post(
  "/me/avatar",
  uploadMiddleware.single("file"),
  userController.uploadAvatar
);
router.post(
  "/me/cover",
  uploadMiddleware.single("file"),
  userController.uploadCover
);
router.post("/me/e2ee-keys", validate(setE2EEKeysSchema), userController.setE2EEKeys);
router.delete("/me", userController.deleteAccount);

router.get("/search", validate(searchUserSchema, "query"), userController.search);
router.get("/:id", userController.getById);

export default router;
