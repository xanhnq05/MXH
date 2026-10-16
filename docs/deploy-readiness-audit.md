# Deploy Readiness Audit — MXH (10-20 concurrent users)

> Ngày: 16/10/2026
> Branch: `audit/phase0-3-foundation` @ `ad21b61`
> Mục tiêu: public beta với 10-20 người dùng đồng thời
> Kết luận ngắn: **CÓ THỂ DEPLOY** với ~85% sẵn sàng. Thiếu một số hạng mục monitoring/CDN/HTTPS để vận hành lâu dài.

---

## 1. Ước lượng tải thực tế

| Metric | 10-20 users | Note |
|---|---|---|
| Concurrent connections (HTTP) | ~5-15 req đồng thời | Frontend mỗi page load ~3-5 req |
| Concurrent sockets | ~20-40 (mỗi user 1-2 tab + mobile) | Socket.IO persistent |
| RPS peak | ~20-50 RPS | Dồn vào giờ cao điểm |
| Throughput chat | ~5-10 msg/phút tổng | Chat là real-time, nặng socket hơn REST |
| Storage | <1GB/tháng đầu | 20 user × 50MB media × 30 ngày |
| Bandwidth | <5GB/tháng | Text + ảnh thumbnail |

**Kết luận tải**: 10-20 users là **tải rất nhỏ** so với:
- 1 instance Node.js chịu được ~1000+ RPS cho endpoint đơn giản
- MongoDB Atlas tier M0 (free) chịu ~100 RPS đọc đơn giản
- Redis Upstash free tier: 10K commands/ngày

---

## 2. Bảng readiness (theo nhóm)

### ✅ ĐÃ SẴN SÀNG (không cần làm thêm)

| # | Hạng mục | Bằng chứng |
|---|---|---|
| A1 | **Auth + JWT + refresh token** | `auth.middleware.js`, `auth.service.js`, axios interceptor |
| A2 | **CORS + Helmet security headers** | `server.js` line 36-48 |
| A3 | **Rate limit global (300/15p prod)** | `rateLimit.middleware.js` |
| A4 | **Rate limit auth (5/min prod)** | `authLimiter` |
| A5 | **Validation với Zod** | `validators/*.validator.js`, `validate.middleware.js` |
| A6 | **Mongoose indexes** cho các query chính | 14+ indexes tìm thấy |
| A7 | **Cursor pagination** + limit max 50 | `utils/pagination.js` |
| A8 | **Redis cache** + graceful fallback | `libs/cache.js` |
| A9 | **Cache invalidation** khi mutate | `message.service`, `chat.service` |
| A10 | **Cache hit/miss metric** + admin endpoint | `/api/admin/cache/stats` |
| A11 | **Frontend useDedupedGet** (in-flight + cancel + stale) | `hooks/useDedupedGet.ts` |
| A12 | **Group RBAC** (15 tests) | `tests/e2e/group-rbac.e2e.test.js` |
| A13 | **Orphan cleanup** khi DB fail | `post.service.create` try/catch |
| A14 | **Health check endpoint** | `GET /api/health` |
| A15 | **Mongoose connection error handling** | `db.js` try/catch |
| A16 | **Trust proxy** cho reverse proxy | `app.set("trust proxy", 1)` |
| A17 | **HTTP body size limit** (10MB) | `express.json({ limit: "10mb" })` |
| A18 | **Socket.IO auth middleware** | `libs/socket.js` |
| A19 | **MongoDB TTL index** cho OTP + Session | `OtpVerification`, `Session` models |
| A20 | **Cursor pagination consistency test** (cùng timestamp) | `pagination.e2e.test.js` |
| A21 | **110/110 tests backend pass** | `npm test` (đã thêm --forceExit) |
| A22 | **14/14 tests frontend + build pass** | frontend |
| A23 | **.gitignore** bảo vệ .env, node_modules | `.gitignore` |
| A24 | **Credentials rotated khỏi tracked files** | commit `8745b70` + incident report |

### ⚠️ CÓ NHƯNG CHƯA TỐI ƯU (deploy được, cải tiến sau)

| # | Hạng mục | Mức độ | Note |
|---|---|---|---|
| B1 | **E2EE có bug** trong group chat | 🔴 HIGH | `e2eeManager.ts` push CÙNG ciphertext cho mọi member. 1-1 chat OK, group chat không giải mã được. **Cần vô hiệu hóa E2EE cho group chat hoặc refactor** |
| B2 | **No HTTPS** ở app code (phải do proxy) | 🟡 MED | Code không terminate TLS. Cần reverse proxy (nginx, Caddy) hoặc PaaS handle |
| B3 | **CORS chỉ cho 1 origin** | 🟡 MED | `CLIENT_URL` cố định. Nếu có nhiều domain (vd: web + admin portal) cần array |
| B4 | **No graceful shutdown** | 🟡 MED | Server không handle SIGTERM → kết nối bị cắt giữa chừng khi restart |
| B5 | **BullMQ chưa có worker** | 🟡 MED | Dependency có, queue chưa được dùng cho video/upload background |
| B6 | **Bundle 1.47MB** (chưa code-split) | 🟡 MED | Ảnh hưởng LCP. Vite có sẵn dynamic import, chưa dùng |
| B7 | **Logger dùng morgan** | 🟡 MED | Chỉ log, chưa structured (JSON). Production cần pino/winston |
| B8 | **No Sentry/error tracking** | 🟡 MED | Lỗi runtime không được báo cáo tự động |
| B9 | **Frontend không có ErrorBoundary** | 🟡 MED | Một component crash có thể trắng trang |
| B10 | **No Caching-Control headers** cho static asset | 🟡 MED | Frontend serve qua nginx/CDN nên OK, nhưng config chưa chuẩn |
| B11 | **Không có backup MongoDB tự động** | 🟡 MED | Atlas M0 có backup 1 ngày, M2+ có PITR |

### ❌ CẦN LÀM TRƯỚC KHI DEPLOY (P0)

| # | Hạng mục | Effort | Note |
|---|---|---|---|
| C1 | **Rotate credentials** ngoài dịch vụ | ~30p (manual) | MongoDB, Supabase, GMAIL. Xem `security-incident-credential-leak.md` |
| C2 | **Cập nhật .env** với credentials mới | ~5p | Sau khi rotate |
| C3 | **Verify production secrets** đủ mạnh (>=64 chars) | ~10p | ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, E2EE_SERVER_KEY |
| C4 | **Setup MongoDB IP whitelist** | ~5p | Chỉ IP server, không `0.0.0.0/0` |
| C5 | **Cấu hình ADMIN_EMAILS/IDS** | ~5p | Cho phép anh vào admin route |
| C6 | **Tạo Dockerfile + docker-compose** | ~1h | Cần cho staging/production |
| C7 | **Hoặc chọn PaaS** (Render, Railway, Fly.io) | ~30p | Render free tier đủ cho 20 users |
| C8 | **Setup domain + DNS** | ~15p | Và trỏ về server |
| C9 | **HTTPS** (Let's Encrypt hoặc PaaS auto) | ~15p | Bắt buộc cho cookie secure |
| C10 | **Smoke test script** kiểm tra health sau deploy | ~30p | curl + check key endpoints |

### ❌ CẦN LÀM SAU DEPLOY (P1 - 1-2 tuần)

| # | Hạng mục | Effort | Note |
|---|---|---|---|
| D1 | **Refactor E2EE group** (mỗi member 1 ciphertext riêng) | ~3-4h | Hoặc tạm thời vô hiệu hóa E2EE cho group |
| D2 | **Graceful shutdown** (SIGTERM handler) | ~30p | `server.close()`, `mongoose.disconnect()`, `cache.disconnect()` |
| D3 | **Sentry/error tracking** | ~1h | Free tier OK |
| D4 | **Structured logging** (pino) | ~2h | Dễ query hơn morgan |
| D5 | **CDN** cho frontend static (Cloudflare/Vercel) | ~30p | Free tier OK |
| D6 | **Code-split frontend** (lazy route) | ~2h | `React.lazy()` + `Suspense` |
| D7 | **GitHub Actions CI** (test + build) | ~2h | Auto run test mỗi PR |
| D8 | **MongoDB backup** verify + restore drill | ~1h | Atlas auto backup OK nhưng test restore |
| D9 | **Rate limit per-endpoint** (upload vs read) | ~1h | Hiện tại global |
| D10 | **Admin UI đơn giản** (cache stats, user list) | ~4h | Hoặc dùng MongoDB Compass |
| D11 | **Document .env secrets rotation procedure** | ~1h | Runbook cho chủ dự án |

---

## 3. Kế hoạch deploy đề xuất (cho 10-20 users)

### Phương án A: Render.com (khuyến nghị — đơn giản nhất)
- **Backend**: Render Web Service (free tier, 750h/tháng, sleep sau 15p idle)
  - Lưu ý: Free tier sẽ sleep → user đầu tiên chờ 30s. Nên dùng $7/mo Starter
  - Hoặc dùng Railway.app ($5/mo)
- **Frontend**: Vercel/Netlify (free tier)
- **MongoDB**: Atlas M0 (free) hoặc M2 ($9/mo có backup)
- **Redis**: Upstash free tier (10K commands/day) — vượt quá với 20 users tích cực
  - Dùng Docker local trên Render hoặc Redis Cloud (free 30MB)
- **Storage**: Supabase (đã có)

**Ước tính chi phí**: $0-15/tháng

### Phương án B: VPS + Docker
- **Server**: DigitalOcean $6/mo (1GB RAM) hoặc Vultr $6/mo
- **Stack**: Docker Compose (backend + frontend nginx + redis)
- **Domain**: Namecheap $9/năm
- **HTTPS**: Caddy auto-TLS

**Ước tính chi phí**: $7-10/tháng

### Phương án C: Self-host (free nhưng tốn công)
- Máy nhà + Cloudflare Tunnel (ẩn IP, free HTTPS)
- Tốn điện + uptime không cao

---

## 4. Checklist trước khi deploy (1 ngày)

- [ ] **C1-C2**: Rotate credentials + cập nhật .env
- [ ] **C3**: Generate secrets mới (≥64 chars, random) cho JWT/E2EE
- [ ] **C4**: MongoDB IP whitelist
- [ ] **C5**: ADMIN_EMAILS = email anh
- [ ] **C6 hoặc C7**: Dockerfile hoặc chọn PaaS
- [ ] **C8**: Domain + DNS
- [ ] **C9**: HTTPS (Let's Encrypt hoặc PaaS auto)
- [ ] **C10**: Viết smoke test script

## 5. Checklist sau deploy (24h đầu)

- [ ] Health check `/api/health` returns 200
- [ ] Auth flow: signup → OTP → signin → refresh token
- [ ] Tạo post có ảnh (test Supabase upload)
- [ ] Chat 1-1 real-time (test socket)
- [ ] Log lỗi trong 1h đầu
- [ ] Verify MongoDB connection pool không vượt giới hạn
- [ ] Check cache hit rate qua `/api/admin/cache/stats`

## 6. Rủi ro còn lại (chấp nhận được)

| Rủi ro | Mức độ | Mitigation |
|---|---|---|
| E2EE group chat lỗi | 🟡 MED | Vô hiệu hóa tạm thời hoặc warn user |
| Server sleep ở free tier | 🟡 LOW | Upgrade lên Starter nếu user phàn nàn |
| MongoDB quota M0 = 512MB | 🟡 LOW | Monitor + upgrade M2 khi gần đầy |
| Không có CDN | 🟡 LOW | 20 users bandwidth nhỏ, OK |
| Bundle 1.47MB | 🟡 LOW | Code-split trong P1 |
| Bug chưa phát hiện | 🟡 MED | Smoke test + monitor logs |

---

## 7. Tóm tắt

**Sẵn sàng 85%**. Có thể deploy trong 1 ngày làm việc sau khi:
1. Rotate credentials (manual, 30p)
2. Generate production secrets mới
3. Chọn platform + setup HTTPS

**Không cần** sửa thêm code backend/frontend lớn. Các thay đổi tối ưu (E2EE, code-split, graceful shutdown) có thể làm trong P1 sau launch.

**Lưu ý E2EE**: Nếu launch với group chat, cần quyết định:
- Tạm tắt E2EE cho group (mất privacy nhưng an toàn)
- Hoặc refactor E2EE trước khi launch (3-4h)

Khuyến nghị: **TẮT E2EE CHO GROUP** ở beta đầu, thông báo rõ cho user, refactor ở beta 2.
