// Mail service — gửi email OTP, thông báo, ...
// Hỗ trợ 2 phương thức: App Password (SMTP) hoặc OAuth2 (xem configs/mail.config.js).

import { mailTransporter } from "../configs/mail.config.js";
import { env } from "../configs/env.config.js";

const BRAND = "GreenX";

const otpTemplate = (code, type) => {
  const subjectMap = {
    signup: `[${BRAND}] Mã xác thực đăng ký tài khoản`,
    forgot_password: `[${BRAND}] Mã đặt lại mật khẩu`,
    change_email: `[${BRAND}] Mã xác thực đổi email`,
  };
  const introMap = {
    signup: "Chào mừng bạn đến với MXH! Vui lòng dùng mã sau để hoàn tất đăng ký:",
    forgot_password:
      "Bạn vừa yêu cầu đặt lại mật khẩu. Dùng mã sau để tiếp tục:",
    change_email: "Bạn vừa yêu cầu đổi email. Dùng mã sau để xác nhận:",
  };
  return {
    subject: subjectMap[type] || `[${BRAND}] Mã xác thực`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px">
        <h2 style="color:#0f172a;margin:0 0 12px">${BRAND}</h2>
        <p style="color:#334155;line-height:1.6">${introMap[type] || ""}</p>
        <div style="background:#0f172a;color:#fff;font-size:32px;font-weight:700;letter-spacing:8px;padding:18px;text-align:center;border-radius:8px;margin:20px 0">
          ${code}
        </div>
        <p style="color:#64748b;font-size:13px">Mã có hiệu lực trong <b>5 phút</b>. Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
      </div>
    `,
  };
};

export const mailService = {
  /** Gửi OTP. `type` ∈ {signup, forgot_password, change_email} */
  async sendOtp({ to, code, type }) {
    if (!mailTransporter) {
      throw new Error(
        "Mail chưa được cấu hình (thiếu GMAIL_APP_PASSWORD hoặc OAuth2)."
      );
    }
    const { subject, html } = otpTemplate(code, type);
    const info = await mailTransporter.sendMail({
      from: `"${BRAND}" <${env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    return info;
  },

  async sendGeneric({ to, subject, html }) {
    if (!mailTransporter) {
      console.warn("Mail chưa cấu hình — bỏ qua gửi mail tới", to);
      return null;
    }
    return mailTransporter.sendMail({
      from: `"${BRAND}" <${env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
  },
};
