// Rate limit cho media message (sticker, GIF) — chống spam.
// Mặc định: tối đa 5 media / 30s / user, cooldown 1s giữa 2 lần gửi.
// Dùng in-memory Map. Khi scale multi-instance cần chuyển sang Redis (đã note trong plan).

const WINDOW_MS = 30 * 1000; // 30 giây
const MAX_IN_WINDOW = 5; // tối đa 5 sticker/GIF trong 30s
const COOLDOWN_MS = 1000; // 1s cooldown giữa 2 lần

// userId -> timestamps[] (các lần gửi sticker/GIF trong window)
const userTimestamps = new Map();

// userId -> lastSentAt
const userLastSent = new Map();

/**
 * @param {string} userId
 * @returns {{ allowed: boolean, retryAfterMs?: number, reason?: string }}
 */
export const checkMediaRateLimit = (userId) => {
  const now = Date.now();

  // Cooldown
  const last = userLastSent.get(userId);
  if (last && now - last < COOLDOWN_MS) {
    return {
      allowed: false,
      retryAfterMs: COOLDOWN_MS - (now - last),
      reason: "Vui lòng chờ một chút trước khi gửi sticker/GIF tiếp.",
    };
  }

  // Window
  const arr = userTimestamps.get(userId) || [];
  // Loại bỏ timestamp cũ ngoài window
  const recent = arr.filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_IN_WINDOW) {
    const retryAfterMs = WINDOW_MS - (now - recent[0]);
    return {
      allowed: false,
      retryAfterMs,
      reason: "Bạn đã gửi quá nhiều sticker/GIF. Vui lòng chờ.",
    };
  }

  // Accept
  recent.push(now);
  userTimestamps.set(userId, recent);
  userLastSent.set(userId, now);
  return { allowed: true };
};

/** Test helper — reset state */
export const _resetMediaRateLimit = () => {
  userTimestamps.clear();
  userLastSent.clear();
};
