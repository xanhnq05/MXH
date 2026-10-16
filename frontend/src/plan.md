# 📋 PLAN TỔNG THỂ DỰ ÁN MXH — FRONTEND

> File này là **Nguồn sự thật (Source of Truth)** cho phần frontend.
> Khi context bị reset, đọc lại file này + `../backend/src/plan.md` để tiếp tục.
> Cập nhật: 2026-10-16

---

## 0. Nguyên tắc

- Vibecode 100%, mỗi component nhỏ tự quyết; hỏi khi mơ hồ thật sự.
- Stack cố định: React 19 + Vite 7 + TS 5.9 + Tailwind 4 + shadcn/ui + Zustand + React Router 7 + Axios + Socket.IO client.
- **E2EE**: client tự encrypt, server chỉ thấy ciphertext.
- **Gợi ý GIF horizontal** khi gõ trong ô chat (theo yêu cầu).

---

## 1. Cấu trúc thư mục hiện tại

```
MXH/frontend/
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── components.json
├── index.html
├── .env
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── lib/
│   │   ├── axios.ts          # có interceptor refresh token
│   │   ├── socket.ts         # socket.io-client instance
│   │   ├── utils.ts          # cn() helper
│   │   ├── e2ee.ts           # ECDH + AES-GCM
│   │   ├── rtc.ts            # WebRTC peer helper
│   │   ├── format.ts         # (TODO) format time
│   │   ├── media.ts          # (TODO) recorder helpers
│   │   └── emoji.ts          # (TODO) emoji parser
│   ├── hooks/
│   │   ├── useSocket.ts
│   │   ├── useDebounce.ts
│   │   ├── useTheme.ts
│   │   ├── useSound.ts
│   │   ├── useRecorder.ts    # ghi âm thanh
│   │   └── useGifSuggest.ts  # gợi ý GIF horizontal
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── post.service.ts
│   │   ├── chat.service.ts
│   │   └── other.service.ts  # friendship, block, notification, sticker, call
│   ├── stores/
│   │   ├── useAuthStore.ts
│   │   ├── useChatStore.ts
│   │   ├── useNotificationStore.ts
│   │   ├── useCallStore.ts
│   │   └── useThemeStore.ts
│   ├── types/
│   │   ├── user.ts
│   │   ├── post.ts
│   │   ├── message.ts
│   │   ├── notification.ts
│   │   └── store.ts
│   ├── components/
│   │   ├── ui/              # shadcn: button, input, textarea, label, card, avatar, dialog, separator, tabs, spinner
│   │   ├── auth/            # ProtectedRoute
│   │   ├── layout/          # MainLayout (sidebar + topbar)
│   │   ├── providers/       # ThemeProvider, SocketProvider
│   │   ├── chat/            # (TODO) tách MessageBubble, MessageInput
│   │   ├── call/            # (TODO) CallModal
│   │   ├── post/            # (TODO) PostCard
│   │   └── settings/        # (TODO)
│   └── pages/
│       ├── SignInPage.tsx
│       ├── SignUpPage.tsx
│       ├── OtpVerifyPage.tsx
│       ├── ForgotPasswordPage.tsx
│       ├── ResetPasswordPage.tsx
│       ├── HomePage.tsx
│       ├── ProfilePage.tsx
│       ├── EditProfilePage.tsx
│       ├── SettingsPage.tsx
│       ├── FriendsPage.tsx
│       ├── ChatPage.tsx
│       ├── NotificationsPage.tsx
│       └── SearchPage.tsx
```

---

## 2. Tính năng đã có (MVP)

✅ Auth đầy đủ (signin, signup với OTP, forgot/reset/change password)
✅ Profile xem + sửa + upload avatar/cover
✅ Friend: gửi/chấp nhận/từ chối lời mời, unfriend, danh sách bạn
✅ Post: newsfeed, tạo bài, like, comment (UI cơ bản)
✅ Chat: list conversation, gửi text/ảnh/file/voice/sticker/GIF
✅ Realtime: typing, đã đọc (qua socket)
✅ Notification: list + đánh dấu đã đọc
✅ Settings: theme sáng/tối, âm thanh, đổi mật khẩu
✅ Search user theo username/email/displayName
✅ GIF horizontal suggestion khi gõ chat

## 3. Tính năng chưa làm / cần cải thiện

- [ ] **Sticker Picker modal** (hiện tại chưa có UI chọn sticker; cần tạo grid sticker)
- [ ] **Emoji picker** (cài `emoji-picker-react`)
- [ ] **Call modal** (UI gọi điện/video, RTCPeerConnection đã có trong `lib/rtc.ts`)
- [ ] **Group management UI** (sửa tên, thêm/xoá thành viên, đổi role, đặt biệt danh, mute, ghim)
- [ ] **Tin nhắn trả lời (reply) UI**
- [ ] **Lightbox ảnh** khi click vào ảnh trong chat/post
- [ ] **Drag & drop upload** trong ô input
- [ ] **Last seen hiển thị** trong header conversation
- [ ] **Read receipt** chi tiết (✓✓ xanh khi đã đọc)
- [ ] **Mute indicator** trong conversation list
- [ ] **Dark mode** polish (kiểm tra contrast)
- [ ] **Responsive mobile** (hiện sidebar ẩn ở mobile)
- [ ] **Voice call ringing** UI
- [ ] **Emoji reaction** cho message (optional)
- [ ] **Forward message** UI
- [ ] **Tìm kiếm trong cuộc trò chuyện**

## 4. End-to-End Encryption

**Đã có ở `lib/e2ee.ts`:** generateECDHKeyPair, deriveSharedKey, encryptAESGCM, decryptAESGCM, encryptText, decryptText, storePrivateKey, loadPrivateKey.

**Chưa tích hợp** vào `ChatPage.tsx`:
- Khi user bật E2EE (trong settings), generate key pair, upload publicKey lên server, lưu privateKey vào localStorage.
- Khi gửi tin nhắn: tạo AES key, mã hoá nội dung, với mỗi member lấy ECDH public key → derive shared key → mã hoá AES key → gửi kèm.
- Khi nhận: tìm encryptedKey của mình, derive shared key với sender, decrypt AES key, decrypt content.

→ Sẽ làm ở version 2.

## 5. WebRTC Call

**Đã có ở `lib/rtc.ts`:** CallPeer class với createOffer/Answer, ICE candidate, toggle audio/video.

**Chưa có UI:** cần tạo `CallModal.tsx` + `IncomingCallModal.tsx` + `CallControls.tsx`.

Socket events đã có sẵn:
- `call:offer` / `call:answer` / `call:ice-candidate` (1-1)
- `call:offer:group` / `call:answer:group` / `call:ice:group` (nhóm)
- `call:reject` / `call:end`

## 6. Quy ước code

- **TypeScript strict** (đã bật).
- **Import alias**: `@/components/...`, `@/lib/...`, `@/hooks/...`, `@/stores/...`, `@/services/...`, `@/types/...`.
- **Tailwind**: dùng classes utility; tránh inline style.
- **shadcn/ui**: copy từng component vào `components/ui/`, không import từ package ngoài.
- **State**: Zustand cho global state (auth, chat, noti, call, theme). Local state dùng useState.
- **API call**: services/ trả về data trực tiếp; components gọi và catch lỗi với toast.
- **Toast**: dùng `sonner` (`toast.success/error`).
- **Socket**: connect qua `useSocket` hook, auto-join conversation khi vào ChatPage.

## 7. Khi bị mất context

1. Đọc file này.
2. Đọc `../backend/src/plan.md`.
3. Đọc `src/App.tsx` để nắm routing.
4. Đọc `src/lib/axios.ts` + `src/lib/socket.ts` để nắm data flow.
5. Tiếp tục implement các mục ở phần "Tính năng chưa làm" theo thứ tự ưu tiên.
