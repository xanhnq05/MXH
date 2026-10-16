// Cấu hình Gmail — hỗ trợ 2 phương thức:
// 1) App Password (đơn giản) — dùng nodemailer SMTP
// 2) OAuth2 (an toàn hơn) — dùng googleapis + refresh token
//
// File này chỉ export 1 hàm sendMail(message) — che giấu chi tiết bên dưới.
// Sẽ implement chi tiết ở services/mail.service.js.

import { google } from "googleapis";
import nodemailer from "nodemailer";
import { env } from "./env.config.js";

let transporter = null;

function buildTransporter() {
  if (transporter) return transporter;

  if (env.GMAIL_APP_PASSWORD) {
    // Phương thức 1: App Password (SMTP relay)
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: env.GMAIL_USER,
        pass: env.GMAIL_APP_PASSWORD,
      },
    });
    return transporter;
  }

  if (
    env.GMAIL_CLIENT_ID &&
    env.GMAIL_CLIENT_SECRET &&
    env.GMAIL_REFRESH_TOKEN
  ) {
    // Phương thức 2: OAuth2
    const OAuth2 = google.auth.OAuth2;
    const oauth2Client = new OAuth2(
      env.GMAIL_CLIENT_ID,
      env.GMAIL_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );
    oauth2Client.setCredentials({ refresh_token: env.GMAIL_REFRESH_TOKEN });
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: env.GMAIL_USER,
        clientId: env.GMAIL_CLIENT_ID,
        clientSecret: env.GMAIL_CLIENT_SECRET,
        refreshToken: env.GMAIL_REFRESH_TOKEN,
        accessToken: oauth2Client.getAccessToken(),
      },
    });
    return transporter;
  }

  console.warn(
    "⚠️ Gmail chưa được cấu hình (thiếu GMAIL_APP_PASSWORD hoặc OAuth2)."
  );
  return null;
}

export const mailTransporter = buildTransporter();
