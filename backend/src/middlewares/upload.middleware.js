// Upload file dùng multer (memory storage) — server nhận Buffer rồi đẩy lên Supabase.
import multer from "multer";

const MAX_SIZE_MB = 50; // 50MB

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Mặc định chấp nhận ảnh + video + audio
  const ok = /^(image|video|audio)\//.test(file.mimetype);
  if (!ok) {
    return cb(new Error(`Loại file không được hỗ trợ: ${file.mimetype}`));
  }
  cb(null, true);
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
});
