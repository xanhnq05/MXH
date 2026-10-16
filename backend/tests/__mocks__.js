// Mock mail + upload service cho test
import { jest } from "@jest/globals";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "..", "src");

jest.mock(path.join(SRC, "services", "mail.service.js"), () => ({
  mailService: {
    sendOtp: jest.fn(async () => ({ messageId: "mock" })),
    sendGeneric: jest.fn(async () => ({ messageId: "mock" })),
  },
}));

jest.mock(path.join(SRC, "services", "upload.service.js"), () => ({
  uploadService: {
    uploadFile: jest.fn(async ({ originalName }) => ({
      url: `https://test.supabase.co/mock/${Date.now()}_${originalName}`,
      key: `mock/${Date.now()}_${originalName}`,
      size: 1024,
      mimeType: "image/jpeg",
    })),
    uploadMany: jest.fn(async ({ files }) =>
      (files || []).map((f, i) => ({
        url: `https://test.supabase.co/mock/${i}_${f.originalname}`,
        key: `mock/${i}_${f.originalname}`,
        size: 1024,
        mimeType: f.mimetype,
      }))
    ),
    deleteFile: jest.fn(async () => {}),
    getSignedUrl: jest.fn(async () => "https://test.supabase.co/signed"),
  },
}));
