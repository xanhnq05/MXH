// E2E test cho Admin Media endpoints
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

const ADMIN_EMAIL = "admin-test@example.com";
const NORMAL_EMAIL = "user-test@example.com";

let adminUser;
let normalUser;

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

const signin = async (user) => {
  const res = await request(app)
    .post("/api/auth/signin")
    .send({ username: user.username, password: "password123" });
  return res.body.accessToken;
};

beforeAll(async () => {
  await setupTestDB();
  app = buildApp();
  // Set admin env var (in-memory) for this test run
  process.env.ADMIN_EMAILS = ADMIN_EMAIL;
});

afterAll(async () => {
  await closeTestDB();
  delete process.env.ADMIN_EMAILS;
});

beforeEach(async () => {
  await clearTestDB();
  jest.clearAllMocks();
  const adminHash = await bcrypt.hash("password123", 4);
  adminUser = await User.create({
    username: "adminuser",
    email: ADMIN_EMAIL,
    displayName: "Admin",
    hashedPassword: adminHash,
  });
  normalUser = await seedUser({ email: NORMAL_EMAIL });
});

describe("Admin Media E2E", () => {
  describe("Auth checks", () => {
    it("401 khi chưa đăng nhập", async () => {
      const res = await request(app).get("/api/admin/media");
      expect(res.status).toBe(401);
    });

    it("403 khi user không phải admin", async () => {
      const token = await signin(normalUser);
      const res = await request(app)
        .get("/api/admin/media")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it("200 khi admin hợp lệ", async () => {
      const token = await signin(adminUser);
      const res = await request(app)
        .get("/api/admin/media")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
    });
  });

  describe("CRUD flow", () => {
    it("upload + list + update + soft delete asset", async () => {
      const token = await signin(adminUser);
      const fakeJpeg = Buffer.from("fake-jpeg-bytes-for-test");

      const create = await request(app)
        .post("/api/admin/media")
        .set("Authorization", `Bearer ${token}`)
        .field("meta", JSON.stringify({ name: "Test GIF", mediaType: "gif" }))
        .attach("file", fakeJpeg, { filename: "test.gif", contentType: "image/gif" });

      expect(create.status).toBe(201);
      const id = create.body.asset._id;
      expect(create.body.asset.url).toMatch(/^https:\/\/test\.supabase\.co/);
      expect(create.body.asset.isActive).toBe(true);

      // List
      const list = await request(app)
        .get("/api/admin/media")
        .set("Authorization", `Bearer ${token}`);
      expect(list.status).toBe(200);
      expect(list.body.items.length).toBe(1);
      expect(list.body.total).toBe(1);

      // Update metadata
      const upd = await request(app)
        .patch(`/api/admin/media/${id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ tags: ["vui", "happy"], priority: 10 });
      expect(upd.status).toBe(200);
      expect(upd.body.asset.tags).toEqual(["vui", "happy"]);
      expect(upd.body.asset.priority).toBe(10);

      // Toggle off
      const off = await request(app)
        .patch(`/api/admin/media/${id}/active`)
        .set("Authorization", `Bearer ${token}`)
        .send({ isActive: false });
      expect(off.status).toBe(200);
      expect(off.body.asset.isActive).toBe(false);

      // Soft delete
      const del = await request(app)
        .delete(`/api/admin/media/${id}`)
        .set("Authorization", `Bearer ${token}`);
      expect(del.status).toBe(200);
    });
  });

  describe("Permission scope (normal user)", () => {
    it("normal user không thể tạo asset", async () => {
      const token = await signin(normalUser);
      const fakeJpeg = Buffer.from("fake");
      const res = await request(app)
        .post("/api/admin/media")
        .set("Authorization", `Bearer ${token}`)
        .field("name", "Hack")
        .attach("file", fakeJpeg, { filename: "test.jpg", contentType: "image/jpeg" });
      expect(res.status).toBe(403);
    });
  });
});
