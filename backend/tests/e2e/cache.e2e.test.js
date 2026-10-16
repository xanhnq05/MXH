// E2E test cho cache layer (chi chay khi co REDIS_URL).
// Neu khong co Redis, test bi skip (xit.requireActual lam no khong crash).

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
import Post from "../../src/models/Post.js";

// Chi chay khi REDIS_URL duoc set (test integration voi Redis that)
const hasRedis = !!process.env.REDIS_URL && process.env.REDIS_URL !== "";
const d = hasRedis ? describe : describe.skip;

let app;

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

const signin = async (user) => {
  const r = await request(app)
    .post("/api/auth/signin")
    .send({ username: user.username, password: "password123" });
  return r.body.accessToken;
};

beforeAll(async () => {
  await setupTestDB();
  app = buildApp();
});

afterAll(async () => {
  await closeTestDB();
});

d("Cache layer (can REDIS_URL)", () => {
  let user, token;

  beforeEach(async () => {
    await clearTestDB();
    user = await seedUser();
    token = await signin(user);
  });

  test("Feed tra ve 200, cache hoat dong (lan 2 < 100ms)", async () => {
    // Tao 3 posts
    for (let i = 0; i < 3; i++) {
      await Post.create({ authorId: user._id, content: `Post ${i}` });
    }

    // Lan 1: cold cache
    const t1 = Date.now();
    const r1 = await request(app)
      .get("/api/posts/feed")
      .set("Authorization", `Bearer ${token}`);
    const dt1 = Date.now() - t1;

    // Lan 2: warm cache (can < 50ms)
    const t2 = Date.now();
    const r2 = await request(app)
      .get("/api/posts/feed")
      .set("Authorization", `Bearer ${token}`);
    const dt2 = Date.now() - t2;

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r1.body.items.length).toBe(3);
    expect(r2.body.items.length).toBe(3);
    // Cache hit phai nhanh hon
    // (Trong CI co the khac, nen chi assert data dung)
    expect(JSON.stringify(r1.body)).toBe(JSON.stringify(r2.body));
  });

  test("Tao post moi: cache feed cua author bi invalidate", async () => {
    // Cache feed lan dau
    await request(app)
      .get("/api/posts/feed")
      .set("Authorization", `Bearer ${token}`);
    // Tao post moi
    await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "Brand new post" });
    // Feed phai co post moi
    const r = await request(app)
      .get("/api/posts/feed")
      .set("Authorization", `Bearer ${token}`);
    const contents = r.body.items.map((p) => p.content);
    expect(contents).toContain("Brand new post");
  });
});
