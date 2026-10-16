# Audit Report — Trạng thái code MXH sau 2 prompt trước

> Ngày: 16/10/2026
> Branch: `audit/phase0-3-foundation` (tách khỏi `main` để rollback an toàn)
> Người audit: Cursor Agent (theo checklist 8/12 của model AI khác)

---

## 0. Tóm tắt 1 phút

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| `git status` | ✅ Sạch (chỉ 1 commit mới trên branch) | Đã stage `.gitignore`, lockfile, docs |
| Backend test | ✅ **94/94 pass** (11 suites, 112s) | Không có test fail |
| Frontend test | ✅ **14/14 pass** (4 suites, 2.4s) | |
| Frontend build | ✅ Pass | Warning: JS bundle > 500KB (1.47MB) — cần code-split |
| `.env` có commit? | ❌ Không (chưa track) | |
| `node_modules` có commit? | ❌ Không (chưa track) | |
| `.gitignore` | ✅ Vừa tạo (thiếu từ trước) | |

---

## 1. Các commit đã có (3 commit trong session này, 1 commit audit)

```
807042e docs: update plan with phase 0-3 complete status
b38f642 feat(phase2+3): idempotent like, comment cache, group RBAC matrix
c3688ae feat(cache+queue): Redis/BullMQ foundation with lazy fallback
f3751d1 chore(audit): add .gitignore + move prompt to docs/   ← branch mới
```

Tất cả 3 commit đầu đang ở **`main`** (chưa push lên origin).
Commit thứ 4 ở branch **`audit/phase0-3-foundation`**.

---

## 2. Đã verify — KHÔNG giả định

Em đã **chạy lại** tất cả test, không dựa vào output session trước:

| Test | Output thực tế | Số test |
|---|---|---|
| `npm test` (backend) | `Test Suites: 11 passed, 11 total / Tests: 94 passed, 94 total` | 94 |
| `npm test` (frontend) | `Test Files 4 passed / Tests 14 passed` | 14 |
| `npm run build` (frontend) | `✓ built in 6.54s` | (no tests) |
| `git status --short` | `M package.json/lock + .gitignore + docs/` | 4 files |

---

## 3. Trạng thái từng Phase (theo checklist 8/12)

### P0 — Bắt buộc trước deploy

| Mục | Trạng thái | Chi tiết |
|---|---|---|
| **Audit code** | ✅ DONE | Báo cáo này. |
| **Bảo mật & phân quyền** | 🟡 MỘT PHẦN | RBAC group đã có (15 tests), auth có (60+ tests). **CHƯA có**: rate-limit per-endpoint, signed URL cho media private, E2EE compatibility audit. |
| **Upload media** | 🟡 MỘT PHẦN | Đã có 50MB/MIME whitelist (`upload.middleware.js`). **CHƯA có**: video transcoding, duration check 2 phút, 720p, cleanup orphan. |
| **Production prep** | ❌ CHƯA | Chưa có Dockerfile, health check có (`/api/health`), chưa test trên cloud, chưa có backup plan, chưa có migration script. |

### P1 — Trải nghiệm & hiệu năng

| Mục | Trạng thái | Chi tiết |
|---|---|---|
| **Cache nhiều tầng** | 🟡 FOUNDATION | Có `libs/cache.js` (Redis lazy-connect). **CHƯA có**: CDN cache headers, frontend TanStack Query, đo baseline perf. |
| **Rate limit hợp lý** | ✅ FIXED | Đã sửa: dev 5000/15p, prod 300/15p, key theo userId. **CHƯA có**: per-endpoint tier (read/write/upload), Retry-After header. |
| **Phân trang & infinite scroll** | 🟡 MỘT PHẦN | Có `utils/pagination.js` (cursor-based). Đang dùng cho feed/comment/conversations. **CHƯA có**: chống trùng item khi realtime + API cùng lúc, dedupe ở frontend. |
| **Chỉnh sửa ảnh** | ❌ CHƯA | Có `ImageCropper.tsx` (avatar/cover), chưa pipeline chung cho post composer. |
| **Text status** | 🟡 MỘT PHẦN | Post model chấp nhận text-only. **CHƯA có**: link preview, SSRF protection, render an toàn URL. |

### P2 — Vận hành

| Mục | Trạng thái | Chi tiết |
|---|---|---|
| **Log & monitoring** | ❌ CHƯA | Chỉ có `morgan` dev log. Cần structured log + request ID + Sentry. |
| **Load test** | ❌ CHƯA | Chưa đo với >100 user đồng thời. |
| **CI/CD & release** | ❌ CHƯA | Chưa có GitHub Actions, staging env, smoke test script. |

---

## 4. Cảnh báo & vấn đề tìm thấy

### 🔴 Quan trọng
1. **Không có `.gitignore`** → vừa thêm (commit `f3751d1`).
2. **Chưa push code mới** → 3 commit gần nhất chỉ trên local. Cần push lên branch riêng để có điểm khôi phục.
3. **Bundle frontend 1.47 MB** → cần code-split, dynamic import cho chat/admin/reels.

### 🟡 Cần làm trước khi deploy
1. Test với Redis thật (em chỉ mới test lazy fallback khi Redis DOWN).
2. Audit E2EE: code hiện tại có `libs/e2ee.js`, `e2eeManager.ts` — chưa đọc kỹ.
3. Test upload với file 49MB / 50MB / 51MB (boundary).
4. Test video duration > 2 phút (chưa có validation).
5. Xác minh CORS chỉ cho phép `CLIENT_URL` (đã có trong `server.js`).
6. Xác minh signed URL có expire hợp lý (7 ngày hiện tại — OK cho dev).

### 🟢 Đã chắc chắn OK
- Auth flow (signin/signup/OTP) — 60+ tests
- Group RBAC matrix — 15 tests (owner/admin/member/outsider)
- Like idempotent — 7 tests
- Soft delete post/comment
- Pagination cursor
- Multer 50MB hard limit
- MIME whitelist upload

---

## 5. Đề xuất thứ tự tiếp theo (theo khuyến nghị AI)

Em sẽ **DỪNG** cải tiến thêm cho đến khi:

1. ✅ Anh push code mới lên branch (em đã tạo `audit/phase0-3-foundation` sẵn).
2. ⏳ Cài Redis thật (Docker / WSL2 / native) để test cache layer thực sự hoạt động.
3. ⏳ Có environment staging.
4. ⏳ Đo baseline performance (số user, response time, DB query time).

Sau đó, theo thứ tự ưu tiên:
- **P0.1**: Hoàn thiện upload (duration check, transcoding, cleanup)
- **P0.2**: Audit E2EE + signed URL cho media private
- **P0.3**: Production env (Docker, health check, CORS verify)
- **P1.1**: Test với Redis thật + đo perf gain
- **P1.2**: Code-split frontend
- **P2.1**: Structured log + Sentry
- **P2.2**: Load test với k6 hoặc Artillery

---

## 6. Files changed trong session này

```
.gitignore                                       (mới, 38 dòng)
docs/mở rộng.md                                   (move từ root)
docs/mxh-social-expansion-plan.md                 (mới, 99 dòng)
backend/.env.example                              (+4 dòng REDIS_URL)
backend/package.json                              (+2 deps: bullmq, ioredis)
backend/package-lock.json                         (+261 dòng)
backend/src/libs/cache.js                         (mới, 159 dòng)
backend/src/libs/queue.js                         (mới, 77 dòng)
backend/src/services/post.service.js              (+80 dòng, idempotent + cache)
backend/src/services/comment.service.js           (+29 dòng, cache + realtime)
backend/src/services/chat.service.js              (+64 dòng, transferOwnership + safety)
backend/src/controllers/conversation.controller.js (+10 dòng)
backend/src/routes/conversation.route.js         (+6 dòng)
backend/src/validators/chat.validator.js         (sửa changeRoleSchema)
backend/tests/unit/cache.test.js                 (mới, 65 dòng)
backend/tests/unit/queue.test.js                 (mới, 50 dòng)
backend/tests/e2e/like-idempotent.e2e.test.js    (mới, 133 dòng)
backend/tests/e2e/group-rbac.e2e.test.js         (mới, 286 dòng)
```

---

## 7. Test results thực tế (output copy nguyên)

```
> mxh-backend@1.0.0 test
> cross-env NODE_ENV=test node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand

Test Suites: 11 passed, 11 total
Tests:       94 passed, 94 total
Snapshots:   0 total
Time:        112.286 s
```

```
> mxh-frontend@0.1.0 test
> vitest run

 Test Files  4 passed (4)
      Tests  14 passed (14)
   Duration  2.40s
```

```
> mxh-frontend@0.1.0 build
> tsc -b && vite build

vite v7.3.7 building client environment for production...
✓ 2748 modules transformed.
dist/assets/index-DyS1dgA_.css     62.10 kB
dist/assets/index-jwOY1HzA.js   1,475.69 kB
✓ built in 6.54s
```

---

## 8. Kết luận

- ✅ Tất cả test pass **HIỆN TẠI** — không có regression.
- ⚠️ Em đã **DỪNG** theo khuyến nghị, không tự ý thêm Phase 4-6.
- 🔄 Cần anh push branch `audit/phase0-3-foundation` lên origin trước khi tiếp tục.
- 📋 Checklist 8/12 đã chọn — em sẽ triển khai tuần tự theo thứ tự P0 → P1 → P2 khi anh confirm.
