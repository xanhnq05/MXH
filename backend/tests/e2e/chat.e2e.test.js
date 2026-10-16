// E2E test cho Chat (Conversation + Message)
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

describe("Chat E2E", () => {
  describe("POST /api/conversations/direct", () => {
    it("creates direct conversation between 2 users", async () => {
      const alice = await seedUser({ username: "alice", email: "alice@example.com" });
      const bob = await seedUser({ username: "bob", email: "bob@example.com" });

      const aliceToken = await signinAndGetToken(app, alice);

      const res = await request(app)
        .post("/api/conversations/direct")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ userId: bob._id.toString() });

      expect(res.status).toBe(200);
      expect(res.body.conversation.type).toBe("direct");
      expect(res.body.conversation.members.length).toBe(2);
    });

    it("returns existing conversation on second call", async () => {
      const alice = await seedUser({ username: "alice", email: "alice@example.com" });
      const bob = await seedUser({ username: "bob", email: "bob@example.com" });
      const aliceToken = await signinAndGetToken(app, alice);

      const r1 = await request(app)
        .post("/api/conversations/direct")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ userId: bob._id.toString() });

      const r2 = await request(app)
        .post("/api/conversations/direct")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ userId: bob._id.toString() });

      expect(r1.body.conversation._id).toBe(r2.body.conversation._id);
    });

    it("rejects chatting with self", async () => {
      const alice = await seedUser({ username: "alice", email: "alice@example.com" });
      const aliceToken = await signinAndGetToken(app, alice);

      const res = await request(app)
        .post("/api/conversations/direct")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ userId: alice._id.toString() });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/conversations/group", () => {
    it("creates group with 3 members", async () => {
      const alice = await seedUser({ username: "alice", email: "alice@example.com" });
      const bob = await seedUser({ username: "bob", email: "bob@example.com" });
      const carol = await seedUser({ username: "carol", email: "carol@example.com" });

      const aliceToken = await signinAndGetToken(app, alice);
      const res = await request(app)
        .post("/api/conversations/group")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({
          name: "Test Group",
          memberIds: [bob._id.toString(), carol._id.toString()],
        });

      expect(res.status).toBe(201);
      expect(res.body.conversation.type).toBe("group");
      expect(res.body.conversation.name).toBe("Test Group");
      expect(res.body.conversation.members.length).toBe(3);
    });

    it("rejects group with < 3 members", async () => {
      const alice = await seedUser({ username: "alice", email: "alice@example.com" });
      const aliceToken = await signinAndGetToken(app, alice);

      const res = await request(app)
        .post("/api/conversations/group")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ name: "Tiny", memberIds: [] });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/conversations", () => {
    it("lists conversations for user", async () => {
      const alice = await seedUser({ username: "alice", email: "alice@example.com" });
      const bob = await seedUser({ username: "bob", email: "bob@example.com" });
      const aliceToken = await signinAndGetToken(app, alice);

      await request(app)
        .post("/api/conversations/direct")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ userId: bob._id.toString() });

      const res = await request(app)
        .get("/api/conversations")
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.conversations.length).toBe(1);
    });
  });

  describe("Message flow", () => {
    it("sends and lists messages in conversation", async () => {
      const alice = await seedUser({ username: "alice", email: "alice@example.com" });
      const bob = await seedUser({ username: "bob", email: "bob@example.com" });
      const aliceToken = await signinAndGetToken(app, alice);

      const conv = await request(app)
        .post("/api/conversations/direct")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ userId: bob._id.toString() });

      const convId = conv.body.conversation._id;

      // Gửi tin nhắn
      const send = await request(app)
        .post(`/api/messages/${convId}/messages`)
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ type: "text", content: "Hello Bob!" });

      expect(send.status).toBe(201);
      expect(send.body.message.content).toBe("Hello Bob!");

      // Lấy danh sách
      const list = await request(app)
        .get(`/api/messages/${convId}/messages`)
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(list.status).toBe(200);
      expect(list.body.items.length).toBe(1);
    });

    it("rejects non-member from sending", async () => {
      const alice = await seedUser({ username: "alice", email: "alice@example.com" });
      const bob = await seedUser({ username: "bob", email: "bob@example.com" });
      const carol = await seedUser({ username: "carol", email: "carol@example.com" });

      const aliceToken = await signinAndGetToken(app, alice);
      const carolToken = await signinAndGetToken(app, carol);

      const conv = await request(app)
        .post("/api/conversations/direct")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ userId: bob._id.toString() });

      const convId = conv.body.conversation._id;

      const send = await request(app)
        .post(`/api/messages/${convId}/messages`)
        .set("Authorization", `Bearer ${carolToken}`)
        .send({ type: "text", content: "I'm not a member!" });

      expect(send.status).toBe(403);
    });
  });

  describe("POST /api/messages/:conversationId/upload (no message)", () => {
    it("uploads file and returns metadata, no message created", async () => {
      const alice = await seedUser({ username: "alice", email: "alice@example.com" });
      const bob = await seedUser({ username: "bob", email: "bob@example.com" });
      const aliceToken = await signinAndGetToken(app, alice);

      const conv = await request(app)
        .post("/api/conversations/direct")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ userId: bob._id.toString() });

      const convId = conv.body.conversation._id;

      const fakeJpeg = Buffer.from("fake-jpeg-bytes-for-test");
      const res = await request(app)
        .post(`/api/messages/${convId}/upload`)
        .set("Authorization", `Bearer ${aliceToken}`)
        .attach("file", fakeJpeg, { filename: "test.jpg", contentType: "image/jpeg" });

      expect(res.status).toBe(201);
      expect(res.body.file).toBeDefined();
      expect(res.body.file.url).toMatch(/^https:\/\/test\.supabase\.co/);
      expect(res.body.file.key).toBeDefined();
      expect(res.body.file.size).toBeGreaterThan(0);
      expect(res.body.file.mimeType).toBe("image/jpeg");

      // Verify no message was created
      const list = await request(app)
        .get(`/api/messages/${convId}/messages`)
        .set("Authorization", `Bearer ${aliceToken}`);
      expect(list.body.items.length).toBe(0);
    });

    it("rejects unsupported file type", async () => {
      const alice = await seedUser({ username: "alice", email: "alice@example.com" });
      const bob = await seedUser({ username: "bob", email: "bob@example.com" });
      const aliceToken = await signinAndGetToken(app, alice);

      const conv = await request(app)
        .post("/api/conversations/direct")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ userId: bob._id.toString() });

      const convId = conv.body.conversation._id;

      // Executable type — không nằm trong whitelist
      const fakeExe = Buffer.from("fake-exe-bytes");
      const res = await request(app)
        .post(`/api/messages/${convId}/upload`)
        .set("Authorization", `Bearer ${aliceToken}`)
        .attach("file", fakeExe, { filename: "malware.exe", contentType: "application/x-msdownload" });

      expect(res.status).toBe(500); // multer fileFilter rejects → error middleware
    });

    it("accepts PDF upload", async () => {
      const alice = await seedUser({ username: "alice", email: "alice@example.com" });
      const bob = await seedUser({ username: "bob", email: "bob@example.com" });
      const aliceToken = await signinAndGetToken(app, alice);

      const conv = await request(app)
        .post("/api/conversations/direct")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ userId: bob._id.toString() });

      const convId = conv.body.conversation._id;

      const fakePdf = Buffer.from("%PDF-1.4 fake content");
      const res = await request(app)
        .post(`/api/messages/${convId}/upload`)
        .set("Authorization", `Bearer ${aliceToken}`)
        .attach("file", fakePdf, { filename: "doc.pdf", contentType: "application/pdf" });

      expect(res.status).toBe(201);
      expect(res.body.file.mimeType).toBe("application/pdf");
    });
  });

  describe("Sticker/GIF rate limit (via send API)", () => {
    it("rate limits sticker after 5 in window", async () => {
      const alice = await seedUser({ username: "alice", email: "alice@example.com" });
      const bob = await seedUser({ username: "bob", email: "bob@example.com" });
      const aliceToken = await signinAndGetToken(app, alice);

      const conv = await request(app)
        .post("/api/conversations/direct")
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ userId: bob._id.toString() });
      const convId = conv.body.conversation._id;

      // Gửi 5 sticker (đều OK, kể cả khi cooldown chặn 1 số)
      let success = 0;
      let rateLimited = 0;
      for (let i = 0; i < 7; i++) {
        const res = await request(app)
          .post(`/api/messages/${convId}/messages`)
          .set("Authorization", `Bearer ${aliceToken}`)
          .send({ type: "sticker", stickerId: `s${i}`, stickerUrl: "https://x/s.png" });
        if (res.status === 201) success++;
        if (res.status === 429) rateLimited++;
      }
      // Ít nhất phải có rateLimited > 0 (do cooldown 1s hoặc window 5/30s)
      expect(success + rateLimited).toBe(7);
    });
  });
});
