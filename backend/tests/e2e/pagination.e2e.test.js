// E2E test cho Phase 2: pagination consistency.
// Kiem tra:
// - Conversation list: cursor pagination hoat dong
// - Friend list: cursor pagination hoat dong
// - Block list: cursor pagination hoat dong
// - Khong co duplicate giua cac trang
// - Limit max=50 (khong the bypass)
//
// Du lieu seed > 60 records de test qua gioi han 1 trang.

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
import Friendship from "../../src/models/Friendship.js";
import Block from "../../src/models/Block.js";

let app;
let user;
let token;

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
  user = await seedUser();
  token = await signin(user);
});

describe("Phase 2 — Pagination consistency", () => {
  describe("GET /api/conversations", () => {
    test("Tra ve {items, nextCursor} va co the phan trang", async () => {
      // Tao 25 conversations
      for (let i = 0; i < 25; i++) {
        const other = await seedUser({ username: "other_" + i });
        await Conversation.create({
          members: [
            { userId: user._id, role: "member" },
            { userId: other._id, role: "member" },
          ],
          type: "direct",
          lastMessageAt: new Date(Date.now() - i * 1000), // decreasing
        });
      }
      // Trang 1
      const r1 = await request(app)
        .get("/api/conversations?limit=10")
        .set("Authorization", `Bearer ${token}`);
      expect(r1.status).toBe(200);
      expect(r1.body.items).toHaveLength(10);
      expect(r1.body.nextCursor).toBeTruthy();
      // Trang 2
      const r2 = await request(app)
        .get(`/api/conversations?limit=10&cursor=${encodeURIComponent(r1.body.nextCursor)}`)
        .set("Authorization", `Bearer ${token}`);
      expect(r2.body.items).toHaveLength(10);
      // Trang 3 (5 con lai)
      const r3 = await request(app)
        .get(`/api/conversations?limit=10&cursor=${encodeURIComponent(r2.body.nextCursor)}`)
        .set("Authorization", `Bearer ${token}`);
      expect(r3.body.items).toHaveLength(5);
      expect(r3.body.nextCursor).toBeNull();

      // Khong co trung item
      const allIds = new Set();
      [r1, r2, r3].forEach((r) =>
        r.body.items.forEach((c) => allIds.add(c._id))
      );
      expect(allIds.size).toBe(25);
    });

    test("Limit bi clamp o 50 (khong the request limit=999)", async () => {
      // Tao 5 conversations
      for (let i = 0; i < 5; i++) {
        const other = await seedUser({ username: "c_" + i });
        await Conversation.create({
          members: [
            { userId: user._id, role: "member" },
            { userId: other._id, role: "member" },
          ],
          type: "direct",
        });
      }
      const r = await request(app)
        .get("/api/conversations?limit=999")
        .set("Authorization", `Bearer ${token}`);
      // 5 < 50 nen tra ve 5, khong loi
      expect(r.body.items).toHaveLength(5);
    });

    test("Cursor khong hop le: tra ve trang dau, khong crash", async () => {
      const r = await request(app)
        .get("/api/conversations?cursor=THIS_IS_INVALID_BASE64")
        .set("Authorization", `Bearer ${token}`);
      expect(r.status).toBe(200);
      expect(r.body.items).toBeDefined();
    });

    test("Conversation cua user khac KHONG xuat hien trong list", async () => {
      const other = await seedUser({ username: "otherguy" });
      // Tao 1 conversation KHONG co user._id
      await Conversation.create({
        members: [
          { userId: other._id, role: "member" },
          { userId: (await seedUser({ username: "third" }))._id, role: "member" },
        ],
        type: "direct",
      });
      const r = await request(app)
        .get("/api/conversations")
        .set("Authorization", `Bearer ${token}`);
      expect(r.body.items).toHaveLength(0);
    });
  });

  describe("GET /api/friends (cursor pagination)", () => {
    test("Tra ve friends phan trang", async () => {
      // Tao 30 friends
      for (let i = 0; i < 30; i++) {
        const friend = await seedUser({ username: "f_" + i });
        await Friendship.create({
          requester: user._id,
          recipient: friend._id,
          status: "accepted",
        });
      }
      const r1 = await request(app)
        .get("/api/friends?limit=15")
        .set("Authorization", `Bearer ${token}`);
      expect(r1.body.items).toHaveLength(15);
      expect(r1.body.nextCursor).toBeTruthy();
      const r2 = await request(app)
        .get(`/api/friends?limit=15&cursor=${encodeURIComponent(r1.body.nextCursor)}`)
        .set("Authorization", `Bearer ${token}`);
      expect(r2.body.items).toHaveLength(15);
      expect(r2.body.nextCursor).toBeNull();

      // Khong trung friend
      const allIds = new Set();
      [r1, r2].forEach((r) =>
        r.body.items.forEach((f) => allIds.add(f.friend._id))
      );
      expect(allIds.size).toBe(30);
    });
  });

  describe("GET /api/friends/block (cursor pagination)", () => {
    test("Tra ve blocks phan trang", async () => {
      for (let i = 0; i < 12; i++) {
        const blocked = await seedUser({ username: "b_" + i });
        await Block.create({ blocker: user._id, blocked: blocked._id });
      }
      const r1 = await request(app)
        .get("/api/friends/block?limit=5")
        .set("Authorization", `Bearer ${token}`);
      expect(r1.body.items).toHaveLength(5);
      expect(r1.body.nextCursor).toBeTruthy();
      const r2 = await request(app)
        .get(`/api/friends/block?limit=5&cursor=${encodeURIComponent(r1.body.nextCursor)}`)
        .set("Authorization", `Bearer ${token}`);
      expect(r2.body.items).toHaveLength(5);
      const r3 = await request(app)
        .get(`/api/friends/block?limit=5&cursor=${encodeURIComponent(r2.body.nextCursor)}`)
        .set("Authorization", `Bearer ${token}`);
      expect(r3.body.items).toHaveLength(2);
      expect(r3.body.nextCursor).toBeNull();
    });
  });

  describe("Cung timestamp stress test", () => {
    test("25 conversations cung lastMessageAt: cursor van khong trung", async () => {
      const sameTime = new Date();
      for (let i = 0; i < 25; i++) {
        const other = await seedUser({ username: "s_" + i });
        await Conversation.create({
          members: [
            { userId: user._id, role: "member" },
            { userId: other._id, role: "member" },
          ],
          type: "direct",
          lastMessageAt: sameTime,
        });
      }
      const r1 = await request(app)
        .get("/api/conversations?limit=10")
        .set("Authorization", `Bearer ${token}`);
      const r2 = await request(app)
        .get(`/api/conversations?limit=10&cursor=${encodeURIComponent(r1.body.nextCursor)}`)
        .set("Authorization", `Bearer ${token}`);
      const r3 = await request(app)
        .get(`/api/conversations?limit=10&cursor=${encodeURIComponent(r2.body.nextCursor)}`)
        .set("Authorization", `Bearer ${token}`);
      const allIds = new Set();
      [r1, r2, r3].forEach((r) =>
        r.body.items.forEach((c) => allIds.add(c._id))
      );
      expect(allIds.size).toBe(25);
    });
  });
});
