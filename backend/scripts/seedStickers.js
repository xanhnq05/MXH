// scripts/seedStickers.js
// Chạy 1 lần để seed bộ sticker mẫu vào DB.
// Sau khi có file ảnh thật, thay URL trong seeds.

import mongoose from "mongoose";
import { connectDB } from "../src/libs/db.js";
import StickerPack from "../src/models/StickerPack.js";
import dotenv from "dotenv";
dotenv.config();

const seeds = [
  {
    key: "moji-fun",
    name: "Moji Fun",
    description: "Biểu cảm vui nhộn cho mọi cuộc trò chuyện",
    thumbnailUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f600.png",
    stickers: [
      { name: "Cười", url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f600.png", tags: ["cười", "happy", "vui", "laugh"] },
      { name: "Khóc", url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f62d.png", tags: ["khóc", "cry", "sad", "buồn"] },
      { name: "Yêu", url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f60d.png", tags: ["yêu", "love", "thương"] },
      { name: "Giận", url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f621.png", tags: ["giận", "angry", "mad"] },
      { name: "Wow", url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f62e.png", tags: ["wow", "ngạc nhiên", "surprised"] },
      { name: "Buồn ngủ", url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f634.png", tags: ["buồn ngủ", "sleep", "sleepy"] },
    ],
  },
  {
    key: "cats",
    name: "Mèo dễ thương",
    description: "Các biểu cảm mèo",
    thumbnailUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f431.png",
    stickers: [
      { name: "Mèo cười", url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f638.png", tags: ["mèo", "cat", "cười", "happy"] },
      { name: "Mèo khóc", url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f63f.png", tags: ["mèo", "cat", "khóc", "cry"] },
      { name: "Mèo yêu", url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f63b.png", tags: ["mèo", "cat", "yêu", "love"] },
    ],
  },
  {
    key: "reactions",
    name: "Reactions",
    description: "Phản ứng nhanh",
    thumbnailUrl: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f44d.png",
    stickers: [
      { name: "Like", url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f44d.png", tags: ["like", "thích", "ok"] },
      { name: "Dislike", url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f44e.png", tags: ["dislike", "không thích"] },
      { name: "OK", url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f44c.png", tags: ["ok", "được"] },
      { name: "Clap", url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f44f.png", tags: ["clap", "vỗ tay", "hay"] },
    ],
  },
];

const seed = async () => {
  await connectDB();
  for (const pack of seeds) {
    await StickerPack.findOneAndUpdate({ key: pack.key }, pack, {
      upsert: true,
      new: true,
    });
    console.log(`✅ Seeded pack: ${pack.key}`);
  }
  await mongoose.disconnect();
  console.log("🎉 Done");
};

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
