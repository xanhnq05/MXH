// Unit test cho cache layer.
// Test chay duoc ca khi Redis khong san sang (graceful fallback).

import { jest } from "@jest/globals";

describe("cache layer (graceful fallback)", () => {
  let cache;
  let origUrl;
  let origNodeEnv;

  beforeAll(() => {
    origUrl = process.env.REDIS_URL;
    origNodeEnv = process.env.NODE_ENV;
    // Dam bao REDIS_URL = "" -> khong tao client that
    process.env.REDIS_URL = "";
  });

  afterAll(() => {
    process.env.REDIS_URL = origUrl;
    process.env.NODE_ENV = origNodeEnv;
  });

  beforeEach(async () => {
    jest.resetModules();
    cache = (await import("../../src/libs/cache.js")).default;
  });

  test("isAvailable tra ve false khi khong co Redis", () => {
    expect(cache.isAvailable()).toBe(false);
  });

  test("get/set tra ve null/false khi khong co Redis", async () => {
    const got = await cache.get("any-key");
    expect(got).toBeNull();
    const set = await cache.set("any-key", { a: 1 }, 60);
    expect(set).toBe(false);
  });

  test("del tra ve 0 khi khong co Redis", async () => {
    const r = await cache.del("a", "b");
    expect(r).toBe(0);
  });

  test("delPattern tra ve 0 khi khong co Redis", async () => {
    const r = await cache.delPattern("user:*");
    expect(r).toBe(0);
  });

  test("incr tra ve null khi khong co Redis", async () => {
    const r = await cache.incr("counter", 60);
    expect(r).toBeNull();
  });

  test("wrap goi fn() khi cache miss (Redis off)", async () => {
    const fn = jest.fn(async () => ({ data: "fresh" }));
    const r = await cache.wrap("k", 60, fn);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(r).toEqual({ data: "fresh" });
  });

  test("ping tra ve ok:false khi khong co Redis", async () => {
    const p = await cache.ping();
    expect(p.ok).toBe(false);
  });
});
