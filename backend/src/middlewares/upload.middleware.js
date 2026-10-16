// Upload file dùng multer (memory storage) — server nhận Buffer rồi đẩy lên Supabase.
// Whitelist extension + MIME để chống MIME spoofing.
// Mặc định chấp nhận ảnh, video, audio, và một số tệp tài liệu phổ biến.

import multer from "multer";

export const MAX_SIZE_MB = 50; // 50MB

// Whitelist loại file được phép (cả MIME lẫn extension)
// Tài liệu được phép: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, CSV, ZIP
// Ảnh: JPEG, PNG, WEBP, GIF
// Video: MP4, WEBM, MOV
// Audio: MP3, WAV, OGG, M4A
const ALLOWED_MIME = [
  // image
  /^image\/(jpeg|png|webp|gif)$/,
  // video
  /^video\/(mp4|webm|quicktime|x-matroska)$/,
  // audio
  /^audio\/(mpeg|wav|ogg|mp4|x-m4a|aac)$/,
  // documents
  /^application\/pdf$/,
  /^application\/msword$/,
  /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/,
  /^application\/vnd\.ms-excel$/,
  /^application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet$/,
  /^application\/vnd\.ms-powerpoint$/,
  /^application\/vnd\.openxmlformats-officedocument\.presentationml\.presentation$/,
  /^application\/zip$/,
  /^application\/x-zip-compressed$/,
  /^text\/plain$/,
  /^text\/csv$/,
];

const ALLOWED_EXTS = new Set([
  "jpg", "jpeg", "png", "webp", "gif",
  "mp4", "webm", "mov", "mkv",
  "mp3", "wav", "ogg", "m4a", "aac",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "zip", "txt", "csv",
]);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const okMime = ALLOWED_MIME.some((re) => re.test(file.mimetype));
  const ext = (file.originalname || "").split(".").pop()?.toLowerCase();
  const okExt = !!ext && ALLOWED_EXTS.has(ext);
  if (!okMime && !okExt) {
    return cb(new Error(`Loại file không được hỗ trợ: ${file.mimetype} (.${ext || "?"})`));
  }
  cb(null, true);
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
});
