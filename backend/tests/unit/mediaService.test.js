// Unit test cho media service — search/ranking
import { jest } from "@jest/globals";
import MediaAsset from "../../src/models/MediaAsset.js";
import {
  setupTestDB,
  clearTestDB,
  closeTestDB,
} from "../setupE2E.js";
import { mediaService } from "../../src/services/media.service.js";
import { normalizeVi } from "../../src/models/MediaAsset.js";

beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

describe("MediaAsset normalizeVi", () => {
  it("bỏ dấu tiếng Việt", () => {
    expect(normalizeVi("Chúc mừng sinh nhật")).toBe("chuc mung sinh nhat");
  });
  it("đ/d", () => {
    expect(normalizeVi("đẹp")).toBe("dep");
  });
  it("lowercase + trim", () => {
    expect(normalizeVi("  HELLO  ")).toBe("hello");
  });
  it("empty/null", () => {
    expect(normalizeVi("")).toBe("");
    expect(normalizeVi(null)).toBe("");
  });
});

describe("mediaService.search", () => {
  beforeEach(async () => {
    await MediaAsset.create([
      {
        mediaType: "gif",
        name: "Chúc mừng sinh nhật",
        url: "https://x/1.gif",
        storageKey: "k1",
        mimeType: "image/gif",
        fileSize: 100,
        tags: ["sinh nhật", "chúc mừng"],
        keywords: ["birthday", "party"],
        synonyms: ["sn", "mừng sn"],
        phrases: ["chúc mừng sinh nhật"],
        isActive: true,
        priority: 0,
      },
      {
        mediaType: "gif",
        name: "Vui vẻ",
        url: "https://x/2.gif",
        storageKey: "k2",
        mimeType: "image/gif",
        fileSize: 100,
        tags: ["vui", "cười"],
        keywords: ["happy", "laugh"],
        isActive: true,
        priority: 0,
      },
      {
        mediaType: "sticker",
        name: "Mèo cute",
        url: "https://x/3.png",
        storageKey: "k3",
        mimeType: "image/png",
        fileSize: 100,
        tags: ["mèo", "cute"],
        isActive: true,
        priority: 0,
      },
      {
        mediaType: "gif",
        name: "Asset ẩn",
        url: "https://x/4.gif",
        storageKey: "k4",
        mimeType: "image/gif",
        fileSize: 100,
        tags: ["sinh nhật"],
        isActive: false,
      },
    ]);
  });

  it("ranking phrase cao nhất", async () => {
    const results = await mediaService.search("chúc mừng sinh nhật");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe("Chúc mừng sinh nhật");
  });

  it("tìm theo tag", async () => {
    const results = await mediaService.search("vui");
    expect(results.length).toBe(1);
    expect(results[0].name).toBe("Vui vẻ");
  });

  it("tìm không phân biệt dấu (sinh nhat khớp sinh nhật)", async () => {
    const results = await mediaService.search("sinh nhat");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe("Chúc mừng sinh nhật");
  });

  it("không trả về asset isActive=false", async () => {
    const results = await mediaService.search("sinh nhật");
    expect(results.find((r) => r.name === "Asset ẩn")).toBeUndefined();
  });

  it("filter theo mediaType", async () => {
    const results = await mediaService.search("sinh", { mediaType: "sticker" });
    expect(results.length).toBe(0);
  });

  it("query quá ngắn (< 2 ký tự) trả []", async () => {
    const results = await mediaService.search("a");
    expect(results).toEqual([]);
  });

  it("query rỗng trả []", async () => {
    const results = await mediaService.search("");
    expect(results).toEqual([]);
  });
});
