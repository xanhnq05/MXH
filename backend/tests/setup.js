// Setup test env — load env, set test URI, mock mail & upload services.
// SECURITY: Do NOT hardcode real credentials here. Tests must use TEST_MONGODB_URI
// env var, or fall back to an in-memory MongoDB (mongodb-memory-server).
process.env.NODE_ENV = "test";
process.env.PORT = "0"; // random port
process.env.ACCESS_TOKEN_SECRET = "test_access_secret_at_least_64_chars_long_xxxxxx_xxxxxxxxxxxx";
process.env.REFRESH_TOKEN_SECRET = "test_refresh_secret_at_least_64_chars_long_xxxxxx_xxxxxxxx";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.SUPABASE_URL = "https://placeholder.supabase.co";
process.env.SUPABASE_SECRET_KEY = "placeholder";
process.env.SUPABASE_BUCKET = "test-bucket";
process.env.GMAIL_USER = "test@gmail.com";

// MONGODB_URI se duoc setupE2E gan sau khi memory server san sang.
// Neu TEST_MONGODB_URI duoc set boi CI/dev, dung no luon.
if (process.env.TEST_MONGODB_URI) {
  process.env.MONGODB_URI = process.env.TEST_MONGODB_URI;
}
