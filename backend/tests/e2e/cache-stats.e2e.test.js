// E2E test cho Phase 3 — Cache multi-tier + metrics.
// Kiem tra:
// - Conversation cache: trang dau hit, invalidate khi send message
// - Sticker cache: hit/miss ratio
// - Cache metrics endpoint (admin) tra ve hits/misses
// - Cache TTL hoat dong

import { jest } from "@jest/globals";
import request from "supertest";
import bcrypt from "bcrypt";
import {
  buildApp,
  setupTestDB,
  clearTestDB,
  closeTestDB,
} from "../setupE2E.js";
import User from "../../src/models/User.js";
import Conversation from "../../src/models/Conversation.js";
import Message from "../../src/models/Message.js";
import StickerPack from "../../src/models/StickerPack.js";
import cache from "../../src/libs/cache.js";

let app;
let user;
let token;
let adminToken;
let adminUser;

const seedUser = async (overrides = {}) => {
  const hashed = await bcrypt.hash("password123", 4);
  return User.create({
    username: "u_" + Math.random().toString(36).slice(2, 8),
    email: Math.random().toString(36).slice(2, 8) + "@ex.com",
    displayName: "U",
    hashedPassword: hashed,
    ...overrides,
  });
};

const signin = async (u) => {
  const r = await request(app)
    .post("/api/auth/signin")
    .send({ username: u.username, password: "password123" });
  return r.body.accessToken;
};

beforeAll(async () => {
  await setupTestDB();
  app = buildApp();
});
afterAll(async () => {
  await closeTestDB();
});
beforeEach(async () => {
  await clearTestDB();
  cache.resetMetrics();
  user = await seedUser();
  token = await signin(user);
  // Set admin allowlist = user nay de co the goi admin route
  adminUser = await seedUser({
    username: "admin_" + Math.random().toString(36).slice(2, 6),
  });
  process.env.ADMIN_USER_IDS = adminUser._id.toString();
  adminToken = await signin(adminUser);
});

describe("Phase 3 — Cache multi-tier", () => {
  describe("Cache metrics", () => {
    test("GET /api/admin/cache/stats tra ve hits/misses (admin only)", async () => {
      // User thuong KHONG duoc truy cap
      const r1 = await request(app)
        .get("/api/admin/cache/stats")
        .set("Authorization", `Bearer ${token}`);
      expect(r1.status).toBe(403);

      // Admin duoc truy cap
      const r2 = await request(app)
        .get("/api/admin/cache/stats")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(r2.status).toBe(200);
      expect(r2.body).toHaveProperty("hits");
      expect(r2.body).toHaveProperty("misses");
      expect(r2.body).toHaveProperty("hitRate");
      expect(r2.body).toHaveProperty("available");
    });
  });

  describe("Conversation list cache", () => {
    test("Trang dau: lan 1 = miss, lan 2 = hit", async () => {
      // Tao 5 conversations
      for (let i = 0; i < 5; i++) {
        const other = await seedUser({ username: "oc_" + i });
        await Conversation.create({
          members: [
            { userId: user._id, role: "member" },
            { userId: other._id, role: "member" },
          ],
          type: "direct",
        });
      }

      // Dam bao Redis client ready (co the can doi 1 chut)
      if (!cache.isAvailable()) {
        await new Promise((r) => setTimeout(r, 200));
      }

      // Lan 1 - miss
      const m0 = cache.getMetrics();
      const r1 = await request(app)
        .get("/api/conversations")
        .set("Authorization", `Bearer ${token}`);
      expect(r1.status).toBe(200);
      const m1 = cache.getMetrics();
      const missAfterFirst = m1.misses - m0.misses;
      expect(missAfterFirst).toBeGreaterThanOrEqual(1);

      // Lan 2 - hit
      const r2 = await request(app)
        .get("/api/conversations")
        .set("Authorization", `Bearer ${token}`);
      expect(r2.status).toBe(200);
      const m2 = cache.getMetrics();
      const hitsAfterSecond = m2.hits - m1.hits;
      expect(hitsAfterSecond).toBeGreaterThanOrEqual(1);
    });

    test("Send message: cache bi invalidate (incoming message thay doi lastMessageAt)", async () => {
      const other = await seedUser({ username: "msg_peer" });
      const conv = await Conversation.create({
        members: [
          { userId: user._id, role: "member" },
          { userId: other._id, role: "member" },
        ],
        type: "direct",
      });

      // Populate cache lan 1 (miss), lan 2 (hit)
      await request(app)
        .get("/api/conversations")
        .set("Authorization", `Bearer ${token}`);
      const before = cache.getMetrics();
      await request(app)
        .get("/api/conversations")
        .set("Authorization", `Bearer ${token}`);
      const hitsAfterPopulate = cache.getMetrics().hits - before.hits;
      expect(hitsAfterPopulate).toBeGreaterThanOrEqual(1);

      // Send message (can token cua other de gui vao conv)
      const otherToken = await signin(other);
      const sendRes = await request(app)
        .post(`/api/messages/${conv._id}/messages`)
        .set("Authorization", `Bearer ${otherToken}`)
        .send({ type: "text", content: "Hello" });
      expect(sendRes.status).toBe(201);

      // Lan tiep theo: phai MISS (cache da bi invalidate)
      const after = cache.getMetrics();
      await request(app)
        .get("/api/conversations")
        .set("Authorization", `Bearer ${token}`);
      const missesAfterSend = cache.getMetrics().misses - after.misses;
      expect(missesAfterSend).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Sticker cache", () => {
    test("Sticker list: hit ratio tang sau nhieu lan goi", async () => {
      await StickerPack.create([
        { key: "pack_a", name: "Pack A", order: 1, thumbnailUrl: "https://x/a.jpg" },
        { key: "pack_b", name: "Pack B", order: 2, thumbnailUrl: "https://x/b.jpg" },
      ]);

      // Lan 1 - miss
      await request(app)
        .get("/api/stickers/packs")
        .set("Authorization", `Bearer ${token}`);
      const m1 = cache.getMetrics();

      // Lan 2, 3 - hit
      await request(app)
        .get("/api/stickers/packs")
        .set("Authorization", `Bearer ${token}`);
      await request(app)
        .get("/api/stickers/packs")
        .set("Authorization", `Bearer ${token}`);

      const m2 = cache.getMetrics();
      expect(m2.hits - m1.hits).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Cache TTL", () => {
    test("Cache co TTL: gia tri tu TTL <= 0 thi set khong luu", async () => {
      // Test truc tiep cache
      if (cache.isAvailable()) {
        await cache.set("test_ttl", { foo: "bar" }, 1);
        const v1 = await cache.get("test_ttl");
        expect(v1).toEqual({ foo: "bar" });
        // Doi 1.2s
        await new Promise((r) => setTimeout(r, 1200));
        const v2 = await cache.get("test_ttl");
        expect(v2).toBeNull();
      }
    });
  });
});
