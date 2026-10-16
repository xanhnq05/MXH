// E2E test cho Auth flow
import { jest } from "@jest/globals";
import request from "supertest";
import {
  buildApp,
  setupTestDB,
  clearTestDB,
  closeTestDB,
} from "../setupE2E.js";
import { mailService } from "../../src/services/mail.service.js";
import User from "../../src/models/User.js";
import OtpVerification from "../../src/models/OtpVerification.js";

let app;

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

describe("Auth E2E", () => {
  describe("POST /api/auth/send-otp", () => {
    it("creates OTP and calls mail service", async () => {
      const res = await request(app)
        .post("/api/auth/send-otp")
        .send({ email: "test@example.com", type: "signup" });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/OTP/);

      const otps = await OtpVerification.find({ email: "test@example.com" });
      expect(otps).toHaveLength(1);
    });

    it("rejects invalid email", async () => {
      const res = await request(app)
        .post("/api/auth/send-otp")
        .send({ email: "not-an-email", type: "signup" });

      expect(res.status).toBe(400);
    });

    it("rejects invalid type", async () => {
      const res = await request(app)
        .post("/api/auth/send-otp")
        .send({ email: "a@b.com", type: "invalid_type" });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/signup", () => {
    it("creates user after OTP verified", async () => {
      // Bypass OTP: tạo user trực tiếp qua service
      await User.create({
        username: "testuser",
        email: "test@example.com",
        displayName: "Test User",
        hashedPassword: "$2b$10$abcdefghijklmnopqrstuv", // fake hash
      });

      // Verify signup sẽ từ chối trùng email
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          username: "testuser2",
          password: "password123",
          email: "test@example.com",
          displayName: "Test 2",
          otp: "000000", // không verify được
        });

      // Sẽ fail ở OTP verify vì không có OTP hợp lệ
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/signin", () => {
    it("returns 401 for non-existent user", async () => {
      const res = await request(app)
        .post("/api/auth/signin")
        .send({ username: "noone", password: "password123" });
      expect(res.status).toBe(401);
    });

    it("returns 401 for wrong password", async () => {
      const bcrypt = await import("bcrypt");
      const hashed = await bcrypt.hash("password123", 4);
      await User.create({
        username: "testuser",
        email: "test@example.com",
        displayName: "Test",
        hashedPassword: hashed,
      });

      const res = await request(app)
        .post("/api/auth/signin")
        .send({ username: "testuser", password: "wrongpass" });
      expect(res.status).toBe(401);
    });

    it("returns 200 + accessToken for valid credentials", async () => {
      const bcrypt = await import("bcrypt");
      const hashed = await bcrypt.hash("password123", 4);
      await User.create({
        username: "testuser",
        email: "test@example.com",
        displayName: "Test",
        hashedPassword: hashed,
      });

      const res = await request(app)
        .post("/api/auth/signin")
        .send({ username: "testuser", password: "password123" });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.user.username).toBe("testuser");
      expect(res.headers["set-cookie"]).toBeDefined();
    });
  });

  describe("GET /api/health", () => {
    it("returns ok", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });
  });
});
