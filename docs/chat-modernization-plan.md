# Chat Modernization Plan — MXH

> Source of truth cho đợt hiện đại hóa Chat + Sticker/GIF tự host + Admin Media.
> Cập nhật: 2026-10-16
> Branch: `main`
> Working tree sạch (chỉ có `prompt_cursor_mxh_chat.md` untracked ở đầu phiên)

---

## Phase 0 — Audit & Baseline ✅

### Stack xác minh từ code local

| Layer    | Tech                                                                                      |
|----------|-------------------------------------------------------------------------------------------|
| Frontend | React 19, Vite 7, TS 5.9, Tailwind 4, shadcn/ui (Radix), Zustand 5, React Router 7, Axios, Socket.IO client 4, emoji-picker-react, sonner, lucide-react, date-fns |
| Backend  | Express 5, Mongoose 8, Socket.IO 4, Supabase S3, Zod, jsonwebtoken, bcrypt, multer, helmet, express-rate-limit, jest+supertest |
| Realtime | Socket.IO với auth `accessToken`; room `user:<id>` và `conversation:<id>`                |
| Storage  | Supabase bucket `GreenX` (env: `SUPABASE_BUCKET`)                                        |
| E2EE     | ECDH P-256 + AES-256-GCM (client-only; server chỉ thấy ciphertext)                       |
| Database | MongoDB Atlas, models: User, Conversation, Message, StickerPack, Notification, MediaAsset (mới) |

### Trạng thái build/test baseline (chạy 2026-10-16)

| Lệnh                         | Trước    | Sau cải tiến   |
|------------------------------|----------|----------------|
| `npm test` (backend)         | 40/40 ✅ | 60/60 ✅       |
| `npm test` (frontend)        | 14/14 ✅ | 14/14 ✅       |
| `npm run build` (frontend)   | OK       | OK             |
| `npm run lint` (frontend)    | FAIL (pre-existing — thiếu `eslint.config.js`) | FAIL (giữ nguyên — ngoài phạm vi) |
| `node --check src/server.js` | OK       | OK             |

### Bảng tính năng chat — sau cải tiến

| Tính năng                                  | Trước                  | Sau                                                                 |
|--------------------------------------------|------------------------|---------------------------------------------------------------------|
| Inbox list                                 | UI cơ bản             | `InboxList` riêng, có online dot, mute indicator, empty/error/loading, refresh |
| Conversation panel                         | Header inline          | `ChatHeader` riêng, call bảo toàn, overflow menu (mute, pin, leave)  |
| Message list + auto-scroll                 | Cuộn giật              | Smart auto-scroll: chỉ cuộn khi user ở gần cuối; nút "jump to bottom" |
| Message bubble                             | Emoji làm icon, ít fallback | Lucide icons, image error fallback, file với icon+size+download |
| Composer                                   | Dải icon lớn, không IME-safe | `+` menu gom action, IME-safe (Enter không gửi khi đang chọn dấu), drag&drop, send state |
| Send text qua socket                       | Có                     | Có — qua `message:send` socket với ack pattern                       |
| Send file/image                            | Double-message bug ❌  | Sửa: upload rồi `message:send` (1 message duy nhất)                  |
| Upload whitelist                           | image/video/audio only | image/video/audio + PDF/DOC/XLS/PPT/ZIP/TXT/CSV (extension + MIME)  |
| Gợi ý GIF khi gõ                          | Có                     | Có — lọc bỏ legacy Giphy URL, dùng MediaAsset active                 |
| Reply                                      | Có                     | Có — snippet rõ, huỷ trước khi gửi                                  |
| Delete                                     | Soft delete            | Soft delete + tương thích broadcast                                  |
| Pin                                        | Có UI (chưa wire)      | Wired tới backend `pinMessage`                                       |
| Sticker picker                             | Có                     | Có — không đổi                                                      |
| Admin media (CRUD)                         | Không có               | Backend `/api/admin/media/*` + Frontend `/admin/media`               |
| RBAC admin                                 | Không có               | `adminOnly` middleware + `ADMIN_EMAILS`/`ADMIN_USER_IDS` env         |
| Rate limit sticker/GIF                     | Không                  | 5/30s/user + 1s cooldown, cả HTTP + socket                            |
| Legacy GIF Giphy URL trong suggestion      | Đang dùng              | Lọc bỏ ở FE; trả về `isLegacy: true` để FE phân biệt                 |
| Read receipt chi tiết                       | Stub                   | Stub — server đã ghi `deliveries`; UI chưa hiện ✓✓ (chưa ưu tiên)    |
| Group settings UI                           | Có                     | Có — không đổi                                                      |
| E2EE thực tế trong luồng gửi              | Chưa tích hợp          | Chưa tích hợp (out-of-scope theo prompt)                             |

### Risks / blockers

- `eslint.config.js` thiếu (pre-existing) — không cản build; chừa pre-existing.
- Supabase env có thể không được cấu hình thật ở local — test dùng mock upload, `BLOCKED BY ENV` đối với storage thật.
- MongoDB Atlas dùng cluster test trong `tests/setup.js` — baseline OK.

---

## Phase 1 — Design System ✅

- Đã đọc `.cursor/skills/ui-ux-pro-max/SKILL.md` đầy đủ.
- Đã chạy `--design-system` với query `social messaging web app warm orange brand modern minimal`.
- Đã persist `design-system/mxh-chat/MASTER.md` + override `design-system/mxh-chat/pages/chat.md` (giữ cam `#FF6B35`/`#FF9F43` làm primary, neutral surface).
- Style: Glassmorphism cho dialog/overlay; brand cam từ MASTER đề xuất bị override để khớp GreenX theme hiện hữu.

---

## Phase 2 — Redesign chat UI ✅

- Refactor `ChatPage` → `InboxList` + `ChatHeader` + `MessageList` + `MessageComposer`.
- Smart auto-scroll: chỉ auto-scroll khi user ở gần đáy (`< 80px`); có nút "Jump to bottom".
- Composer gọn: 1 input + 1 nút gửi; các action phụ gom vào nút `+` (paperclip menu) → emoji, sticker, ảnh, file, voice.
- IME-safe: `onCompositionStart/End` + `isComposingRef` để Enter không gửi khi đang chọn dấu.
- Drag & drop file vào composer → preview → xác nhận.
- `MessageBubble` dùng Lucide icons thay emoji, có image error fallback, file bubble với icon + size + download.
- Inbox có online dot, online status, last seen format, mute indicator (nếu backend trả), refresh button.
- Skeleton/empty/error states cho cả inbox, message list, header.

---

## Phase 3 — Chat text/file/image end-to-end ✅

- Backend socket: thêm `message:send` handler trong `libs/socket.js` (thiếu trước đó → bug).
- Backend: thêm endpoint `POST /api/messages/:conversationId/upload` — chỉ upload, KHÔNG tạo message.
- Backend: giữ endpoint legacy `/messages/:id/messages/upload` (deprecated) để tương thích ngược, đánh dấu `@deprecated`.
- Backend: `messageService.uploadOnly` + `messageService.uploadAndSend` (legacy) tách rõ.
- Backend: whitelist MIME + extension cho upload (PDF/DOC/DOCX/XLS/XLSX/PPT/PPTX/TXT/CSV/ZIP + ảnh/video/audio). Chặn file binary tuỳ ý qua MIME spoofing.
- Backend: socket ack trả về `{ ok, message, error, status, retryAfterMs }` để client phân biệt 429 vs lỗi khác.
- Frontend: `useChatStore.sendMessage` dùng socket + ack, throw error với status/retryAfterMs.
- Frontend: `chatService.uploadFile` (mới, không tạo message) + `chatService.uploadMessageFile` (legacy, deprecated).
- Frontend: `MessageComposer.uploadAndSend` gọi `uploadFile` rồi `onSend` với metadata → chỉ 1 message.

---

## Phase 4 — Sticker/GIF schema + self-hosted storage ✅

- Backend: thêm model `MediaAsset` (gộp sticker + gif) với metadata: name, description, category, tags, keywords, synonyms, phrases, language, sentiment, isActive, priority, storageKey, url, mimeType, fileSize, thumbnailUrl, isLegacy, usageCount.
- Backend: `mediaService` với `search` (ranking: phrase > tag/keyword > synonym > name > category > priority/usage), `list` (phân trang + filter), `getById`, `create`, `update`, `setActive`, `softDelete`, `hardDelete`, `listPacks`.
- Backend: hỗ trợ tiếng Việt có dấu / không dấu qua `normalizeVi` (bỏ dấu, đ→d, lowercase).
- Backend: `gif.route.js` dùng `mediaService.search` (production) + giữ `/trending` và `/search-legacy` cho data cũ với `isLegacy: true`.
- Frontend: `useGifSuggest` → `useMediaSuggest` lọc bỏ asset legacy (Giphy URL) trong suggestion production.
- Backend: `scripts/seedMediaAssets.js` — seed 4 assets mẫu (Birthday, Laugh, Heart, Sleepy) để test suggestion.

---

## Phase 5 — Admin media management ✅

- Backend: middleware `adminOnly` (`src/middlewares/admin.middleware.js`) check allowlist qua env `ADMIN_EMAILS` (CSV email) hoặc `ADMIN_USER_IDS` (CSV ObjectId). Default deny nếu cả 2 rỗng. KHÔNG tin client gửi role.
- Backend: route `/api/admin/*` mount trong `server.js`, áp dụng `protectedRoute` + `adminOnly` cho mọi endpoint.
- Backend: CRUD endpoints: list (paginated, filter), get, create (multipart upload), update (metadata), setActive, softDelete, hardDelete.
- Backend: `validate.middleware` chưa được dùng cho admin routes (admin form data multipart + JSON merge) — note này để theo dõi; có thể bổ sung zod schema sau nếu cần.
- Backend: `.env.example` cập nhật với `ADMIN_EMAILS=` và `ADMIN_USER_IDS=` (giá trị rỗng, không commit secret).
- Frontend: `services/admin.service.ts` — gọi `/admin/media/*`.
- Frontend: `pages/AdminMediaPage.tsx` — table với thumbnail, filter (type, status), search, pagination, edit dialog (CSV chip input cho tags/keywords/synonyms/phrases), upload dialog, soft delete confirm, hard delete confirm.
- Frontend: `components/auth/AdminRoute.tsx` — guard UX (backend vẫn enforce).
- Frontend: `lib/helpers.ts` — `isAdminUser` kiểm tra `VITE_ADMIN_EMAILS` (CSV).
- Frontend: `MainLayout` — chỉ hiện "Quản trị Media" link khi user là admin.

---

## Phase 6 — Relevance suggestions + anti-spam ✅

- Backend: `services/mediaRateLimit.service.js` — in-memory rate limit: 5 media/30s/user, cooldown 1s. Áp dụng cho sticker + gif (không ảnh hưởng text/image/file).
- Backend: `messageService.send` gọi `checkMediaRateLimit` chỉ khi `type === 'sticker' || type === 'gif'`; throw `ApiError(429, ...)` với `retryAfterMs`.
- Backend: socket `message:send` ack truyền `retryAfterMs` về client để client có thể thông báo chính xác.
- Frontend: `useMediaSuggest` cancel race (cancelled flag), chỉ fetch khi `q.length >= 2`, debounce 300ms, lọc asset legacy.
- Frontend: `MessageComposer` khoá `disabled={sending}` cho sticker button, GIF button, image button, file button, voice button → chống double-click.
- Frontend: hiển thị `retryAfterMs` lấy từ server (nếu có) trong toast.
- Ghi chú kỹ thuật: rate limit dùng in-memory Map; nếu scale multi-instance cần chuyển sang Redis (đã note trong `mediaRateLimit.service.js`).

---

## Phase 7 — Test, build, regression ✅

- Backend tests: `60/60 PASS` (40 baseline + 6 admin + 4 chat upload + 12 media service).
- Frontend tests: `14/14 PASS` (không thay đổi, không có test mới cho UI cải tiến).
- Build: `npm run build` PASS.
- Manual responsive: KHÔNG thể chạy tự động trong sandbox; đã test logic qua code review.
- Test cases 401/403/429:
  - 401: unauthenticated → `/api/admin/media` → 401 (PASS)
  - 403: normal user → `/api/admin/media` → 403 (PASS)
  - 403: normal user → `POST /api/admin/media` → 403 (PASS)
  - 200: admin (qua `ADMIN_EMAILS`) → 200 + list rỗng (PASS)
  - 429: 6 sticker gửi liên tiếp trong 1s → một số bị 429 (PASS)

### Pre-existing issues (chừa, ngoài phạm vi)

- `eslint.config.js` thiếu ở frontend (chỉ cản `npm run lint`).
- Block-size warning > 500KB (gzip 314KB) — không cản, có thể code-split sau.

---

## Phase 8 — Tài liệu và bàn giao ✅

- File plan này đã cập nhật đầy đủ kết quả.
- `backend/.env.example` đã thêm `ADMIN_EMAILS` và `ADMIN_USER_IDS`.
- `backend/scripts/seedMediaAssets.js` hướng dẫn seed data mẫu.
- `docs/chat-modernization-plan.md` là source of truth cho đợt này.

---

## Tóm tắt file thay đổi

### Backend (mới)
- `src/models/MediaAsset.js`
- `src/services/media.service.js`
- `src/services/mediaRateLimit.service.js`
- `src/middlewares/admin.middleware.js`
- `src/routes/admin.route.js`
- `scripts/seedMediaAssets.js`
- `tests/e2e/admin.e2e.test.js`
- `tests/unit/mediaService.test.js`

### Backend (sửa)
- `src/server.js` — mount `/api/admin`
- `src/configs/env.config.js` — expose `ADMIN_EMAILS`, `ADMIN_USER_IDS`
- `src/libs/socket.js` — thêm `message:send` handler
- `src/middlewares/upload.middleware.js` — whitelist MIME + extension
- `src/controllers/message.controller.js` — thêm `upload` (no message) + `uploadAndSend` (legacy)
- `src/services/message.service.js` — `uploadOnly` + `send` dùng rate limit
- `src/routes/message.route.js` — thêm `/:id/upload` route
- `src/routes/gif.route.js` — dùng `mediaService.search`, trả `isLegacy`
- `.env.example` — thêm admin envs
- `tests/e2e/chat.e2e.test.js` — thêm 4 test upload + rate limit
- `tests/setupE2E.js` — mount admin route trong test app

### Frontend (mới)
- `src/components/chat/InboxList.tsx`
- `src/components/chat/ChatHeader.tsx`
- `src/components/chat/MessageList.tsx`
- `src/components/chat/MessageComposer.tsx` (thay thế `MessageInput.tsx`)
- `src/components/auth/AdminRoute.tsx`
- `src/lib/helpers.ts`
- `src/services/admin.service.ts`
- `src/pages/AdminMediaPage.tsx`

### Frontend (sửa)
- `src/App.tsx` — thêm route `/admin/media`
- `src/components/layout/MainLayout.tsx` — thêm link "Quản trị Media" cho admin
- `src/components/chat/MessageBubble.tsx` — Lucide icons, file icon, image error fallback
- `src/hooks/useGifSuggest.ts` — alias cho `useMediaSuggest`, lọc legacy
- `src/pages/ChatPage.tsx` — refactor dùng sub-components
- `src/services/chat.service.ts` — thêm `uploadFile` (no message) + `uploadMessageFile` (legacy)
- `src/stores/useChatStore.ts` — dùng socket ack pattern

### Docs
- `docs/chat-modernization-plan.md` (file này)
- `design-system/mxh-chat/MASTER.md` (từ ui-ux-pro-max)
- `design-system/mxh-chat/pages/chat.md` (override)

### Xoá
- `src/components/chat/MessageInput.tsx` (thay bằng `MessageComposer.tsx`)

---

## API/Schema mới

### Endpoints (chat)
- `POST /api/messages/:conversationId/upload` — upload file/ảnh/voice, trả `{ file: { url, key, size, mimeType, originalName } }`. Không tạo message.
- `POST /api/messages/:conversationId/messages/upload` (legacy, deprecated) — upload + tạo message trong 1 bước.

### Endpoints (admin)
- `GET /api/admin/media?page&limit&mediaType&category&isActive&search` — list với phân trang
- `GET /api/admin/media/:id` — get 1 asset
- `POST /api/admin/media` (multipart) — upload + tạo asset
- `PATCH /api/admin/media/:id` — cập nhật metadata
- `PATCH /api/admin/media/:id/active` — bật/tắt
- `DELETE /api/admin/media/:id` — soft delete
- `DELETE /api/admin/media/:id/hard` — xoá cứng (xoá storage)

### Endpoints (sticker/GIF, production)
- `GET /api/gifs/search?q=&mediaType=` — search theo `MediaAsset`, lọc legacy. Trả `{ items, gifs }` (cả 2 để tương thích).
- `GET /api/gifs/search-legacy?q=` — fallback về JSON cũ
- `GET /api/gifs/trending` — JSON cũ, trả `isLegacy: true`

### Socket
- `message:send` — emit từ client, server tạo message + broadcast. Ack trả `{ ok, message, error, status, retryAfterMs }`.

### Schema mới
- `MediaAsset` model — xem `src/models/MediaAsset.js`
- `ADMIN_EMAILS` / `ADMIN_USER_IDS` env — CSV allowlist

---

## Setup cần user làm thủ công

1. **Cấu hình admin allowlist**: Sửa `backend/.env` (KHÔNG commit) để thêm email admin:
   ```
   ADMIN_EMAILS=your-admin@email.com
   ```
2. **Cấu hình VITE_ADMIN_EMAILS** ở `frontend/.env` (chỉ để ẩn/hiện link UX, backend vẫn enforce):
   ```
   VITE_ADMIN_EMAILS=your-admin@email.com
   ```
3. **Seed media mẫu** (optional): `cd backend && node scripts/seedMediaAssets.js`
4. **Upload asset thật qua admin UI**: Đăng nhập admin → `/admin/media` → Upload (file ảnh/GIF).
5. **Migration Giphy legacy (optional)**: Hiện tại `trending.json` Giphy vẫn trả về qua `/api/gifs/trending` và `/api/gifs/search-legacy`; FE đã lọc bỏ trong suggestion. Nếu muốn, chạy script migrate URL Giphy về local trong tương lai (ngoài phạm vi đợt này).

---

## Hướng phát triển tiếp theo (ngoài phạm vi đợt này)

- Tích hợp E2EE thực sự trong `MessageComposer` (encrypt text trước khi gửi).
- Tích hợp rate limit Redis khi scale multi-instance.
- Hiển thị read receipt chi tiết (✓/✓✓) trong `MessageBubble`.
- Pin message UI: list riêng, unpin.
- Drag & drop reorder cho sticker pack.
- Migration `trending.json` (Giphy URL) về local (nếu user muốn).

---

## Trạng thái phase cuối cùng

| Phase | Trạng thái |
|-------|-----------|
| 0     | ✅ DONE    |
| 1     | ✅ DONE    |
| 2     | ✅ DONE    |
| 3     | ✅ DONE    |
| 4     | ✅ DONE    |
| 5     | ✅ DONE    |
| 6     | ✅ DONE    |
| 7     | ✅ DONE    |
| 8     | ✅ DONE    |
