// Upload service — đẩy file lên Supabase S3, trả về public URL + storageKey.

import { supabase, BUCKET } from "../configs/supabase.config.js";
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
   * Upload 1 file (Buffer từ multer).
   * @returns {{url: string, key: string, size: number, mimeType: string}}
   */
  async uploadFile({ buffer, originalName, mimetype, folder, userId }) {
    if (!buffer) throw ApiError.badRequest("Thiếu file");
    const path = buildPath(folder, userId, originalName);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: mimetype,
        upsert: false,
        cacheControl: "3600",
      });

    if (error) {
      console.error("Supabase upload error:", error);
      throw new ApiError(500, "Upload thất bại: " + error.message);
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return {
      url: pub.publicUrl,
      key: path,
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
    const { error } = await supabase.storage.from(BUCKET).remove([storageKey]);
    if (error) console.warn("Supabase delete warning:", error.message);
  },

  /** Sinh signed URL (cho media riêng tư, mặc định 7 ngày) */
  async getSignedUrl(storageKey, expiresIn = 60 * 60 * 24 * 7) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storageKey, expiresIn);
    if (error) throw new ApiError(500, "Không tạo được signed URL");
    return data.signedUrl;
  },
};
