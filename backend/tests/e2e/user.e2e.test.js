// E2E test cho User + Friend + Notification
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
    username: "tester",
    email: "tester@example.com",
    displayName: "Tester",
    hashedPassword: hashed,
    ...overrides,
  });
};

const signinAndGetToken = async (app, username = "tester") => {
  const res = await request(app)
    .post("/api/auth/signin")
    .send({ username, password: "password123" });
  return { token: res.body.accessToken, user: res.body.user, cookies: res.headers["set-cookie"] };
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

describe("User E2E", () => {
  describe("GET /api/users/me", () => {
    it("returns current user with valid token", async () => {
      await seedUser();
      const { token } = await signinAndGetToken(app);

      const res = await request(app)
        .get("/api/users/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe("tester");
    });

    it("returns 401 without token", async () => {
      const res = await request(app).get("/api/users/me");
      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /api/users/me", () => {
    it("updates displayName and bio", async () => {
      await seedUser();
      const { token } = await signinAndGetToken(app);

      const res = await request(app)
        .patch("/api/users/me")
        .set("Authorization", `Bearer ${token}`)
        .send({ displayName: "New Name", bio: "Hello world" });

      expect(res.status).toBe(200);
      expect(res.body.user.displayName).toBe("New Name");
      expect(res.body.user.bio).toBe("Hello world");
    });
  });

  describe("GET /api/users/search", () => {
    it("rejects unauthenticated", async () => {
      const res = await request(app).get("/api/users/search?q=test");
      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /api/users/me/preferences", () => {
    it("updates theme and sound", async () => {
      await seedUser();
      const { token } = await signinAndGetToken(app);

      const res = await request(app)
        .patch("/api/users/me/preferences")
        .set("Authorization", `Bearer ${token}`)
        .send({ theme: "dark", soundEnabled: false });

      expect(res.status).toBe(200);
      expect(res.body.user.theme).toBe("dark");
      expect(res.body.user.soundEnabled).toBe(false);
    });
  });
});

describe("Friendship E2E", () => {
  it("sends and accepts friend request", async () => {
    const me = await seedUser({ username: "alice", email: "alice@example.com" });
    await seedUser({ username: "bob", email: "bob@example.com", displayName: "Bob" });

    const { token: aliceToken } = await signinAndGetToken(app, "alice");
    const { token: bobToken } = await signinAndGetToken(app, "bob");

    // Alice gửi lời mời cho bob
    const sendRes = await request(app)
      .post("/api/friends/request")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ userId: me._id.toString() === "test" ? "" : "" });

    // Lỗi: me chính là alice. Cần lấy _id của bob
    const bob = await User.findOne({ username: "bob" });

    const send = await request(app)
      .post("/api/friends/request")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ userId: bob._id.toString() });

    expect(send.status).toBe(200);

    // Bob chấp nhận
    const accept = await request(app)
      .post("/api/friends/accept")
      .set("Authorization", `Bearer ${bobToken}`)
      .send({ userId: me._id.toString() });

    expect(accept.status).toBe(200);
    expect(accept.body.friendship.status).toBe("accepted");
  });

  it("rejects invalid userId", async () => {
    await seedUser();
    const { token } = await signinAndGetToken(app);

    const res = await request(app)
      .post("/api/friends/request")
      .set("Authorization", `Bearer ${token}`)
      .send({ userId: "invalid-id" });

    expect(res.status).toBe(400);
  });
});

describe("Notification E2E", () => {
  it("returns empty list initially", async () => {
    await seedUser();
    const { token } = await signinAndGetToken(app);

    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it("returns unread count", async () => {
    await seedUser();
    const { token } = await signinAndGetToken(app);

    const res = await request(app)
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });
});
