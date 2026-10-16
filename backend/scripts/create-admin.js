// scripts/create-admin.js
// Tao user admin voi email/password da biet (hash bang bcrypt nhu backend)
//
// Usage (trong container backend):
//   node scripts/create-admin.js <email> <password> [fullName]
//
// Vi du:
//   node scripts/create-admin.js admin@greenx.vn Admin@123 "Quan tri vien"

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env tu thu muc backend
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const User = (await import("../src/models/User.js")).default;
const { env } = await import("../src/configs/env.config.js");

const email = (process.argv[2] || "").toLowerCase().trim();
const password = process.argv[3] || "";
const fullName = process.argv[4] || "Quản trị viên";

if (!email || !password) {
  console.error("❌ Cú pháp: node scripts/create-admin.js <email> <password> [fullName]");
  process.exit(1);
}

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  console.log("✅ Đã kết nối MongoDB");

  const exist = await User.findOne({ email });
  if (exist) {
    console.log(`⚠️  Email "${email}" đã tồn tại. Đang cập nhật role + password...`);
    const hashedPassword = await bcrypt.hash(password, 10);
    exist.hashedPassword = hashedPassword;
    exist.isBanned = false;
    exist.isDeleted = false;
    exist.deletedAt = null;
    exist.fullName = fullName;
    exist.displayName = fullName;
    await exist.save();
    console.log("✅ Cập nhật user thành công");
    console.log(`   _id     : ${exist._id}`);
    console.log(`   email   : ${exist.email}`);
    console.log(`   fullName: ${exist.fullName}`);
    await mongoose.disconnect();
    return;
  }

  // Tao username tu email
  const base =
    email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 20) || "admin";
  const username = `${base}_${Math.random().toString(16).slice(2, 6)}`;

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    username,
    email,
    hashedPassword,
    fullName,
    displayName: fullName,
  });

  console.log("✅ Tạo user admin thành công!");
  console.log(`   _id       : ${user._id}`);
  console.log(`   username  : ${user.username}`);
  console.log(`   email     : ${user.email}`);
  console.log(`   fullName  : ${user.fullName}`);
  console.log(`   password  : ${password} (đã hash bcrypt 10 rounds)`);
  console.log();
  console.log("👉 Giờ có thể đăng nhập admin tại: http://localhost:3001");
  console.log("   (Email này đã có trong ADMIN_EMAILS env, sẽ được cấp quyền admin)");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ Lỗi:", err.message);
  process.exit(1);
});
