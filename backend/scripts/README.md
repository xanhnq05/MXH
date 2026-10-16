# 🌱 Seed dữ liệu mẫu

Script tự động tạo 3 user mẫu + friend + conversation + post + notification để test nhanh.

## Chạy

```powershell
cd h:\RenLuyen\MXH\backend
npm run seed
```

## Tài khoản tạo ra

| Username | Email | Password | E2EE | Ghi chú |
|---|---|---|---|---|
| `alice` | alice@greenx.test | `password123` | ✅ Có | Có conv với bob + group |
| `bob` | bob@greenx.test | `password123` | ❌ Chưa | Friend với alice |
| `carol` | carol@greenx.test | `password123` | ✅ Có | Member group "Team GreenX" |

## Dữ liệu seed

- 1 friendship (alice <-> bob)
- 1 direct conversation (alice <-> bob) với 4 tin nhắn mẫu
- 1 group "Team GreenX" với alice (owner), bob (admin), carol (member), 5 tin nhắn
- 3 post mẫu (mỗi user 1 post)
- 2 notification cho alice

## Cách test thủ công

1. Chạy backend: `npm run dev`
2. Chạy frontend: `cd ..\frontend && npm run dev`
3. Mở `http://localhost:5173/signin` 
4. Login bằng `alice` / `password123` (không cần OTP vì user đã tạo sẵn)
5. Vào `/chat` → thấy 2 conversation có sẵn
6. Vào `/` → thấy newsfeed có 3 post
7. Vào `/notifications` → thấy 2 thông báo
8. Mở 2 tab browser, 1 tab login alice, 1 tab login bob → test realtime chat, call

## Kết nối DB

Script ưu tiên `MONGODB_URI` từ `.env`. Nếu Atlas không kết nối được (cluster paused, network, IP chưa whitelist), tự động fallback về `mongodb://127.0.0.1:27017/mxh`.

**Fix lỗi Atlas thường gặp:**
- Vào [cloud.mongodb.com](https://cloud.mongodb.com) → Database → chọn cluster → click "Resume" nếu bị paused
- Network Access → Add IP Address → "Allow Access from Anywhere" (0.0.0.0/0)
- Lấy connection string mới: Database → Connect → Drivers → Node.js
