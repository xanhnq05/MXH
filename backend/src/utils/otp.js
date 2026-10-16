// Helper sinh & hash OTP.
// OTP gồm 6 số, hash bằng SHA-256 trước khi lưu DB (để không lộ plaintext).

import crypto from "crypto";

export const generateOtpCode = () => {
  // 6 chữ số, 000000 - 999999
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
};

export const hashOtp = (code) => {
  return crypto.createHash("sha256").update(code).digest("hex");
};

export const verifyOtpHash = (code, hash) => {
  return hashOtp(code) === hash;
};
