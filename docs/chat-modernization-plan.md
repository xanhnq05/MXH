# Chat Modernization Plan — MXH

> Source of truth cho đợt hiện đại hóa Chat + Sticker/GIF tự host + Admin Media.
> Cập nhật: 2026-10-16
> Branch: `main`
> Working tree sạch (chỉ có `prompt_cursor_mxh_chat.md` untracked)

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
| Database | MongoDB Atlas, models: User, Conversation, Message, StickerPack, Notification, ...        |

### Trạng thái build/test baseline (chạy 2026-10-16)

| Lệnh                         | Kết quả                  |
|------------------------------|--------------------------|
| `npm test` (backend)         | 40/40 PASS               |
| `npm test` (frontend)        | 14/14 PASS               |
| `npm run build` (frontend)   | OK (chunk-size warning)  |
| `npm run lint` (frontend)    | **FAIL** — missing `eslint.config.js` (pre-existing) |
| `node --check src/server.js` | OK                       |

### Bảng tính năng chat hiện trạng

| Tính năng                                  | Trạng thái              | Bằng chứng                                                                 |
|--------------------------------------------|-------------------------|----------------------------------------------------------------------------|
| Inbox list (conversation)                  | hoạt động một phần      | `ChatPage.tsx:108-185`; thiếu unread badge, online dot, overflow menu      |
| Conversation panel                         | hoạt động một phần      | `ChatPage.tsx:189-300`; chỉ chat 1-1/group cơ bản; header dùyệt call    |
| Send text qua socket                       | hoạt động               | `useChatStore.ts:73-83`, `socket.js` (chưa thấy `message:send` handler)  |
| Send file/image qua upload HTTP            | hoạt động một phần      | `message.service.js:130-160`; `uploadMiddleware` chỉ chấp nhận image/video/audio |
| Gửi sticker                                | UI có, gửi qua socket   | `MessageInput.tsx:84-95`; StickerPicker có; backend `StickerPack`         |
| Gợi ý GIF khi gõ                          | hoạt động               | `useGifSuggest.ts`; `gif.route.js` đọc `trending.json` (URL Giphy)         |
| Reply message                              | hoạt động               | `MessageBubble.tsx:99-122`; `MessageInput.tsx:170-200`                    |
| Delete message                             | hoạt động               | `MessageBubble.tsx:51-58`; `message.service.js:191-202` (soft delete)     |
| E2EE thực tế trong luồng gửi              | chưa tích hợp           | `e2ee.ts` có helper, `MessageInput.tsx:60-70` gửi plaintext               |
| Phát hiện double-upload / double-message   | đang có nguy cơ         | `MessageInput.tsx:118-135` upload rồi mới gửi payload → có thể tạo 2 msg  |
| Hỗ trợ PDF/DOCX/zip upload                | không hoạt động         | `upload.middleware.js:9-15` chỉ chấp nhận `image|video|audio`             |
| Sticker admin upload                       | không có                 | `sticker.route.js` chỉ có read/search                                     |
| GIF admin upload                           | không có                 | `gif.route.js` đọc JSON tĩnh                                              |
| RBAC admin (middleware)                    | không có                 | `auth.middleware.js` chỉ verify token, không kiểm tra role                |
| Rate limit cho sticker/GIF                 | không có                 | `rateLimit.middleware.js` chỉ là global apiLimiter                        |
| Last seen hiển thị                         | có data, chưa render    | `socket.js:55-65,155-165` cập nhật; UI chỉ hiện "online/offline"        |
| Read receipt chi tiết                       | một phần                | `message.service.js:38-58`; UI chưa hiện ✓✓                              |
| Group settings UI                           | một phần                | `GroupSettingsPage.tsx` có; tích hợp call & mute                          |
| Trending GIF URL Giphy external            | đang dùng               | `trending.json` chứa `https://media.giphy.com/...`                        |

### Ngoài phạm vi (giữ nguyên)

- Call (WebRTC, signaling, call UI) — không redesign, chỉ bảo toàn logic.
- Post / feed / like / comment — không sửa.
- Auth/OTP/profile/friend/notification — chỉ thay đổi tối thiểu nếu cần.
- E2EE: không thay thế cơ chế; có thể tích hợp encrypt text sau (ngoại trừ caller bắt buộc giữ nguyên).

### Risks / blockers

- Thiếu `eslint.config.js` (pre-existing) — không cản build; sẽ chừa lại như pre-existing.
- Supabase env có thể không được cấu hình thật ở local — test sẽ dùng mock upload; `BLOCKED BY ENV` đối với storage thật.
- MongoDB Atlas có thể không reachable — đã chạy thành công qua cluster test, baseline OK.

---

## Phase 1 — Design System ✅

- Đã đọc `SKILL.md` của ui-ux-pro-max.
- Đã chạy `--design-system` với query `social messaging web app warm orange brand modern minimal`.
- Đã persist `design-system/mxh-chat/MASTER.md` + override `design-system/mxh-chat/pages/chat.md` (giữ cam làm primary, neutral surface).
- Có ưu tiên: giữ brand cam, không dùng blue từ MASTER; glassmorphism chỉ dùng cho dialog/picker overlay; tránh dark-by-default.

---

## Phase 2 — Redesign chat UI

Các mục sẽ làm:

- [ ] Tách `ChatPage` thành các sub-component: `InboxList`, `ChatHeader`, `MessageList`, `MessageComposer`, `ChatEmpty`.
- [ ] Thêm unread badge, online dot, last seen HH:mm, mute indicator, typing indicator.
- [ ] Composer gọn: 1 input + 1 nút send; action phụ gom vào nút `+` (paperclip menu) và icon emoji + sticker + GIF.
- [ ] Skeleton / empty / error states cho cả inbox, message list, header.
- [ ] Responsive 375 / 768 / 1024 / 1440: mobile chỉ hiện 1 panel; tablet thu sidebar; desktop 2 panel + optional details.
- [ ] Auto-scroll thông minh: chỉ auto-scroll khi user gần cuối.

---

## Phase 3 — Chat text/file/image end-to-end

- [ ] Trace `composer → useChatStore → socket:message:send → messageService.send → emitToConversation`.
- [ ] Fix `message:send` socket handler (hiện `socket.js` chưa có handler này).
- [ ] Sửa upload flow: `MessageInput.handleFileChange` gọi upload rồi gọi lại `onSend` → tạo 2 message. Sửa để chỉ gửi 1 message thông qua socket/upload endpoint thống nhất.
- [ ] Mở rộng `upload.middleware.js` whitelist: image (jpeg/png/webp/gif), video, audio, PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, CSV, ZIP.
- [ ] Giữ contract backend ↔ frontend; update test nếu cần.

---

## Phase 4 — Sticker/GIF schema + self-hosted storage

- [ ] Thêm model `MediaAsset` (gộp sticker + gif) với `mediaType`, `category`, `tags`, `keywords`, `synonyms`, `phrases`, `language`, `isActive`, `priority`, `storageKey`, `url`, `mimeType`, `fileSize`, `thumbnailUrl`.
- [ ] Seed tối thiểu 1 GIF/sticker asset để test.
- [ ] `trending.json` (Giphy) đánh dấu legacy, không trả về trong suggestion production.
- [ ] Endpoint search `/api/media/search` ranking theo phrase > tag/keyword > synonym > name.

---

## Phase 5 — Admin media management

- [ ] Middleware `adminOnly` cho route admin (`/api/admin/media/*`).
- [ ] Allowlist admin qua env `ADMIN_EMAILS` (CSV) hoặc `ADMIN_USER_IDS`.
- [ ] CRUD endpoints: list, get, create (upload), update (metadata), toggle active, soft delete, hard delete.
- [ ] Frontend admin page `/admin/media` (chỉ admin thấy): list/table, search, filter, upload form, edit dialog.
- [ ] Chip input cho tags/keywords/synonyms.

---

## Phase 6 — Relevance suggestions + anti-spam

- [ ] `useGifSuggest` dùng `/api/media/search?q=`, giữ debounce 300ms, min 2 ký tự, cancel race.
- [ ] Backend: rate limit sticker/GIF chung cho HTTP + socket; mặc định 5 media / 30s / user; cooldown 1s.
- [ ] Frontend: khoá double-click khi sending, 429 toast khi server reject.
- [ ] Tài liệu hoá: nếu in-memory thì note multi-instance limitation.

---

## Phase 7 — Test, build, regression, polish

- [ ] `npm test` (backend + frontend) PASS.
- [ ] `npm run build` (frontend) PASS.
- [ ] Manual responsive checks ghi lại ở docs.
- [ ] E2E test bổ sung cho upload file types, sticker/GIF search, admin 401/403.
- [ ] Ghi `BLOCKED BY ENV` cho phần cần Supabase/Mongo thật.

---

## Phase 8 — Tài liệu và bàn giao

- [ ] Cập nhật `docs/chat-modernization-plan.md` (file này) với kết quả thực tế.
- [ ] Cập nhật `backend/src/plan.md` và `frontend/src/plan.md` (không xoá thông tin cũ).
- [ ] Tóm tắt file thay đổi, API/schema mới, test commands, setup admin cần user làm thủ công.

---

## Trạng thái phase

| Phase | Trạng thái | Ghi chú |
|-------|-----------|---------|
| 0     | DONE       | Audit + baseline pass |
| 1     | DONE       | Design system persisted + override |
| 2     | TODO       | Redesign chat UI |
| 3     | TODO       | Text/file/image end-to-end |
| 4     | TODO       | Sticker/GIF self-hosted schema |
| 5     | TODO       | Admin media management |
| 6     | TODO       | Suggestions + anti-spam |
| 7     | TODO       | Test/build/regression |
| 8     | TODO       | Docs + handover |
