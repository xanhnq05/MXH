# Cài Redis trên Windows (hướng dẫn nhanh)

> MXH backend dùng Redis cho **cache + queue (BullMQ)**. Nếu không có Redis, app vẫn chạy nhưng cache bị skip (chỉ log warning).
> Ngày: 16/10/2026

## Trạng thái hiện tại

- ❌ Redis chưa có trên máy (test `Test-NetConnection 127.0.0.1 -Port 6379` = False)
- ✅ Backend đã có sẵn code lazy-connect (không crash nếu Redis DOWN)
- ✅ Test đã pass 94/94 ngay cả khi không có Redis

## 3 cách cài (chọn 1)

### Cách 1: Docker Desktop (khuyến nghị — dễ nhất)

**Yêu cầu**: Windows 10/11 + WSL2 (đã có sẵn trên máy có Docker Desktop).

```powershell
# 1. Cài Docker Desktop tu https://www.docker.com/products/docker-desktop/
# 2. Mo PowerShell, chay:
docker run -d --name mxh-redis -p 6379:6379 redis:7-alpine

# 3. Kiem tra:
docker ps
# Phai thay "mxh-redis" dang chay

# 4. Set bien moi truong:
# Mo file backend/.env, them dong:
# REDIS_URL=redis://127.0.0.1:6379
```

**Lệnh hữu ích**:
```powershell
docker stop mxh-redis       # Dừng
docker start mxh-redis      # Khởi động lại
docker logs mxh-redis       # Xem log
docker rm -f mxh-redis      # Xóa container
```

### Cách 2: WSL2 + native Redis (Linux bên trong Windows)

**Yêu cầu**: WSL2 đã cài (Ubuntu 22.04).

```powershell
# Mo WSL terminal:
wsl

# Trong WSL:
sudo apt update
sudo apt install -y redis-server
sudo service redis-server start
redis-cli ping   # Phai tra ve "PONG"
```

Sau đó trong `backend/.env`:
```
REDIS_URL=redis://127.0.0.1:6379
```

### Cách 3: Memurai (native Windows, không cần Docker)

**Yêu cầu**: Windows 10/11, không cần WSL.

1. Tải từ https://www.memurai.com/get-memurai (bản free cho dev)
2. Cài đặt mặc định
3. Mở PowerShell:
```powershell
memurai-cli ping    # Phai tra ve "PONG"
```

`REDIS_URL` trong `.env`: `redis://127.0.0.1:6379`

## Cách 4 (nhanh nhất): Cloud Redis miễn phí

**Upstash** cho free tier 10K commands/day.

1. Đăng ký: https://upstash.com
2. Tạo database (region Singapore cho VN)
3. Copy `REDIS_URL` (dạng `rediss://default:xxxxx@xxxxx.upstash.io:6379`)
4. Paste vào `backend/.env`

**Lưu ý**: Upstash dùng TLS, nên URL bắt đầu bằng `rediss://` (có 2 chữ 's').

## Kiểm tra Redis hoạt động với MXH

```powershell
# 1. Start backend
Set-Location h:\RenLuyen\MXH\backend
npm run dev

# 2. Phai thay dong "🟢 Redis connected" trong console
# Neu khong co, kiem tra:
#    - REDIS_URL co dung khong
#    - Redis server co chay khong
#    - Firewall co chan khong
```

## Test cache layer thực sự hoạt động

Sau khi Redis chạy, em sẽ viết test E2E xác nhận:
- Cache hit/miss cho `/api/posts/feed`
- Cache invalidate sau khi like/comment/post
- Không có regression khi Redis DOWN

## Troubleshooting

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:6379` | Redis chưa chạy | `docker start mxh-redis` hoặc `sudo service redis-server start` |
| `WRONGPASS invalid username-password pair` | Sai password | Copy lại URL từ Upstash |
| `Redis chua san sang, cache se bi bo qua` | Không có REDIS_URL env | Set `REDIS_URL` trong `backend/.env`, restart backend |
| `Redis OOM` | Hết memory | Tăng `maxmemory` trong redis.conf hoặc dùng Upstash |

## Không muốn cài Redis?

App **vẫn chạy bình thường** không có Redis. Chỉ là:
- Cache bị skip → mỗi request đều query DB
- Queue bị skip → không có background job
- Rate-limit vẫn hoạt động (đang dùng in-memory, OK cho 1 instance)

Phù hợp cho dev local. Production nên có Redis.
