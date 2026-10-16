# MXH — Docker Quick Start

## Yêu cầu
- Docker + Docker Compose v2+
- Windows: cài [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## 1️⃣ Chuẩn bị secrets

```bash
cp .env.example .env
```

Mở `.env` và thay 3 biến bắt buộc (generate bằng `openssl rand -hex 32` mỗi cái):
- `ACCESS_TOKEN_SECRET`
- `REFRESH_TOKEN_SECRET`
- `E2EE_SERVER_KEY`

Các biến Supabase/Gmail nếu chưa có thì để trống — app vẫn chạy, chỉ thiếu tính năng upload/OTP.

## 2️⃣ Build frontend (1 lần)

```bash
# Cách 1: Trong Docker (chậm hơn, có cache)
docker-compose --profile builder run --rm frontend-builder

# Cách 2: Ngoài Docker (nhanh hơn, dùng Node local)
cd frontend
npm ci
npm run build
cd ..
```

Cách 2 được khuyến nghị — frontend build rồi nginx serve static.

## 3️⃣ Chạy toàn stack

```bash
docker-compose up -d        # background
docker-compose up           # foreground (xem logs)
```

## 4️⃣ Truy cập

| Service | URL |
|---|---|
| Frontend (React) | http://localhost:3000 |
| Backend API | http://localhost:5001 |
| Health check | http://localhost:5001/api/health |

## 5️⃣ Logs & debug

```bash
docker-compose logs -f              # tất cả
docker-compose logs -f backend      # chỉ backend
docker-compose ps                   # trạng thái
docker-compose exec backend sh      # vào container backend
```

## 6️⃣ Dừng

```bash
docker-compose down          # dừng, giữ data
docker-compose down -v       # dừng + xóa volumes (mất data MongoDB/Redis)
```

## Lệnh 1-dòng (full reset)

```bash
docker-compose down -v && \
  cp -n .env.example .env && \
  docker-compose --profile builder run --rm frontend-builder && \
  docker-compose up -d && \
  docker-compose logs -f backend
```

## Cấu trúc

```
.
├── backend/
│   ├── Dockerfile          # Multi-stage, alpine, non-root user
│   ├── .dockerignore       # Loại trừ khi build
│   └── ...
├── frontend/
│   ├── dist/               # Vite build output (volume mount cho nginx)
│   └── ...
├── infra/
│   └── nginx.conf          # SPA + cache + gzip
├── docker-compose.yml      # mongo + redis + backend + nginx
└── .env.example            # Template (copy sang .env, KHÔNG commit .env)
```

## Production notes

- Đổi `ACCESS_TOKEN_SECRET` / `REFRESH_TOKEN_SECRET` / `E2EE_SERVER_KEY` thành giá trị mạnh (≥64 hex chars)
- Nếu dùng MongoDB Atlas: sửa `MONGODB_URI` trong `docker-compose.yml` thành connection string Atlas
- Nếu dùng Upstash Redis: sửa `REDIS_URL` thành `rediss://default:...@....upstash.io:6379`
- Thêm domain + reverse proxy (Caddy) trước khi mở public
