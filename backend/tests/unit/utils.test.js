// Unit test cho utils
import {
  encodeCursor,
  decodeCursor,
  paginate,
} from "../../src/utils/pagination.js";
import { generateAccessToken, verifyAccessToken } from "../../src/utils/generateToken.js";
import { generateOtpCode, hashOtp, verifyOtpHash } from "../../src/utils/otp.js";
import { ApiError } from "../../src/utils/ApiError.js";

describe("pagination", () => {
  describe("encodeCursor / decodeCursor", () => {
    it("encodes and decodes roundtrip", () => {
      const doc = { createdAt: new Date("2026-01-01T00:00:00Z"), _id: "507f1f77bcf86cd799439011" };
      const cur = encodeCursor(doc);
      expect(cur).toBeTruthy();
      const decoded = decodeCursor(cur);
      expect(decoded).toBeTruthy();
      expect(decoded.createdAt.toISOString()).toBe("2026-01-01T00:00:00.000Z");
      expect(decoded.id).toBe("507f1f77bcf86cd799439011");
    });

    it("returns null for invalid cursor", () => {
      expect(decodeCursor(null)).toBeNull();
      expect(decodeCursor("")).toBeNull();
      expect(decodeCursor("invalid-base64-!@#")).toBeNull();
    });
  });

  describe("paginate", () => {
    it("returns items + nextCursor when hasMore", async () => {
      const docs = Array.from({ length: 5 }, (_, i) => ({
        _id: `id${i}`,
        createdAt: new Date(2026, 0, 1, 0, 0, i),
      }));
      // Build a chainable object
      const makeChain = (docs) => {
        const chain = {
          docs,
          sort: function () {
            return this;
          },
          limit: function (n) {
            this.docs = this.docs.slice(0, n);
            return this;
          },
          populate: function () {
            return this;
          },
          exec: function () {
            return Promise.resolve(this.docs);
          },
        };
        return chain;
      };
      const model = {
        find: () => makeChain(docs),
      };
      const result = await paginate({ model, limit: 3 });
      expect(result.items.length).toBe(3);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeTruthy();
    });

    it("handles no cursor", async () => {
      const makeChain = (docs) => {
        const chain = {
          docs,
          sort: function () {
            return this;
          },
          limit: function (n) {
            this.docs = this.docs.slice(0, n);
            return this;
          },
          populate: function () {
            return this;
          },
          exec: function () {
            return Promise.resolve(this.docs);
          },
        };
        return chain;
      };
      const model = {
        find: () => makeChain([]),
      };
      const result = await paginate({ model, limit: 5 });
      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
    });
  });
});

describe("generateToken", () => {
  it("signs and verifies", () => {
    const token = generateAccessToken({ userId: "abc" });
    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe("abc");
  });

  it("throws on invalid token", () => {
    expect(() => verifyAccessToken("invalid.token.here")).toThrow();
  });
});

describe("otp utils", () => {
  it("generates 6-digit code", () => {
    for (let i = 0; i < 20; i++) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it("hashes and verifies", () => {
    const code = "123456";
    const hash = hashOtp(code);
    expect(hash).toBeTruthy();
    expect(hash).not.toBe(code);
    expect(verifyOtpHash(code, hash)).toBe(true);
    expect(verifyOtpHash("654321", hash)).toBe(false);
  });
});

describe("ApiError", () => {
  it("constructs with statusCode and message", () => {
    const e = new ApiError(400, "Bad");
    expect(e.statusCode).toBe(400);
    expect(e.message).toBe("Bad");
    expect(e.isOperational).toBe(true);
  });

  it("has factory methods", () => {
    expect(ApiError.badRequest("X").statusCode).toBe(400);
    expect(ApiError.unauthorized().statusCode).toBe(401);
    expect(ApiError.forbidden().statusCode).toBe(403);
    expect(ApiError.notFound().statusCode).toBe(404);
    expect(ApiError.conflict("X").statusCode).toBe(409);
    expect(ApiError.internal().statusCode).toBe(500);
  });
});
