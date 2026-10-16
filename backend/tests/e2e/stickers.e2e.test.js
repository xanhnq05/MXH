// E2E test cho Sticker + GIF
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

let app;

const seedUser = async (overrides = {}) => {
  const hashed = await bcrypt.hash("password123", 4);
  return User.create({
    username: "user_" + Math.random().toString(36).slice(2, 8),
    email: Math.random().toString(36).slice(2, 8) + "@example.com",
    displayName: "User",
    hashedPassword: hashed,
    ...overrides,
  });
};

const signinAndGetToken = async (app, user) => {
  const res = await request(app)
    .post("/api/auth/signin")
    .send({ username: user.username, password: "password123" });
  return res.body.accessToken;
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
  jest.clearAllMocks();
});

describe("Sticker E2E", () => {
  it("returns empty list initially (no seed)", async () => {
    const user = await seedUser({ username: "alice", email: "alice@example.com" });
    const token = await signinAndGetToken(app, user);

    const res = await request(app)
      .get("/api/stickers/packs")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.packs).toEqual([]);
  });

  it("rejects unauthenticated", async () => {
    const res = await request(app).get("/api/stickers/packs");
    expect(res.status).toBe(401);
  });
});

describe("GIF E2E", () => {
  it("returns trending data", async () => {
    const user = await seedUser({ username: "alice", email: "alice@example.com" });
    const token = await signinAndGetToken(app, user);

    const res = await request(app)
      .get("/api/gifs/trending")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.categories).toBeDefined();
    expect(res.body.categories.length).toBeGreaterThan(0);
  });

  it("searches by keyword", async () => {
    const user = await seedUser({ username: "alice", email: "alice@example.com" });
    const token = await signinAndGetToken(app, user);

    const res = await request(app)
      .get("/api/gifs/search?q=happy")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.gifs)).toBe(true);
  });

  it("returns empty for empty query", async () => {
    const user = await seedUser({ username: "alice", email: "alice@example.com" });
    const token = await signinAndGetToken(app, user);

    const res = await request(app)
      .get("/api/gifs/search")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.gifs).toEqual([]);
  });
});
