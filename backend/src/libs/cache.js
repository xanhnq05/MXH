// Cache layer - ioredis wrapper voi lazy-connect + graceful fallback.
// Neu Redis chua san sang (DOWN/timeout), tra ve null -> caller bo qua cache.
// Trong test: tu dong mock de khong can Redis that.

import Redis from "ioredis";
import { env } from "../configs/env.config.js";

const isTest = process.env.NODE_ENV === "test";

// Khi REDIS_URL khong duoc set -> lazy: khong tao connection, moi method tra ve safe no-op
let client = null;
let connected = false;
let connecting = false;

const url = process.env.REDIS_URL || "";

if (url && !isTest) {
  client = new Redis(url, {
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    connectTimeout: 2000,
    retryStrategy(times) {
      // Backoff: 1s, 2s, 4s, ..., max 30s
      return Math.min(times * 1000, 30_000);
    },
    lazyConnect: true,
    reconnectOnError() {
      return false;
    },
  });

  client.on("ready", () => {
    connected = true;
    console.log("🟢 Redis connected");
  });
  client.on("error", (err) => {
    if (connected) {
      console.warn("🔴 Redis error:", err.message);
    }
    connected = false;
  });
  client.on("end", () => {
    connected = false;
  });

  // Bat dau connect, nhung khong throw neu that bai
  if (!connecting) {
    connecting = true;
    client.connect().catch((e) => {
      // Silent - he thong van chay, chi khong co cache
      if (process.env.NODE_ENV !== "production") {
        console.warn("⚠️ Redis chua san sang, cache se bi bo qua:", e.message);
      }
    });
  }
}

/** Kiem tra cache co san khong */
export const isCacheAvailable = () => Boolean(client && connected);

/** Lay gia tri tu cache (JSON parse) */
export const cacheGet = async (key) => {
  if (!isCacheAvailable()) return null;
  try {
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

/** Set gia tri vao cache (JSON stringify) voi TTL giay */
export const cacheSet = async (key, value, ttlSec = 60) => {
  if (!isCacheAvailable()) return false;
  try {
    await client.set(key, JSON.stringify(value), "EX", ttlSec);
    return true;
  } catch (e) {
    return false;
  }
};

/** Xoa 1 hoac nhieu key */
export const cacheDel = async (...keys) => {
  if (!isCacheAvailable() || !keys.length) return 0;
  try {
    return await client.del(...keys);
  } catch (e) {
    return 0;
  }
};

/** Xoa theo pattern (su dung SCAN, khong dung KEYS) */
export const cacheDelPattern = async (pattern) => {
  if (!isCacheAvailable()) return 0;
  try {
    let cursor = "0";
    let removed = 0;
    do {
      const [next, keys] = await client.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = next;
      if (keys.length) {
        removed += await client.del(...keys);
      }
    } while (cursor !== "0");
    return removed;
  } catch (e) {
    return 0;
  }
};

/** Tang counter (dung cho rate-limit nhe, idem-key) */
export const cacheIncr = async (key, ttlSec = 0) => {
  if (!isCacheAvailable()) return null;
  try {
    const n = await client.incr(key);
    if (ttlSec && n === 1) await client.expire(key, ttlSec);
    return n;
  } catch (e) {
    return null;
  }
};

/**
 * Wrap: get tu cache, neu miss thi goi fn() roi set lai.
 * Neu Redis khong kha dung, chi goi fn() (pass-through).
 */
export const cacheWrap = async (key, ttlSec, fn) => {
  const hit = await cacheGet(key);
  if (hit !== null) return hit;
  const fresh = await fn();
  if (fresh !== undefined && fresh !== null) {
    await cacheSet(key, fresh, ttlSec);
  }
  return fresh;
};

/** Health check */
export const ping = async () => {
  if (!client) return { ok: false, reason: "no-client" };
  if (!connected) return { ok: false, reason: "not-connected" };
  try {
    const res = await client.ping();
    return { ok: res === "PONG" };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
};

export default {
  get: cacheGet,
  set: cacheSet,
  del: cacheDel,
  delPattern: cacheDelPattern,
  incr: cacheIncr,
  wrap: cacheWrap,
  isAvailable: isCacheAvailable,
  ping,
};
