// Load và validate biến môi trường bắt buộc
// Throw error sớm nếu thiếu, giúp phát hiện sai cấu hình ngay khi khởi động.

import "dotenv/config";

const required = [
  "MONGODB_URI",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "CLIENT_URL",
];

const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("❌ Thiếu biến môi trường bắt buộc:", missing.join(", "));
  process.exit(1);
}

export const env = {
  PORT: Number(process.env.PORT) || 5001,
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_URL: process.env.CLIENT_URL,
  MONGODB_URI: process.env.MONGODB_URI,
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL || "15m",
  REFRESH_TOKEN_TTL_MS: msFromString(process.env.REFRESH_TOKEN_TTL || "7d"),

  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  SUPABASE_BUCKET: process.env.SUPABASE_BUCKET || "GreenX",

  // Gmail
  GMAIL_USER: process.env.GMAIL_USER,
  GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
  GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN,

  // E2EE
  E2EE_SERVER_KEY: process.env.E2EE_SERVER_KEY,

  // Admin allowlist (CSV)
  ADMIN_EMAILS: process.env.ADMIN_EMAILS,
  ADMIN_USER_IDS: process.env.ADMIN_USER_IDS,
};

function msFromString(s) {
  const num = parseInt(s, 10);
  if (s.endsWith("d")) return num * 24 * 60 * 60 * 1000;
  if (s.endsWith("h")) return num * 60 * 60 * 1000;
  if (s.endsWith("m")) return num * 60 * 1000;
  if (s.endsWith("s")) return num * 1000;
  return num;
}
