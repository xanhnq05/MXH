// scripts/seedMediaAssets.js
// Seed 1 bộ asset mẫu vào DB (MediaAsset) để test suggestion/search.
// Chạy: node scripts/seedMediaAssets.js
// File này CHỈ tạo record DB; cần upload file thật trước (qua admin UI) để có storageKey/url.

import mongoose from "mongoose";
import { connectDB } from "../src/libs/db.js";
import MediaAsset from "../src/models/MediaAsset.js";
import "dotenv/config";

const seeds = [
  {
    mediaType: "gif",
    name: "Chúc mừng sinh nhật",
    description: "Bánh kem và pháo hoa",
    url: "https://placehold.co/200x200/FF6B35/white?text=BD",
    storageKey: "seed/birthday.gif",
    mimeType: "image/gif",
    fileSize: 102400,
    category: "celebration",
    tags: ["sinh nhật", "chúc mừng", "bánh kem"],
    keywords: ["birthday", "party", "cake"],
    synonyms: ["sn", "mừng sn", "chúc sn"],
    phrases: ["chúc mừng sinh nhật", "happy birthday"],
    language: "vi",
    sentiment: "positive",
    isActive: true,
    priority: 10,
  },
  {
    mediaType: "gif",
    name: "Cười lăn",
    description: "Cười sảng khoái",
    url: "https://placehold.co/200x200/FF9F43/white?text=HA",
    storageKey: "seed/laugh.gif",
    mimeType: "image/gif",
    fileSize: 81920,
    category: "happy",
    tags: ["vui", "cười", "lol"],
    keywords: ["happy", "laugh", "lol"],
    synonyms: ["haha", "hehe"],
    phrases: ["cười nghiêng ngả", "cười lăn"],
    language: "vi",
    sentiment: "funny",
    isActive: true,
    priority: 5,
  },
  {
    mediaType: "sticker",
    name: "Trái tim",
    description: "Sticker trái tim",
    url: "https://placehold.co/200x200/EF4444/white?text=%E2%9D%A4",
    storageKey: "seed/heart.png",
    mimeType: "image/png",
    fileSize: 16384,
    category: "love",
    tags: ["yêu", "thương", "tim"],
    keywords: ["love", "heart"],
    synonyms: ["love", "thả tim"],
    phrases: ["yêu em", "yêu nhiều"],
    language: "vi",
    sentiment: "love",
    isActive: true,
    priority: 8,
  },
  {
    mediaType: "sticker",
    name: "Buồn ngủ",
    description: "Ngáp ngủ",
    url: "https://placehold.co/200x200/6366F1/white?text=ZZ",
    storageKey: "seed/sleep.png",
    mimeType: "image/png",
    fileSize: 16384,
    category: "sleepy",
    tags: ["buồn ngủ", "ngáp", "mệt"],
    keywords: ["sleepy", "tired", "zzz"],
    synonyms: ["ngủ", "ngáp"],
    phrases: ["buồn ngủ quá", "mệt quá"],
    language: "vi",
    sentiment: "neutral",
    isActive: true,
    priority: 3,
  },
];

const seed = async () => {
  await connectDB();
  for (const s of seeds) {
    const doc = await MediaAsset.findOneAndUpdate(
      { storageKey: s.storageKey },
      s,
      { upsert: true, new: true }
    );
    console.log(`✅ Seeded: ${doc.name} (${doc._id})`);
  }
  console.log(`🎉 Done — ${seeds.length} assets`);
  await mongoose.disconnect();
};

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
