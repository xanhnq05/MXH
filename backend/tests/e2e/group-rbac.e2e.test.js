// E2E test cho Group RBAC matrix (owner/admin/member/outsider)
// + transferOwnership endpoint

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

const createGroup = async (token, memberIds, name = "Test Group") => {
  return request(app)
    .post("/api/conversations/group")
    .set("Authorization", `Bearer ${token}`)
    .send({ name, memberIds });
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
});

describe("Group RBAC — transfer ownership", () => {
  let owner, admin, member, outsider;
  let ownerToken, adminToken, memberToken, outsiderToken;
  let convId;

  beforeEach(async () => {
    owner = await seedUser({ email: "owner@x.com" });
    admin = await seedUser({ email: "admin@x.com" });
    member = await seedUser({ email: "member@x.com" });
    outsider = await seedUser({ email: "out@x.com" });
    ownerToken = await signin(owner);
    adminToken = await signin(admin);
    memberToken = await signin(member);
    outsiderToken = await signin(outsider);

    // Tao group: owner + admin + member (3 nguoi)
    const r = await createGroup(ownerToken, [admin._id.toString(), member._id.toString()]);
    convId = r.body.conversation._id;

    // Promote admin thanh admin role
    await request(app)
      .patch(`/api/conversations/${convId}/role`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ userId: admin._id.toString(), newRole: "admin" });
  });

  test("Owner transfer cho member: 200, role swap", async () => {
    const r = await request(app)
      .patch(`/api/conversations/${convId}/transfer-ownership`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ userId: member._id.toString() });
    expect(r.status).toBe(200);
    const members = r.body.conversation.members;
    const newOwner = members.find((m) => m.userId._id === member._id.toString() || m.userId === member._id.toString());
    const oldOwner = members.find((m) => m.userId._id === owner._id.toString() || m.userId === owner._id.toString());
    expect(newOwner.role).toBe("owner");
    expect(oldOwner.role).toBe("admin"); // demoted
  });

  test("Member transfer ownership: 403", async () => {
    const r = await request(app)
      .patch(`/api/conversations/${convId}/transfer-ownership`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ userId: admin._id.toString() });
    expect(r.status).toBe(403);
  });

  test("Outsider transfer: 403", async () => {
    const r = await request(app)
      .patch(`/api/conversations/${convId}/transfer-ownership`)
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ userId: admin._id.toString() });
    expect(r.status).toBe(403);
  });

  test("Owner transfer cho chinh minh: 400", async () => {
    const r = await request(app)
      .patch(`/api/conversations/${convId}/transfer-ownership`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ userId: owner._id.toString() });
    expect(r.status).toBe(400);
  });

  test("Owner transfer cho non-member: 404", async () => {
    const r = await request(app)
      .patch(`/api/conversations/${convId}/transfer-ownership`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ userId: outsider._id.toString() });
    expect(r.status).toBe(404);
  });
});

describe("Group RBAC — change role constraints", () => {
  let owner, admin, member, outsider;
  let ownerToken, adminToken, memberToken, outsiderToken;
  let convId;

  beforeEach(async () => {
    owner = await seedUser({ email: "o@x.com" });
    admin = await seedUser({ email: "a@x.com" });
    member = await seedUser({ email: "m@x.com" });
    outsider = await seedUser({ email: "os@x.com" });
    ownerToken = await signin(owner);
    adminToken = await signin(admin);
    memberToken = await signin(member);
    outsiderToken = await signin(outsider);

    const r = await createGroup(ownerToken, [admin._id.toString(), member._id.toString()]);
    convId = r.body.conversation._id;
    await request(app)
      .patch(`/api/conversations/${convId}/role`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ userId: admin._id.toString(), newRole: "admin" });
  });

  test("Owner promote member → admin: 200", async () => {
    const r = await request(app)
      .patch(`/api/conversations/${convId}/role`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ userId: member._id.toString(), newRole: "admin" });
    expect(r.status).toBe(200);
  });

  test("Admin khong the promote member: 403", async () => {
    const r = await request(app)
      .patch(`/api/conversations/${convId}/role`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ userId: member._id.toString(), newRole: "admin" });
    expect(r.status).toBe(403);
  });

  test("Khong the doi role thanh owner qua changeRole (phai dung transferOwnership): 400", async () => {
    const r = await request(app)
      .patch(`/api/conversations/${convId}/role`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ userId: member._id.toString(), newRole: "owner" });
    expect(r.status).toBe(400);
  });
});

describe("Group RBAC — kick/remove member", () => {
  let owner, admin, member, otherMember;
  let ownerToken, adminToken, memberToken;
  let convId;

  beforeEach(async () => {
    owner = await seedUser({ email: "o2@x.com" });
    admin = await seedUser({ email: "a2@x.com" });
    member = await seedUser({ email: "m2@x.com" });
    otherMember = await seedUser({ email: "om2@x.com" });
    ownerToken = await signin(owner);
    adminToken = await signin(admin);
    memberToken = await signin(member);

    const r = await createGroup(ownerToken, [
      admin._id.toString(),
      member._id.toString(),
      otherMember._id.toString(),
    ]);
    convId = r.body.conversation._id;
    await request(app)
      .patch(`/api/conversations/${convId}/role`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ userId: admin._id.toString(), newRole: "admin" });
  });

  test("Admin kick member: 200", async () => {
    const r = await request(app)
      .delete(`/api/conversations/${convId}/members/${member._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
  });

  test("Member khong the kick: 403", async () => {
    const r = await request(app)
      .delete(`/api/conversations/${convId}/members/${otherMember._id}`)
      .set("Authorization", `Bearer ${memberToken}`);
    expect(r.status).toBe(403);
  });

  test("Admin khong the kick admin khac: 403", async () => {
    // Tao them 1 admin nua
    await request(app)
      .patch(`/api/conversations/${convId}/role`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ userId: otherMember._id.toString(), newRole: "admin" });
    // Bay gio admin (a2) co gang kick admin (om2) → fail
    const r = await request(app)
      .delete(`/api/conversations/${convId}/members/${otherMember._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(r.status).toBe(403);
  });

  test("Khong the kick owner: 403", async () => {
    const r = await request(app)
      .delete(`/api/conversations/${convId}/members/${owner._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(r.status).toBe(403);
  });

  test("Khong the tu kick minh (dung /leave): 400", async () => {
    const r = await request(app)
      .delete(`/api/conversations/${convId}/members/${admin._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(r.status).toBe(400);
  });
});

describe("Group RBAC — leave as owner", () => {
  test("Owner roi nhom khi KHONG con admin: 400 (phai transfer truoc)", async () => {
    const owner = await seedUser({ email: "lno@x.com" });
    const m1 = await seedUser({ email: "ln1@x.com" });
    const m2 = await seedUser({ email: "ln2@x.com" });
    const ownerToken = await signin(owner);
    const r = await createGroup(ownerToken, [m1._id.toString(), m2._id.toString()]);
    const convId = r.body.conversation._id;
    const leave = await request(app)
      .post(`/api/conversations/${convId}/leave`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(leave.status).toBe(400);
    expect(leave.body.message).toMatch(/chuyển quyền|transfer/i);
  });

  test("Owner roi nhom khi CO admin: 200, owner chuyen cho admin", async () => {
    const owner = await seedUser({ email: "lyo@x.com" });
    const admin = await seedUser({ email: "lya@x.com" });
    const m2 = await seedUser({ email: "lym@x.com" });
    const ownerToken = await signin(owner);
    const r = await createGroup(ownerToken, [admin._id.toString(), m2._id.toString()]);
    const convId = r.body.conversation._id;
    await request(app)
      .patch(`/api/conversations/${convId}/role`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ userId: admin._id.toString(), newRole: "admin" });

    const leave = await request(app)
      .post(`/api/conversations/${convId}/leave`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(leave.status).toBe(200);

    // Kiem tra admin da thanh owner
    const detail = await request(app)
      .get(`/api/conversations/${convId}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    // Note: owner da roi nen khong xem duoc, dung adminToken
    const detailAdmin = await request(app)
      .get(`/api/conversations/${convId}`)
      .set("Authorization", `Bearer ${await signin(admin)}`);
    const newOwner = detailAdmin.body.conversation.members.find(
      (m) => (m.userId._id || m.userId).toString() === admin._id.toString()
    );
    expect(newOwner.role).toBe("owner");
  });
});
