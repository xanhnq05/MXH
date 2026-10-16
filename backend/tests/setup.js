// Setup test env — load env, set test URI, mock mail & upload services.
process.env.NODE_ENV = "test";
process.env.PORT = "0"; // random port
process.env.MONGODB_URI =
  process.env.TEST_MONGODB_URI ||
  "mongodb+srv://xanhnguyen05_db_user:fBBdZcFpfceJ0rJ6@cluster0.iet1ejm.mongodb.net/mxh_test?appName=Cluster0";
process.env.ACCESS_TOKEN_SECRET = "test_access_secret_at_least_64_chars_long_xxxxxx_xxxxxxxxxxxx";
process.env.REFRESH_TOKEN_SECRET = "test_refresh_secret_at_least_64_chars_long_xxxxxx_xxxxxxxx";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.SUPABASE_URL = "https://placeholder.supabase.co";
process.env.SUPABASE_SECRET_KEY = "placeholder";
process.env.SUPABASE_BUCKET = "test-bucket";
process.env.GMAIL_USER = "test@gmail.com";
