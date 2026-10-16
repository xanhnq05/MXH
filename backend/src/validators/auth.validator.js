import { z } from "zod";

// Quy tắc mật khẩu:
// - 6 đến 32 ký tự
// - Cho phép chữ cái (hoa/thường) + chữ số
// - KHÔNG cho phép ký tự đặt biệt
export const passwordSchema = z
  .string()
  .min(6, "Mật khẩu tối thiểu 6 ký tự")
  .max(32, "Mật khẩu tối đa 32 ký tự")
  .regex(/^[A-Za-z0-9]+$/, "Chỉ dùng chữ cái và chữ số, không ký tự đặt biệt");

// Email chuẩn RFC
export const emailSchema = z
  .string()
  .email("Email không hợp lệ")
  .max(120)
  .transform((v) => v.toLowerCase().trim());

// Họ tên: chỉ chữ cái + khoảng trắng, 1-60 ký tự
export const fullNameSchema = z
  .string()
  .min(1, "Vui lòng nhập họ tên")
  .max(60, "Họ tên tối đa 60 ký tự")
  .transform((v) => v.replace(/\s+/g, " ").trim())
  .refine((v) => /^[\p{L}\s'.-]+$/u.test(v), {
    message: "Họ tên chỉ gồm chữ cái và khoảng trắng",
  });

// Ngày sinh: hợp lệ, >= 13 tuổi, <= 120 tuổi
export const birthdaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày không hợp lệ")
  .transform((v) => {
    const d = new Date(v);
    return d;
  })
  .refine((d) => !isNaN(d.getTime()), { message: "Ngày sinh không hợp lệ" })
  .refine(
    (d) => {
      const now = new Date();
      const age = (now - d) / (1000 * 60 * 60 * 24 * 365.25);
      return age >= 13;
    },
    { message: "Bạn phải ít nhất 13 tuổi" }
  )
  .refine(
    (d) => {
      const now = new Date();
      const age = (now - d) / (1000 * 60 * 60 * 24 * 365.25);
      return age <= 120;
    },
    { message: "Ngày sinh không hợp lệ" }
  );

// Số điện thoại: optional, 8-15 chữ số, có thể có +
export const phoneSchema = z
  .string()
  .max(20)
  .transform((v) => (v ? v.trim() : ""))
  .refine(
    (v) => v === "" || /^\+?\d{8,15}$/.test(v),
    { message: "Số điện thoại không hợp lệ" }
  );

// Tên đăng nhập tự sinh từ email, lowercase + số
export const usernameSchema = z
  .string()
  .min(3, "Username tối thiểu 3 ký tự")
  .max(30)
  .regex(/^[a-z0-9_]+$/, "Username chỉ gồm chữ thường, số và _");

// ====== ROUTE SCHEMAS ======

export const sendOtpSchema = z.object({
  email: emailSchema,
  type: z.enum(["signup", "forgot_password", "change_email"]),
});

export const verifyOtpSchema = z.object({
  email: emailSchema,
  code: z.string().length(6, "Mã OTP gồm 6 chữ số"),
  type: z.enum(["signup", "forgot_password", "change_email"]),
});

// Bước 1: Gửi thông tin cá nhân + yêu cầu OTP
// Chỉ validate thông tin cá nhân, server sẽ sinh username từ email
export const signUpStep1Schema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  phone: z.union([phoneSchema, z.literal("")]).optional(),
});

// Bước 2: Verify OTP (đã tách thành route riêng)

// Bước 3: Tạo mật khẩu sau khi verify OTP
// Client gửi lại email + fullName + birthday + phone (đã nhập ở bước 1)
export const signUpStep3Schema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  fullName: fullNameSchema.optional(),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  phone: z.union([phoneSchema, z.literal("")]).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
});

// Schema cũ giữ lại cho tương thích (không dùng nữa)
export const signUpSchema = signUpStep3Schema;

export const signInSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
  otp: z.string().length(6),
  newPassword: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: passwordSchema,
});
