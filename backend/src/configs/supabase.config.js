// Cấu hình Supabase client để upload file lên S3-compatible storage.
// Bucket mặc định: GreenX (theo .env).

import { createClient } from "@supabase/supabase-js";
import { env } from "./env.config.js";

if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
  console.warn("⚠️ Supabase chưa được cấu hình. Upload sẽ không hoạt động.");
}

export const supabase = createClient(
  env.SUPABASE_URL || "https://placeholder.supabase.co",
  env.SUPABASE_SECRET_KEY || "placeholder",
  {
    auth: { persistSession: false },
  }
);

export const BUCKET = env.SUPABASE_BUCKET;
