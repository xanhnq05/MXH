# MXH Backend

Backend cho dự án MXH (mạng xã hội) — Express 5 + Mongoose 8 + Socket.IO + Supabase S3.

## Cài đặt

```bash
npm install
```

Copy `.env.example` thành `.env` và điền các biến cần thiết (đặc biệt là MONGODB_URI, SUPABASE_*, GMAIL_APP_PASSWORD).

## Chạy

```bash
npm run dev   # nodemon
npm start     # node thuần
```

## Seed dữ liệu mẫu

```bash
node scripts/seedStickers.js
```

## Cấu trúc

```
src/
├── configs/        # env, supabase, mail
├── libs/           # db, socket
├── models/         # 13 Mongoose models
├── services/       # business logic
├── controllers/    # HTTP layer (req → service → res)
├── routes/         # Express routes
├── middlewares/    # auth, error, upload, rate limit, validate
├── validators/     # Zod schemas
├── utils/          # ApiError, asyncHandler, generateToken, otp, pagination
├── socket/         # socket handlers (sẽ tách thêm)
└── stickers/       # data tự host: packs + gif/trending.json
```

## Xem chi tiết plan

Đọc `src/plan.md` để biết đầy đủ kế hoạch, checklist, quyết định thiết kế.

## API

| Nhóm | Base path |
|---|---|
| Auth | `/api/auth` |
| User | `/api/users` |
| Post | `/api/posts` |
| Comment | `/api/comments` |
| Friend | `/api/friends` |
| Conversation | `/api/conversations` |
| Message | `/api/messages` |
| Notification | `/api/notifications` |
| Call | `/api/calls` |
| Sticker | `/api/stickers` |
| GIF | `/api/gifs` |

## Socket.IO

Kết nối kèm `auth.accessToken` (JWT). Xem `src/libs/socket.js` để biết đầy đủ events.
