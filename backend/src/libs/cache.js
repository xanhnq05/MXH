// Cache layer - ioredis wrapper voi lazy-connect + graceful fallback.
// Neu Redis chua san sang (DOWN/timeout), tra ve null -> caller bo qua cache.
// Trong test: tu dong mock de khong can Redis that.

import Redis from "ioredis";

// Khi REDIS_URL khong duoc set -> lazy: khong tao connection, moi method tra ve safe no-op
// Trong test: van co the su dung Redis that neu REDIS_URL duoc set (test integration)
// Neu khong co REDIS_URL trong test: skip (mac dinh).
let client = null;
let connected = false;
let connecting = false;

// ===== Cache metric (in-memory counters) =====
// Theo doi hit/miss de debug hieu nang. Reset moi 24h hoac khi restart.
let hits = 0;
let misses = 0;
let errors = 0;
let lastResetAt = Date.now();

export const getMetrics = () => ({
  hits,
  misses,
  errors,
  hitRate: hits + misses > 0 ? (hits / (hits + misses) * 100).toFixed(2) : "0.00",
  uptimeMs: Date.now() - lastResetAt,
  available: isCacheAvailableInternal(),
});

export const resetMetrics = () => {
  hits = 0;
  misses = 0;
  errors = 0;
  lastResetAt = Date.now();
};

/** Disconnect Redis client (dung trong test cleanup) */
export const disconnect = async () => {
  if (client) {
    try {
      await client.quit();
    } catch {
      // ignore - co the client da dong
    }
    client = null;
    connected = false;
    connecting = false;
  }
};

const isCacheAvailableInternal = () => Boolean(client && connected);

const url = process.env.REDIS_URL || "";

if (url) {
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
export const isCacheAvailable = () => isCacheAvailableInternal();

/** Lay gia tri tu cache (JSON parse) */
export const cacheGet = async (key) => {
  if (!isCacheAvailable()) return null;
  try {
    const raw = await client.get(key);
    if (raw) {
      hits++;
      return JSON.parse(raw);
    }
    misses++;
    return null;
  } catch (e) {
    errors++;
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
    errors++;
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
  getMetrics,
  resetMetrics,
  disconnect,
};
