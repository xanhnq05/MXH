# 📋 PLAN TỔNG THỂ DỰ ÁN MXH

> File này là **Nguồn sự thật (Source of Truth)** cho cả dự án.
> Mỗi khi bị mất context, AI agent sẽ đọc lại file này để tiếp tục.
> Cập nhật: 2026-10-16

---

## 0. Nguyên tắc chung

- **Vibecode 100%** — agent tự quyết các quyết định nhỏ; chỉ quay lại hỏi khi thật sự cần.
- **Stack cố định**: Backend = Express 5 + MongoDB (Mongoose 8) + Socket.IO + Supabase S3. Frontend = React 19 + Vite + TS + Tailwind 4 + shadcn/ui + Zustand + React Router 7 + Axios + Socket.IO client.
- **End-to-End encryption** cho chat: ECDH (P-256) sinh shared secret → AES-256-GCM. Server **không bao giờ** đọc được plaintext.
- **STT (self-to-self): phím tắt dùng trong file này**
  - CRUD = Create / Read / Update / Delete
  - MVP = phiên bản tối thiểu
  - Mongoose = thư viện MongoDB ODM

---

## 1. Cấu trúc thư mục Backend

```
MXH/backend/
├── package.json
├── .env                    # Cấu hình (đã có sẵn)
├── .env.example            # Mẫu để người khác clone
├── .gitignore
├── src/
│   ├── server.js           # Entry point
│   ├── configs/
│   │   ├── supabase.config.js
│   │   ├── mail.config.js
│   │   └── env.config.js
│   ├── libs/
│   │   ├── db.js
│   │   └── socket.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Session.js
│   │   ├── OtpVerification.js
│   │   ├── Post.js
│   │   ├── Comment.js
│   │   ├── Friendship.js
│   │   ├── Block.js
│   │   ├── Conversation.js
│   │   ├── Message.js
│   │   ├── Notification.js
│   │   ├── CallLog.js
│   │   ├── StickerPack.js
│   │   └── UserSettings.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── user.service.js
│   │   ├── post.service.js
│   │   ├── comment.service.js
│   │   ├── friendship.service.js
│   │   ├── chat.service.js
│   │   ├── message.service.js
│   │   ├── notification.service.js
│   │   ├── call.service.js
│   │   ├── upload.service.js   # Supabase S3
│   │   └── mail.service.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── post.controller.js
│   │   ├── comment.controller.js
│   │   ├── friendship.controller.js
│   │   ├── conversation.controller.js
│   │   ├── message.controller.js
│   │   ├── notification.controller.js
│   │   └── call.controller.js
│   ├── routes/
│   │   ├── auth.route.js
│   │   ├── user.route.js
│   │   ├── post.route.js
│   │   ├── comment.route.js
│   │   ├── friendship.route.js
│   │   ├── conversation.route.js
│   │   ├── message.route.js
│   │   ├── notification.route.js
│   │   ├── call.route.js
│   │   └── sticker.route.js
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   ├── upload.middleware.js
│   │   ├── rateLimit.middleware.js
│   │   └── validate.middleware.js
│   ├── validators/
│   │   ├── auth.validator.js
│   │   ├── user.validator.js
│   │   ├── post.validator.js
│   │   ├── chat.validator.js
│   │   └── friendship.validator.js
│   ├── utils/
│   │   ├── ApiError.js
│   │   ├── asyncHandler.js
│   │   ├── generateToken.js
│   │   ├── otp.js
│   │   └── pagination.js
│   ├── socket/
│   │   ├── index.js
│   │   ├── chat.handler.js
│   │   ├── call.handler.js
│   │   ├── presence.handler.js
│   │   └── notification.handler.js
│   ├── stickers/             # 🆕 Tự host bộ sticker + GIF
│   │   ├── index.json        # metadata các bộ sticker
│   │   ├── packs/
│   │   │   ├── moji-fun/
│   │   │   ├── cats/
│   │   │   ├── memes/
│   │   │   └── reactions/
│   │   └── gif/
│   │       └── trending.json # cache GIF trending (dùng API gì cũng cache local)
│   └── plan.md               # File này
```

---

## 2. Cấu trúc thư mục Frontend (sau này)

```
MXH/frontend/
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── components.json          # shadcn config
├── tsconfig.json
├── public/
│   ├── sounds/              # Âm thanh tin nhắn
│   │   ├── message.mp3
│   │   ├── call-incoming.mp3
│   │   └── notification.mp3
│   └── stickers/            # 🆕 Mirror các bộ sticker (offline cache)
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── lib/
│   │   ├── axios.ts
│   │   ├── socket.ts
│   │   ├── utils.ts
│   │   ├── format.ts
│   │   ├── e2ee.ts          # End-to-End encryption (ECDH + AES-GCM)
│   │   ├── rtc.ts           # WebRTC helpers
│   │   ├── media.ts         # Ghi âm, chụp ảnh
│   │   └── emoji.ts
│   ├── hooks/
│   │   ├── useSocket.ts
│   │   ├── useDebounce.ts
│   │   ├── useTheme.ts
│   │   ├── useSound.ts
│   │   ├── useE2EE.ts
│   │   ├── useRecorder.ts
│   │   └── useGifSuggest.ts  # 🆕 gợi ý GIF horizontal khi gõ chat
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── post.service.ts
│   │   ├── comment.service.ts
│   │   ├── friendship.service.ts
│   │   ├── chat.service.ts
│   │   ├── message.service.ts
│   │   ├── notification.service.ts
│   │   ├── call.service.ts
│   │   └── sticker.service.ts
│   ├── stores/
│   │   ├── useAuthStore.ts
│   │   ├── useUserStore.ts
│   │   ├── usePostStore.ts
│   │   ├── useChatStore.ts
│   │   ├── useCallStore.ts
│   │   ├── useNotificationStore.ts
│   │   ├── useFriendStore.ts
│   │   └── useThemeStore.ts
│   ├── components/
│   │   ├── ui/              # shadcn
│   │   ├── auth/
│   │   ├── layout/          # MainLayout, Sidebar, Topbar, Rightbar
│   │   ├── chat/
│   │   │   ├── ConversationList.tsx
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   ├── TypingIndicator.tsx
│   │   │   ├── ReadReceipt.tsx
│   │   │   ├── PinnedMessages.tsx
│   │   │   ├── MediaGallery.tsx
│   │   │   └── GifPicker.tsx
│   │   ├── call/
│   │   │   ├── CallModal.tsx
│   │   │   ├── CallControls.tsx
│   │   │   ├── IncomingCallModal.tsx
│   │   │   └── CallHistoryList.tsx
│   │   ├── post/
│   │   ├── profile/
│   │   ├── friend/
│   │   ├── sticker/
│   │   ├── voice/
│   │   ├── settings/
│   │   └── notification/
│   ├── pages/
│   │   ├── SignInPage.tsx
│   │   ├── SignUpPage.tsx
│   │   ├── OtpVerifyPage.tsx
│   │   ├── ForgotPasswordPage.tsx
│   │   ├── ResetPasswordPage.tsx
│   │   ├── HomePage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── EditProfilePage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── FriendsPage.tsx
│   │   ├── ChatPage.tsx
│   │   ├── NotificationsPage.tsx
│   │   └── SearchPage.tsx
│   └── types/
│       ├── user.ts
│       ├── post.ts
│       ├── message.ts
│       ├── conversation.ts
│       ├── notification.ts
│       ├── call.ts
│       └── store.ts
```

---

## 3. Tech stack đã chốt

### Backend
- Express 5, Mongoose 8, Socket.IO 4
- jsonwebtoken, bcrypt, cookie-parser
- dotenv, cors, helmet, morgan
- @supabase/supabase-js (thay cloudinary)
- googleapis (gửi Gmail bằng OAuth2 — `GMAIL_CLIENT_ID` đã có trong .env; sẽ thêm `GMAIL_CLIENT_SECRET` & `GMAIL_REFRESH_TOKEN` sau nếu cần)
- zod (validate), express-rate-limit

### Frontend (khi triển khai)
- React 19, Vite 7, TS 5.9
- Tailwind 4 + shadcn/ui (style new-york)
- Zustand, React Router 7
- axios + socket.io-client
- react-hook-form + zod
- sonner, lucide-react, date-fns
- emoji-picker-react, clsx + tailwind-merge
- 🆕 tenor/giphy → không dùng, tự host

---

## 4. Cấu hình đã có sẵn (từ .env)

```
PORT=5001
MONGODB_URI=YOUR_MONGODB_URI
ACCESS_TOKEN_SECRET=<đã có>
CLIENT_URL=http://localhost:5173
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY=YOUR_SUPABASE_SECRET_KEY
SUPABASE_JWKS_URL=https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/.well-known/jwks.json
GMAIL_CLIENT_ID=YOUR_GMAIL_CLIENT_ID
```

> ⚠️ **QUAN TRỌNG — Bảo mật:**
> - Giá trị gốc đã bị xoá khỏi tài liệu này vì đã từng bị commit vào lịch sử Git (public repo).
> - Xem `docs/security-incident-credential-leak.md` để biết các bước thu hồi/thay mới cần thực hiện trên MongoDB Atlas, Supabase và Google Cloud Console.
> - Không phục hồi giá trị cũ vào file này hoặc bất kỳ file tracked nào.

> ⚠️ **Cần bổ sung (AI tự sinh, lưu .env):**
> - `REFRESH_TOKEN_SECRET` (JWT cho refresh token — phải khác access)
> - `GMAIL_CLIENT_SECRET` — nếu dùng OAuth2 (AI sẽ hỏi sau nếu cần)
> - `GMAIL_REFRESH_TOKEN` — sau khi user chạy OAuth flow lần đầu
> - `GMAIL_USER` — `xanhnguyen05@gmail.com` (suy ra từ .env comment)
> - `SUPABASE_BUCKET=GreenX` (theo comment trong .env)

---

## 5. Phạm vi chức năng CHAT + CALL (ưu tiên trước)

### 5.1. Auth + OTP
- Sign up (email + OTP verify trước khi tạo user)
- Sign in (username/password → access + refresh)
- Refresh, sign out
- Forgot password (OTP) / Reset password
- Change password (khi đã login)

### 5.2. User Profile
- Xem/sửa thông tin cơ bản (displayName, bio, phone, avatar, cover)
- Tìm user theo username/email
- Không sửa email (theo yêu cầu)
- Cài đặt: theme (light/dark/system), sound, E2EE public key upload

### 5.3. Bạn bè
- Gửi lời mời, chấp nhận, từ chối, hủy
- Hủy kết bạn
- Chặn user
- Danh sách bạn, danh sách lời mời

### 5.4. Post (MVP)
- CRUD bài viết (text + ảnh)
- Like/unlike
- Comment + reply 1 cấp
- News feed (bài của mình + bạn bè, sort theo thời gian)
- Soft delete (giữ media để thread comment không gãy)
- Visibility: public / friends / private
- Supabase S3: bucket `GreenX/posts/...`

### 5.5. Chat — REST (REST chỉ khởi tạo, còn lại dùng socket)
- Conversation: tạo direct (1-1), tạo group, sửa, xoá, rời
- Member: thêm/xoá/đổi role
- Pin / Mute / Nickname (biệt danh trong nhóm)
- Message: lấy danh sách (cursor pagination), upload file/voice
- E2EE: client tự encrypt trước khi gửi, server lưu ciphertext

### 5.6. Chat — Socket.IO
- Events: connect, disconnect, conversation:join, message:send, message:read, typing, recording
- Realtime delivery + read receipt
- Online/offline indicator
- "Last seen" lưu DB khi disconnect

### 5.7. Call — WebRTC
- Signaling qua socket (offer / answer / ice-candidate)
- 1-1 (peer-to-peer) + nhóm (mesh đơn giản cho đến 4 người)
- STUN: `stun:stun.l.google.com:19302`
- Lưu CallLog cho "cuộc gọi nhỡ"
- UI: modal fullscreen, mute, camera off, end

### 5.8. Notification
- Lưu DB (recipientId, senderId, type, refId, isRead)
- Push realtime qua socket
- Endpoint: list, mark read, mark all read

### 5.9. Sticker & GIF tự host
- **Sticker**: tự host, tải open-source packs (LINE/Discord/Telegram) lưu vào `backend/src/stickers/packs/...`. Server trả metadata + signed URL (Supabase).
- **GIF đề xuất khi gõ chat**:
  - Khi user gõ text trong MessageInput, hook `useGifSuggest` debounce 300ms, query API tìm GIF theo keyword.
  - Hiển thị **horizontal scroll** ngay trên ô input (giống Telegram).
  - Nguồn GIF: tự host 1 bộ GIF trending (khoảng 200-500 GIF chia theo category: happy, sad, laugh, love, angry, wow, meme) — file .mp4 hoặc .gif. Lưu ở `backend/src/stickers/gif/` + manifest `trending.json`.
  - Match keyword: dùng tag list đơn giản (mỗi GIF có 3-5 tag).
  - Sau này nếu muốn mở rộng: hook cho phép gọi API bên thứ ba (Tenor/Giphy) nhưng mặc định tắt.

### 5.10. Media upload (Supabase S3)
- Bucket: `GreenX`
- Đường dẫn: `avatars/{userId}/{filename}`, `covers/{userId}/{filename}`, `posts/{userId}/{filename}`, `messages/{conversationId}/{filename}`, `stickers/...`
- Quyền: Public read cho sticker/GIF; private cho message media (signed URL 7 ngày)

### 5.11. Cài đặt cá nhân
- Theme: light / dark / system (Tailwind class `dark`)
- Sound: bật/tắt + chọn theme âm thanh (default / bell / chime)
- Mute thông báo: theo conversation hoặc theo user
- Đổi mật khẩu
- Đặt biệt danh trong nhóm
- Tải lên public key E2EE (RSA-OAEP, 2048 bit) — server lưu, client quản lý private key ở localStorage/IndexedDB

---

## 6. End-to-End Encryption (E2EE) — thiết kế

### Mục tiêu
- Server **chỉ thấy ciphertext**, không đọc được plaintext.
- Tính năng E2EE: tắt theo mặc định, user bật trong settings.
- Hỗ trợ: direct chat (1-1), group chat (P-256 ECDH pairwise giữa mỗi cặp member).

### Luồng tạo key (khi user bật E2EE lần đầu)
1. Client sinh key pair: `RSA-OAEP-2048` (cho mã hoá session key) + `ECDH P-256` (cho session AES key).
2. Public key upload lên server (`User.e2eePublicKey`, `User.e2eeEcdhPublicKey`).
3. Private key lưu localStorage (mã hoá bằng passcode do user đặt, optional nâng cao).

### Luồng gửi tin nhắn (1-1)
1. Sender sinh `aesKey` ngẫu nhiên (AES-256-GCM).
2. ECDH: lấy ECDH public key của người nhận, kết hợp với private key của mình → `sharedSecret`.
3. Dùng `sharedSecret` mã hoá `aesKey` (hoặc dùng trực tiếp shared secret làm key).
4. Plaintext → AES-GCM → ciphertext + iv + authTag.
5. Gửi qua socket: `{conversationId, type, ciphertext, iv, authTag, encryptedAesKey}`.
6. Server lưu, broadcast. Người nhận tự giải.

### Luồng gửi trong nhóm
- Sender mã hoá `aesKey` bằng public key của **từng member**, gửi kèm danh sách `encryptedKeysByUserId`.
- Mỗi member tìm key của mình trong list, dùng private key giải mã → lấy `aesKey` → giải mã ciphertext.

---

## 7. Checklist triển khai (theo thứ tự ưu tiên)

> Trạng thái cập nhật ngày 2026-10-16: 17/29 mục ✅

### A. Backend — nền tảng (1-5)
- [x] A1. Sửa lỗi backend hiện tại (env, package.json, controllers) ✅
- [x] A2. Tạo cấu trúc thư mục + utils + middlewares ✅
- [x] A3. Tạo đầy đủ 13 models ✅
- [x] A4. Supabase config + upload service ✅
- [x] A5. Mail service (Gmail OAuth2 hoặc App Password) ✅

### B. Backend — Auth (6-8)
- [x] B6. Auth service + controller + routes (signup, signin, refresh, signout) ✅
- [x] B7. OTP service (gửi Gmail, verify, expire) ✅
- [x] B8. Forgot/Reset/Change password ✅

### C. Backend — User + Friend (9-11)
- [x] C9. User CRUD + search + upload avatar/cover ✅
- [x] C10. Friendship (request/accept/reject/cancel/unfriend) + Block ✅
- [x] C11. UserSettings (theme, sound, E2EE public key) ✅

### D. Backend — Post (12-15)
- [x] D12. Post CRUD + upload media ✅
- [x] D13. Like/Unlike (unique index) ✅
- [x] D14. Comment + Reply ✅
- [x] D15. Newsfeed (cursor pagination) ✅

### E. Backend — Chat REST (16-19)
- [x] E16. Conversation CRUD (direct + group), members, roles ✅
- [x] E17. Message REST: list, upload file/voice, pin, mute ✅
- [x] E18. Sticker packs metadata + GIF trending JSON ✅
- [x] E19. Notification CRUD ✅

### F. Backend — Socket.IO (20-22)
- [x] F20. Socket setup + auth middleware + presence (online/offline/lastSeen) ✅
- [x] F21. Chat socket handlers (send, read, typing, recording) ✅
- [x] F22. Call socket handlers (offer, answer, ice, reject, end, group) ✅

### G. Backend — Sticker/GIF & tiện ích (23-24)
- [x] G23. Seed bộ sticker (3 bộ từ emoji mở) ✅
- [x] G24. GIF trending 6 categories ✅

### H. Frontend (25-29) — 16/29
- [x] H25. Scaffold Vite + React + Tailwind 4 + shadcn + lib ✅
- [x] H26. Auth UI (signin/signup/OTP/forgot/reset/change) ✅
- [x] H27. Profile + Friend + Settings UI ✅
- [x] H28. Post UI (newsfeed, create, like, comment) ✅
- [x] H29. Chat UI (conversation list, chat window, sticker, gif horizontal, voice, E2EE) + Call UI ✅
- [ ] Cải thiện UX: emoji picker, sticker picker modal, lightbox ảnh, call modal UI

---

## 8. Câu hỏi đã được user xác nhận

1. **Storage**: Supabase S3 bucket `GreenX` ✅
2. **Email**: Gmail App Password / OAuth2 (GMAIL_CLIENT_ID đã có) ✅
3. **Sticker/GIF**: Tự host + gợi ý GIF horizontal khi gõ chat ✅
4. **Voice**: `MediaRecorder` chuẩn trình duyệt ✅
5. **WebRTC**: STUN Google cơ bản ✅
6. **Mã hoá**: End-to-End (ECDH + AES-GCM) ✅
7. **Phong cách**: Vibecode 100%, không cần hỏi các quyết định nhỏ ✅

---

## 9. Quy tắc cho agent khi tiếp tục

1. **Đọc file này trước** khi bắt đầu mỗi session.
2. **Update checklist** khi xong mỗi mục (đổi `[ ]` thành `[x]`).
3. **Mỗi file code** đặt đúng theo cấu trúc thư mục ở Mục 1 & 2.
4. **Không tự ý** thay đổi schema lớn mà không hỏi. Quyết định nhỏ (đặt tên, tách hàm, validate rule) tự quyết.
5. **Mỗi lần build xong** chạy thử hoặc ít nhất kiểm tra cú pháp trước khi chuyển mục.
6. **Commit message** đặt rõ ràng: `[A1] fix env and package.json`, `[E16] conversation routes`, v.v.

---

## 10. Lưu ý kỹ thuật quan trọng

- **Mongoose 8.19** (KHÔNG dùng 9.x vì chưa ổn định).
- **Express 5** đã ổn định.
- **Socket.IO 4.x** — kết nối từ frontend kèm `withCredentials: true` và `auth: { accessToken }`.
- **Helmet + CORS** chỉ cho phép `CLIENT_URL` (không dùng `origin: true`).
- **Rate limit**: 100 req / 15 phút cho mỗi IP, riêng `/auth/*` thắt chặt 5 req / 1 phút.
- **JWT**: access 15 phút, refresh 7 ngày (HTTP-only cookie).
- **CORS** dev: cho phép `http://localhost:5173`.
- **Media URL có thời hạn**: Supabase signed URL 7 ngày cho media cá nhân.
- **Soft delete** Post/Comment: giữ field `deletedAt`.
