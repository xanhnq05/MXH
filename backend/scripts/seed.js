// scripts/seed.js — Tạo dữ liệu mẫu để test nhanh
// Chạy: node scripts/seed.js
//
// Tạo 3 user:
//   - alice  (password: password123) - đã bật E2EE
//   - bob    (password: password123)
//   - carol  (password: password123) - đã là friend với alice
//
// Tạo 1 direct conversation alice <-> bob với vài tin nhắn
// Tạo 1 group chat "Team GreenX" với cả 3 thành viên

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

import User from "../src/models/User.js";
import OtpVerification from "../src/models/OtpVerification.js";
import Conversation from "../src/models/Conversation.js";
import Message from "../src/models/Message.js";
import Friendship from "../src/models/Friendship.js";

const MONGO_URI = process.env.MONGODB_URI;
const LOCAL_FALLBACK = "mongodb://127.0.0.1:27017/mxh";

const sampleUsers = [
  {
    username: "alice",
    email: "alice@greenx.test",
    fullName: "Nguyễn Thị Alice",
    birthday: "1995-04-12",
    phone: "+84987654321",
    bio: "Frontend dev. Yêu React & Tailwind 🌿",
    password: "password123",
    enableE2EE: true,
  },
  {
    username: "bob",
    email: "bob@greenx.test",
    fullName: "Trần Văn Bob",
    birthday: "1993-08-22",
    phone: "+84123456789",
    bio: "Backend. Node.js, MongoDB, Socket.IO 🚀",
    password: "password123",
    enableE2EE: false,
  },
  {
    username: "carol",
    email: "carol@greenx.test",
    fullName: "Lê Thị Carol",
    birthday: "1997-12-05",
    phone: "",
    bio: "Designer + Mobile 📱",
    password: "password123",
    enableE2EE: true,
  },
];

const E2EE_JWK_ALICE = {
  kty: "EC",
  crv: "P-256",
  x: "Wq7g4Ah-B7E5C9fW0r1oYQ8k_bN6zJ8fM5X2sZj3U_k",
  y: "8oKp9b5Xh1Vn_cT3sZj7Lq9mYe2wF1Z4xJ6k8dF0_aE",
};

const E2EE_JWK_CAROL = {
  kty: "EC",
  crv: "P-256",
  x: "Kv8h3Bd5-Q9sT0mX2jZ1lY7oB5cN3wQ4pK8hI0aF2_c",
  y: "8oKp9b5Xh1Vn_cT3sZj7Lq9mYe2wF1Z4xJ6k8dF0_bF",
};

async function clearAll() {
  await Promise.all([
    User.deleteMany({}),
    OtpVerification.deleteMany({}),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
    Friendship.deleteMany({}),
  ]);
  console.log("✓ Cleared all collections");
}

async function createUsers() {
  const created = [];
  for (const u of sampleUsers) {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    const user = await User.create({
      username: u.username,
      email: u.email,
      fullName: u.fullName,
      birthday: new Date(u.birthday),
      phone: u.phone || "",
      displayName: u.fullName,
      bio: u.bio,
      hashedPassword,
      isEmailVerified: true,
      theme: "system",
      soundEnabled: true,
      soundTheme: "default",
    });
    if (u.enableE2EE) {
      const jwk = u.username === "alice" ? E2EE_JWK_ALICE : E2EE_JWK_CAROL;
      user.e2eeEcdhPublicKey = JSON.stringify(jwk);
      await user.save();
    }
    created.push(user);
    console.log(`✓ User: ${user.username} (${user._id})  pw: ${u.password}${u.enableE2EE ? "  [E2EE]" : ""}`);
  }
  return created;
}

async function createFriendship(alice, bob) {
  // Bob accept Alice
  const fr = await Friendship.create({
    requester: alice._id,
    recipient: bob._id,
    status: "accepted",
  });
  console.log(`✓ Friendship: alice <-> bob`);
  return fr;
}

async function createDirectConversation(alice, bob) {
  // Đảm bảo có 1 conv direct giữa 2 người
  const conv = await Conversation.create({
    type: "direct",
    members: [
      { userId: alice._id, role: "member", joinedAt: new Date() },
      { userId: bob._id, role: "member", joinedAt: new Date() },
    ],
    lastMessageAt: new Date(),
  });

  const msgs = [
    { sender: alice._id, type: "text", content: "Chào Bob! Bạn có khỏe không?" },
    { sender: bob._id, type: "text", content: "Chào Alice! Mình khỏe, cảm ơn bạn 😊" },
    { sender: alice._id, type: "text", content: "Cuối tuần này mình định họp team, bạn rảnh không?" },
    { sender: bob._id, type: "text", content: "Được luôn! Mấy giờ nhỉ?" },
  ];

  for (const m of msgs) {
    await Message.create({
      conversationId: conv._id,
      senderId: m.sender,
      type: m.type,
      content: m.content,
    });
  }

  conv.lastMessageAt = new Date();
  conv.lastMessage = (await Message.findOne({ conversationId: conv._id }).sort({ createdAt: -1 }))._id;
  await conv.save();

  console.log(`✓ Direct conversation alice<->bob với ${msgs.length} tin nhắn`);
  return conv;
}

async function createGroupConversation(alice, bob, carol) {
  const conv = await Conversation.create({
    type: "group",
    name: "Team GreenX",
    members: [
      { userId: alice._id, role: "owner", joinedAt: new Date() },
      { userId: bob._id, role: "admin", joinedAt: new Date() },
      { userId: carol._id, role: "member", joinedAt: new Date() },
    ],
    lastMessageAt: new Date(),
  });

  const msgs = [
    { sender: alice._id, type: "system", content: "Alice đã tạo nhóm" },
    { sender: alice._id, type: "text", content: "Welcome cả nhóm! 🎉" },
    { sender: carol._id, type: "text", content: "Hi mọi người, mình là Carol - designer 👋" },
    { sender: bob._id, type: "text", content: "Hey Carol! Rất vui được hợp tác" },
    { sender: alice._id, type: "text", content: "Mình sẽ share design system trong nhóm nha" },
  ];

  for (const m of msgs) {
    await Message.create({
      conversationId: conv._id,
      senderId: m.sender,
      type: m.type,
      content: m.content,
    });
  }

  conv.lastMessageAt = new Date();
  conv.lastMessage = (await Message.findOne({ conversationId: conv._id }).sort({ createdAt: -1 }))._id;
  await conv.save();

  console.log(`✓ Group "Team GreenX" với ${msgs.length} tin nhắn`);
  return conv;
}

async function createPosts(alice, bob, carol) {
  const Post = (await import("../src/models/Post.js")).default;
  await Post.deleteMany({});
  await Post.create([
    {
      author: alice._id,
      content: "Vừa release MXH v1! Cảm ơn team đã cùng đồng hành 🚀",
      images: [],
      privacy: "public",
      likes: [bob._id, carol._id],
    },
    {
      author: bob._id,
      content: "Hôm nay fix được bug socket reconnect. Cảm giác nhẹ nhõm 😅",
      images: [],
      privacy: "public",
      likes: [alice._id],
    },
    {
      author: carol._id,
      content: "Chia sẻ design system mới cho MXH — minimal + dark mode 🌑✨",
      images: [],
      privacy: "public",
      likes: [alice._id, bob._id],
    },
  ]);
  console.log("✓ 3 sample posts");
}

async function createNotifications(alice, bob) {
  const Notification = (await import("../src/models/Notification.js")).default;
  await Notification.deleteMany({});
  await Notification.create([
    {
      recipient: alice._id,
      sender: bob._id,
      type: "friend_accept",
      text: "Bob đã chấp nhận lời mời kết bạn",
      isRead: false,
    },
    {
      recipient: alice._id,
      sender: carol._id,
      type: "like",
      text: "Carol đã thích bài viết của bạn",
      isRead: false,
    },
  ]);
  console.log("✓ 2 sample notifications");
}

async function main() {
  if (!MONGO_URI) {
    console.error("❌ MONGODB_URI chưa được set trong .env");
    process.exit(1);
  }

  console.log("🌱 Bắt đầu seed dữ liệu MXH...\n");

  // Thử Atlas trước, nếu fail thì fallback về local
  let connected = false;
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    connected = true;
    console.log("✓ Connected to MongoDB Atlas\n");
  } catch (err) {
    console.warn(`⚠️  Không kết nối được Atlas: ${err.message}`);
    console.log("→ Thử fallback local MongoDB...");
    try {
      await mongoose.connect(LOCAL_FALLBACK, { serverSelectionTimeoutMS: 3000 });
      connected = true;
      console.log("✓ Connected to local MongoDB (mongodb://127.0.0.1:27017/mxh)\n");
    } catch (err2) {
      console.error("❌ Cũng không connect được local MongoDB.");
      console.error("   Lỗi:", err2.message);
      console.log("\n💡 Hướng dẫn:");
      console.log("   1. Cài MongoDB local: https://www.mongodb.com/try/download/community");
      console.log("   2. Hoặc sửa MONGODB_URI trong .env thành cluster thật của bạn");
      process.exit(1);
    }
  }
  if (!connected) process.exit(1);

  await clearAll();
  console.log();

  const [alice, bob, carol] = await createUsers();
  console.log();

  await createFriendship(alice, bob);
  await createDirectConversation(alice, bob);
  await createGroupConversation(alice, bob, carol);
  await createPosts(alice, bob, carol);
  await createNotifications(alice, bob);

  console.log("\n========================================");
  console.log("✅ Seed hoàn tất!");
  console.log("========================================");
  console.log("📝 Tài khoản test (mật khẩu: password123):");
  console.log("   - alice  (alice@greenx.test) — đã bật E2EE");
  console.log("   - bob    (bob@greenx.test)");
  console.log("   - carol  (carol@greenx.test) — đã bật E2EE");
  console.log();
  console.log("🧪 Test thử:");
  console.log("   - Login alice → /chat → thấy conv với bob + group Team GreenX");
  console.log("   - Login bob → /notifications → thấy notification");
  console.log("   - 3 user làm việc với nhau, có sẵn post, friend");
  console.log("========================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
