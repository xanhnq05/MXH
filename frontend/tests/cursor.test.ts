// Test cho pagination decodeCursor
import { describe, it, expect } from "vitest";

function encodeCursor(doc: { createdAt: Date; _id: string }): string {
  const iso = doc.createdAt.toISOString();
  return Buffer.from(`${iso}_${doc._id}`).toString("base64");
}

function decodeCursor(cursor: string | null): {
  id: string;
  createdAt: Date;
} | null {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const [iso, id] = decoded.split("_");
    if (!iso || !id || isNaN(new Date(iso).getTime())) return null;
    return { createdAt: new Date(iso), id };
  } catch {
    return null;
  }
}

describe("cursor pagination", () => {
  it("encodes + decodes", () => {
    const doc = {
      createdAt: new Date("2026-05-10T12:00:00Z"),
      _id: "507f1f77bcf86cd799439011",
    };
    const encoded = encodeCursor(doc);
    expect(encoded).toBeTruthy();
    const decoded = decodeCursor(encoded);
    expect(decoded).toBeTruthy();
    expect(decoded!.id).toBe("507f1f77bcf86cd799439011");
    expect(new Date(decoded!.createdAt).toISOString()).toBe("2026-05-10T12:00:00.000Z");
  });

  it("returns null for invalid", () => {
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor("")).toBeNull();
    expect(decodeCursor("not-base64!@#")).toBeNull();
  });
});
