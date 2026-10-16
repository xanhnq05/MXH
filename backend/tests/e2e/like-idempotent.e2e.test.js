// Test cho idempotent like behavior.
// Dam bao: like 2 lan van tra ve liked:true (khong throw 404)
// unlike khi chua like: tra ve liked:false (khong throw)

import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import {
  setupTestDB,
  clearTestDB,
  closeTestDB,
  buildApp,
} from "../setupE2E.js";
import User from "../../src/models/User.js";
import Post from "../../src/models/Post.js";
import bcrypt from "bcrypt";

let app;
let user;
let token;
let post;

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
  const r = await request(app)
    .post("/api/auth/signin")
    .send({ username: user.username, password: "password123" });
  token = r.body.accessToken;
  post = await Post.create({ authorId: user._id, content: "hello" });
});

describe("Like idempotent", () => {
  it("PUT /:id/like lan 1: 200, likeCount=1", async () => {
    const r = await request(app)
      .put(`/api/posts/${post._id}/like`)
      .set("Authorization", `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.liked).toBe(true);
    expect(r.body.likeCount).toBe(1);
  });

  it("PUT /:id/like lan 2: 200 (idempotent), likeCount van =1", async () => {
    await request(app)
      .put(`/api/posts/${post._id}/like`)
      .set("Authorization", `Bearer ${token}`);
    const r = await request(app)
      .put(`/api/posts/${post._id}/like`)
      .set("Authorization", `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.liked).toBe(true);
    expect(r.body.likeCount).toBe(1);
  });

  it("DELETE /:id/like khi chua like: 200 (idempotent), likeCount=0", async () => {
    const r = await request(app)
      .delete(`/api/posts/${post._id}/like`)
      .set("Authorization", `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.liked).toBe(false);
    expect(r.body.likeCount).toBe(0);
  });

  it("Like 3 lan lien tiep: count van =1, khong tang 3 lan", async () => {
    for (let i = 0; i < 3; i++) {
      await request(app)
        .put(`/api/posts/${post._id}/like`)
        .set("Authorization", `Bearer ${token}`);
    }
    const reloaded = await Post.findById(post._id);
    expect(reloaded.likeCount).toBe(1);
    expect(reloaded.likes.length).toBe(1);
  });

  it("Like 2 user khac nhau: count =2", async () => {
    const other = await seedUser();
    const r2 = await request(app)
      .post("/api/auth/signin")
      .send({ username: other.username, password: "password123" });
    await request(app)
      .put(`/api/posts/${post._id}/like`)
      .set("Authorization", `Bearer ${token}`);
    await request(app)
      .put(`/api/posts/${post._id}/like`)
      .set("Authorization", `Bearer ${r2.body.accessToken}`);
    const reloaded = await Post.findById(post._id);
    expect(reloaded.likeCount).toBe(2);
  });

  it("Like → Unlike → Like: count =1 (khong 2)", async () => {
    for (let i = 0; i < 2; i++) {
      await request(app)
        .put(`/api/posts/${post._id}/like`)
        .set("Authorization", `Bearer ${token}`);
      await request(app)
        .delete(`/api/posts/${post._id}/like`)
        .set("Authorization", `Bearer ${token}`);
    }
    await request(app)
      .put(`/api/posts/${post._id}/like`)
      .set("Authorization", `Bearer ${token}`);
    const reloaded = await Post.findById(post._id);
    expect(reloaded.likeCount).toBe(1);
  });

  it("Like post khong ton tai: 404", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const r = await request(app)
      .put(`/api/posts/${fakeId}/like`)
      .set("Authorization", `Bearer ${token}`);
    expect(r.status).toBe(404);
  });
});
