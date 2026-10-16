// Unit test cho queue layer.

import { jest } from "@jest/globals";

describe("queue layer (graceful fallback)", () => {
  let queue;
  let origUrl;
  let origNodeEnv;

  beforeAll(() => {
    origUrl = process.env.REDIS_URL;
    origNodeEnv = process.env.NODE_ENV;
    process.env.REDIS_URL = "";
  });

  afterAll(() => {
    process.env.REDIS_URL = origUrl;
    process.env.NODE_ENV = origNodeEnv;
  });

  beforeEach(async () => {
    jest.resetModules();
    queue = await import("../../src/libs/queue.js");
  });

  test("getQueue tra ve null khi khong co Redis", () => {
    const q = queue.getQueue("test");
    expect(q).toBeNull();
  });

  test("enqueue tra ve null khi khong co Redis", async () => {
    const id = await queue.enqueue("video.process", { foo: "bar" });
    expect(id).toBeNull();
  });

  test("createWorker tra ve null khi khong co Redis", () => {
    const w = queue.createWorker("video.process", async () => {});
    expect(w).toBeNull();
  });

  test("closeAllQueues khong throw khi khong co Redis", async () => {
    await expect(queue.closeAllQueues()).resolves.not.toThrow();
  });

  test("QUEUE_NAMES export constants", () => {
    expect(queue.QUEUE_NAMES.VIDEO_PROCESS).toBe("video.process");
    expect(queue.QUEUE_NAMES.VIDEO_CLEANUP).toBe("video.cleanup");
    expect(queue.QUEUE_NAMES.NOTIFICATION_PUSH).toBe("notification.push");
  });
});
