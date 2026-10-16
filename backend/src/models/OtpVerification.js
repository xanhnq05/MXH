// OtpVerification — lưu OTP hash, expire sau 5 phút.
// type: "signup" | "forgot_password" | "change_email"
import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    codeHash: { type: String, required: true },
    type: {
      type: String,
      enum: ["signup", "forgot_password", "change_email"],
      required: true,
    },
    attempts: { type: Number, default: 0 },
    isUsed: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

otpSchema.index({ email: 1, type: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("OtpVerification", otpSchema);
