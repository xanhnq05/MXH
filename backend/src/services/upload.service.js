// Upload service — đẩy file lên Supabase Storage qua S3-compatible API.
// Trả về public URL + storageKey.

import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET, buildPublicUrl } from "../configs/supabase.config.js";
import { ApiError } from "../utils/ApiError.js";

const buildPath = (folder, userId, originalName) => {
  const ext = (originalName || "").split(".").pop()?.toLowerCase() || "bin";
  const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : "bin";
  const random = Math.random().toString(36).slice(2, 10);
  const ts = Date.now();
  return `${folder}/${userId}/${ts}_${random}.${safeExt}`;
};

export const uploadService = {
  /**
   * Upload 1 file (Buffer từ multer) lên Supabase Storage qua S3 API.
   * @returns {{url: string, key: string, size: number, mimeType: string}}
   */
  async uploadFile({ buffer, originalName, mimetype, folder, userId }) {
    if (!buffer) throw ApiError.badRequest("Thiếu file");
    const key = buildPath(folder, userId, originalName);

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: buffer,
          ContentType: mimetype,
          CacheControl: "3600",
        })
      );
    } catch (err) {
      console.error("S3 upload error:", err);
      throw new ApiError(500, "Upload thất bại: " + (err.message || err.name));
    }

    return {
      url: buildPublicUrl(key),
      key,
      size: buffer.length,
      mimeType: mimetype,
    };
  },

  /** Upload nhiều file cùng lúc */
  async uploadMany({ files, folder, userId }) {
    if (!files || !files.length) return [];
    return Promise.all(
      files.map((f) =>
        this.uploadFile({
          buffer: f.buffer,
          originalName: f.originalname,
          mimetype: f.mimetype,
          folder,
          userId,
        })
      )
    );
  },

  /** Xoá file theo storageKey */
  async deleteFile(storageKey) {
    if (!storageKey) return;
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: BUCKET,
          Key: storageKey,
        })
      );
    } catch (err) {
      console.warn("S3 delete warning:", err.message || err.name);
    }
  },

  /** Sinh signed URL (cho media riêng tư, mặc định 7 ngày) */
  async getSignedUrl(storageKey, expiresIn = 60 * 60 * 24 * 7) {
    try {
      const cmd = new GetObjectCommand({
        Bucket: BUCKET,
        Key: storageKey,
      });
      return await getSignedUrl(s3, cmd, { expiresIn });
    } catch (err) {
      throw new ApiError(500, "Không tạo được signed URL: " + (err.message || err.name));
    }
  },
};
