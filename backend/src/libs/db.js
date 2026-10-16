import mongoose from "mongoose";
import dns from "node:dns/promises";
import { env } from "../configs/env.config.js";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

export const connectDB = async () => {
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log("✅ Liên kết MongoDB thành công");
  } catch (error) {
    console.error("❌ Lỗi kết nối MongoDB:", error.message);
    process.exit(1);
  }
};
