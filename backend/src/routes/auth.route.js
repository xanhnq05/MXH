import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { authLimiter } from "../middlewares/rateLimit.middleware.js";
import { protectedRoute } from "../middlewares/auth.middleware.js";
import {
  sendOtpSchema,
  verifyOtpSchema,
  signUpStep1Schema,
  signUpStep3Schema,
  signUpSchema,
  signInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "../validators/auth.validator.js";

const router = Router();

// OTP
router.post("/send-otp", authLimiter, validate(sendOtpSchema), authController.sendOtp);
router.post("/verify-otp", authLimiter, validate(verifyOtpSchema), authController.verifyOtp);

// Auth - Multi-step signup
router.post(
  "/signup/start",
  authLimiter,
  validate(signUpStep1Schema),
  authController.signUpStart
);
router.post(
  "/signup/complete",
  authLimiter,
  validate(signUpStep3Schema),
  authController.signUpComplete
);

// API cũ giữ tương thích
router.post("/signup", authLimiter, validate(signUpSchema), authController.signUp);

// Sign in / out / refresh
router.post("/signin", authLimiter, validate(signInSchema), authController.signIn);
router.post("/refresh", authController.refresh);
router.post("/signout", protectedRoute, authController.signOut);

// Password
router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);
router.post(
  "/change-password",
  protectedRoute,
  validate(changePasswordSchema),
  authController.changePassword
);

export default router;
