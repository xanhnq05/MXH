// E2E test cho orphan cleanup:
// Neu upload thanh cong nhung Post.create fail -> phai xoa file (cleanup).

import { jest } from "@jest/globals";
import request from "supertest";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import {
  buildApp,
  setupTestDB,
  clearTestDB,
  closeTestDB,
} from "../setupE2E.js";
import User from "../../src/models/User.js";
import Post from "../../src/models/Post.js";
import * as uploadMod from "../../src/services/upload.service.js";

let app;
let user;
let token;

const seedUser = async () => {
  const hashed = await bcrypt.hash("password123", 4);
  return User.create({
    username: "u_" + Math.random().toString(36).slice(2, 8),
    email: Math.random().toString(36).slice(2, 8) + "@ex.com",
    displayName: "U",
    hashedPassword: hashed,
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
});

describe("Orphan cleanup khi DB fail", () => {
  test("Post.create fail: upload service duoc goi deleteFile", async () => {
    // Mock upload service de:
    //  - uploadFile tra ve fake success (1 file)
    //  - deleteFile duoc goi de cleanup
    const deleteCalls = [];
    const originalDelete = uploadMod.uploadService.deleteFile;

    // Track delete calls
    uploadMod.uploadService.deleteFile = async (key) => {
      deleteCalls.push(key);
      return originalDelete.call(uploadMod.uploadService, key);
    };

    // Force Post.create fail bang cach override mot lan
    const realPostCreate = Post.create;
    const originalCreate = Post.create.bind(Post);
    let postCreateCalls = 0;
    Post.create = async function (...args) {
      postCreateCalls++;
      // Lan dau fail (mock), lan sau pass
      if (postCreateCalls === 1) {
        throw new Error("Simulated DB failure");
      }
      return originalCreate(...args);
    };

    // Tao request voi file (mock upload tra ve success)
    try {
      // Tao fake buffer file
      const fakeFile = {
        originalname: "test.jpg",
        mimetype: "image/jpeg",
        buffer: Buffer.from("fake image data"),
        size: 14,
      };

      // Goi truc tiep service de test logic cleanup (vi route validate truoc)
      // Thay vao do, test integration: gui request va bat loi tu Post.create
      // De bypass validation, ta test service truc tiep
      const { postService } = await import("../../src/services/post.service.js");
      let threwError = null;
      try {
        await postService.create(user._id, {
          content: "Test post",
          files: [fakeFile],
        });
      } catch (e) {
        threwError = e;
      }
      // Loi tu Post.create phai duoc throw ra
      expect(threwError).not.toBeNull();
      expect(threwError.message).toMatch(/Simulated DB failure/);
      // Cleanup phai da duoc goi (deleteFile co 1 call)
      expect(deleteCalls.length).toBe(1);
    } finally {
      Post.create = realPostCreate;
      uploadMod.uploadService.deleteFile = originalDelete;
    }
  });

  test("Post.create success: KHONG goi deleteFile (khong cleanup khong can)", async () => {
    const deleteCalls = [];
    const originalDelete = uploadMod.uploadService.deleteFile;
    uploadMod.uploadService.deleteFile = async (key) => {
      deleteCalls.push(key);
      return originalDelete.call(uploadMod.uploadService, key);
    };

    try {
      const { postService } = await import("../../src/services/post.service.js");
      const fakeFile = {
        originalname: "test.jpg",
        mimetype: "image/jpeg",
        buffer: Buffer.from("fake image data"),
        size: 14,
      };
      await postService.create(user._id, {
        content: "Test post successful",
        files: [fakeFile],
      });
      // Cleanup KHONG duoc goi
      expect(deleteCalls.length).toBe(0);
    } finally {
      uploadMod.uploadService.deleteFile = originalDelete;
    }
  });
});
