# MXH — Mở rộng: Post/Like/Comment/Group/Video/Reels + Cache + Queue

> Kế hoạch triển khai theo prompt `mở rộng.md` (Phase 0→6).
> Stack chốt: **Redis 7.x** (cache + rate-limit) + **BullMQ** (queue) + **ioredis** (client).
> Ngày tạo: 16/10/2026 — phiên làm việc với Cursor Agent.

---

## 0. Trạng thái tổng

| Phase | Trạng thái | Ghi chú |
|---|---|---|
| **0. Audit & baseline** | ✅ DONE | 72→83 files audited. |
| **Cache layer (Redis)** | ✅ DONE | `c3688ae` — libs/cache.js, lazy-connect, 60s feed cache. |
| **Queue (BullMQ)** | ✅ DONE (foundation) | `c3688ae` — libs/queue.js, 0 worker (chưa cần). |
| **2. Feed/Post/Like/Comment** | ✅ DONE | `b38f642` — idempotent like, comment cache, realtime emit. |
| **3. Group RBAC** | ✅ DONE | `b38f642` — transferOwnership, admin kick rules, owner leave safety. |
| **4. Video pipeline** | ⏳ TODO | Cần FFmpeg, transcoding, worker. |
| **5. Reels** | ⏳ TODO | Vertical feed UI + viewport lifecycle. |
| **6. Integration + regression** | ⏳ TODO | Full manual smoke. |

**Kết quả test: 94/94 backend + 14/14 frontend = 108/108 pass.**

## 0.1. Kết quả audit nhanh

### Có sẵn (đang hoạt động)
- Post model + CRUD + soft delete + visibility (`public/friends/private`)
- Like/Unlike qua 2 endpoint riêng (KHÔNG idempotent — Phase 2 sửa)
- Comment + reply (parentId, 1 cấp), pagination cursor
- Conversation + role (`owner/admin/member`), create/leave/add/remove/changeRole
- Socket.IO: auth middleware, room `user:<id>` và `conversation:<id>`, presence
- Supabase S3 upload, signed URL 7 ngày, MIME + ext whitelist
- Multer 50MB hard limit

### Thiếu / cần bổ sung
- **Redis**: chưa cài đặt. Cần `REDIS_URL` env, lazy-connect để không crash.
- **BullMQ**: mới cài. Cần worker process cho video + cleanup.
- **Video transcoding**: chưa có — cần FFmpeg hoặc cloud transcoder.
- **Reels view**: chưa có.
- **Transfer ownership riêng**: hiện `changeRole` mới hỗ trợ.
- **Cache layer**: chưa có — feed/friends/notifications đang query DB mỗi lần.
- **Optimistic UI**: HomePage đã có like optimistic, cần mở rộng cho comment.
- **Idempotency key**: chưa có cho like/comment.

### Không ngoài phạm vi
- ❌ Page / fanpage / Page admin
- ❌ Quảng cáo / boost
- ❌ Livestream
- ❌ Thay đổi auth/OTP/E2EE ngoài tối thiểu

### BLOCKED cần giải quyết
- ⚠️ **Redis server**: chưa có trên máy local. Em sẽ code **lazy-connect** (không crash nếu Redis down) và hướng dẫn user cài Redis (Docker / WSL2 / native Windows) trong README.

---

## 1. Kiến trúc Cache + Queue

### 1.1 Cache layer

- **Helper**: `backend/src/libs/cache.js` — wrap ioredis, expose `get/set/del/keys/incr/expire`.
- **Pattern**: Read-through cache. Mỗi read endpoint có helper:
  - `cache.wrap(key, ttl, fn)` — lấy cache, nếu miss thì gọi `fn()` rồi set.
- **Cache keys** (TTL theo độ nóng):
  - `feed:user:<id>:cursor:<cursor>` — 60s
  - `user:profile:<id>` — 5 phút
  - `friends:list:<id>` — 60s
  - `notifications:unread:<id>` — 15s
  - `stickers:pack:<key>` — 1 giờ
  - `gif:trending` — 5 phút
- **Invalidation**: write action (post/like/comment) → xóa `feed:user:*` của subscribers.

### 1.2 Queue (BullMQ)

- **Worker process**: `backend/src/workers/index.js` — chạy tách backend.
- **Queues**:
  - `video.process` — transcode video 720p + thumbnail.
  - `video.cleanup` — xóa file tạm, object mồ côi.
  - `notification.push` — gửi notification batch (qua Socket.IO, không cần queue nếu sync OK).
- **Lưu ý deploy**: dev chạy inline; prod cần `node src/workers/index.js` làm service riêng.

---

## 2. Test plan

| Phase | Test phải pass |
|---|---|
| Cache | 60/60 backend + cache.js unit test |
| Queue | Worker boot test + enqueue/process test |
| Phase 2 | Like idempotent, comment soft delete, feed cache hit |
| Phase 3 | Group RBAC matrix (HTTP + Socket) |
| Phase 4 | 50MB boundary, 2min boundary, transcoding success/fail |
| Phase 5 | Reels scroll, viewport autoplay pause, socket broadcast |
| Phase 6 | Full suite + manual smoke |

---

## 3. Cập nhật tiến độ

Khi làm xong từng phase, cập nhật bảng trên với commit hash, số test pass/fail, file thay đổi.
