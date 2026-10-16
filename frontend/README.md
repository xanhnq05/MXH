# MXH Frontend

Frontend cho dự án MXH — React 19 + Vite 7 + TypeScript + Tailwind 4 + shadcn/ui + Zustand.

## Cài đặt

```bash
npm install
```

## Chạy

```bash
npm run dev     # dev mode
npm run build   # production
npm run preview # preview production build
```

App mặc định chạy tại http://localhost:5173 và proxy sang backend tại http://localhost:5001.

## Cấu trúc

Xem `src/plan.md` (cùng cấp với backend).

## Tính năng chính

- **Auth**: Sign in, Sign up với OTP, Forgot/Reset password, Change password
- **Profile**: Xem/sửa, upload avatar/cover, E2EE key
- **Friend**: Gửi/chấp nhận/từ chối lời mời, unfriend, block
- **Post**: News feed, tạo bài, like, comment, share
- **Chat**: 1-1 + nhóm, gửi text/ảnh/file/voice/sticker/GIF, typing, đã đọc, ghim
- **Call**: WebRTC 1-1 + nhóm, signaling qua socket
- **Notification**: Realtime, đánh dấu đã đọc
- **Settings**: Theme sáng/tối, âm thanh, đổi mật khẩu
- **E2EE**: ECDH P-256 + AES-256-GCM (server chỉ thấy ciphertext)
- **GIF suggestion**: Gợi ý horizontal khi gõ trong chat
