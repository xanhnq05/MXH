// Queue layer - BullMQ + Redis.
// Neu Redis chua san sang, cac method tra ve safe no-op de khong crash app.

import { Queue, Worker, QueueEvents } from "bullmq";
import { env } from "../configs/env.config.js";

const isTest = process.env.NODE_ENV === "test";
const url = process.env.REDIS_URL || "";

let connectionOpts = null;
if (url && !isTest) {
  connectionOpts = {
    maxRetriesPerRequest: null, // BullMQ yeu cau
    enableReadyCheck: false,
    connectTimeout: 5000,
  };
}

const queues = new Map();

/** Lay hoac tao queue theo ten */
export const getQueue = (name) => {
  if (!connectionOpts) return null; // Redis chua san sang
  if (queues.has(name)) return queues.get(name);
  const q = new Queue(name, { connection: connectionOpts });
  queues.set(name, q);
  return q;
};

/**
 * Enqueue job khong block neu Redis down.
 * @returns {Promise<string|null>} jobId hoac null neu khong enqueue duoc
 */
export const enqueue = async (name, data, opts = {}) => {
  const q = getQueue(name);
  if (!q) return null;
  try {
    const job = await q.add(name, data, {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      ...opts,
    });
    return job.id;
  } catch (e) {
    console.warn(`⚠️ Queue ${name} enqueue failed:`, e.message);
    return null;
  }
};

/** Worker factory - goi trong workers/index.js */
export const createWorker = (name, processor, opts = {}) => {
  if (!connectionOpts) {
    console.warn(`⚠️ Cannot create worker ${name}: Redis chua san sang`);
    return null;
  }
  return new Worker(name, processor, { connection: connectionOpts, ...opts });
};

export const closeAllQueues = async () => {
  for (const q of queues.values()) {
    try {
      await q.close();
    } catch (e) {}
  }
  queues.clear();
};

// Ten queue (constants de tranh typo)
export const QUEUE_NAMES = {
  VIDEO_PROCESS: "video.process",
  VIDEO_CLEANUP: "video.cleanup",
  NOTIFICATION_PUSH: "notification.push",
};

export default { getQueue, enqueue, createWorker, closeAllQueues, QUEUE_NAMES };
