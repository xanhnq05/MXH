// S3-compatible client cho Supabase Storage.
// Dùng AWS SDK v3 + Access Key/Secret thay vì JWT Service Role key
// (Supabase mới không còn cấp JWT service_role dạng eyJ... nữa).

import { S3Client } from "@aws-sdk/client-s3";
import { env } from "./env.config.js";

if (
  !env.SUPABASE_S3_ENDPOINT ||
  !env.SUPABASE_S3_ACCESS_KEY_ID ||
  !env.SUPABASE_S3_SECRET_ACCESS_KEY
) {
  console.warn(
    "⚠️ Supabase S3 chưa được cấu hình đầy đủ. Upload sẽ không hoạt động."
  );
}

export const BUCKET = env.SUPABASE_BUCKET || "GreenX";

export const s3 = new S3Client({
  region: env.SUPABASE_S3_REGION || "ap-southeast-1",
  endpoint: env.SUPABASE_S3_ENDPOINT,
  forcePathStyle: true, // Bắt buộc cho Supabase S3
  credentials: {
    accessKeyId: env.SUPABASE_S3_ACCESS_KEY_ID,
    secretAccessKey: env.SUPABASE_S3_SECRET_ACCESS_KEY,
  },
});

/**
 * Build public URL cho file vừa upload.
 * Supabase public bucket: <publicUrl>/<bucket>/<key>
 */
export function buildPublicUrl(key) {
  if (!env.SUPABASE_PUBLIC_URL) return null;
  return `${env.SUPABASE_PUBLIC_URL}/${BUCKET}/${key}`;
}
