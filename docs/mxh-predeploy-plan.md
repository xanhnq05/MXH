# MXH — Pre-deploy Plan & Checklist Tổng hợp

> Tài liệu này tổng hợp và kế thừa các checklist cũ:
> - `docs/audit-report.md` (audit branch `audit/phase0-3-foundation`)
> - `docs/mxh-social-expansion-plan.md` (plan mở rộng Post/Like/Comment/Group/Video/Reels)
> - `docs/chat-modernization-plan.md` (plan chat + sticker/GIF)
> - `docs/security-incident-credential-leak.md` (security gate)
>
> Ngày cập nhật: 16/10/2026
> Branch kiểm tra: `audit/phase0-3-foundation`
> Commit mới nhất: `8745b70` (security fix)

---

## Ma trận trạng thái tổng

| ID | Hạng mục | Ưu tiên | Trạng thái | Phase | Ghi chú |
|---|---|---|---|---|---|
| SEC-1 | Credential leak đã được xóa khỏi file tracked | P0 | ✅ DONE | 0 | `8745b70` |
| SEC-2 | Credentials đã rotate ngoài dịch vụ | P0 | ⏳ Tùy chủ dự án | — | Xem incident report |
| SEC-3 | Git history rewrite (Option A/B) | P0 | ⏳ Tùy chủ dự án | — | Xem incident report |
| SEC-4 | GitHub secret scanning bật | P1 | ❌ TODO | 1 | Settings → Code security |
| SEC-5 | Pre-commit hook (gitleaks) | P1 | ❌ TODO | 1 | Phòng tránh tương lai |
| AUTH-1 | Auth middleware verify token | P0 | ✅ DONE | 1 | `auth.middleware.js` |
| AUTH-2 | Refresh token rotation | P0 | 🟡 MỘT PHẦN | 1 | Cần verify rotation logic |
| AUTH-3 | CORS giới hạn `CLIENT_URL` | P0 | ✅ DONE | 1 | `server.js` |
| AUTH-4 | Socket.IO auth middleware | P0 | ✅ DONE | 1 | `libs/socket.js` |
| AUTH-5 | 401 cho endpoint private | P0 | ✅ DONE | 1 | Tests có |
| AUTH-6 | 403 cho quyền sai | P0 | ✅ DONE | 1 | Tests có |
| RBAC-1 | Group RBAC matrix (15 tests) | P0 | ✅ DONE | 1 | `b38f642` |
| RBAC-2 | Không cho client gửi role | P0 | ✅ DONE | 1 | Validator reject |
| RBAC-3 | Transfer ownership riêng | P0 | ✅ DONE | 1 | `transferOwnership` |
| E2EE-1 | E2EE thật (composer → DB → recipient) | P0 | ❓ CHƯA XÁC MINH | 1 | Cần đọc code thật |
| UPL-1 | MIME + ext whitelist | P0 | ✅ DONE | 1 | `upload.middleware.js` |
| UPL-2 | 50MB hard limit | P0 | ✅ DONE | 1 | Có boundary test? |
| UPL-3 | Path traversal prevention | P0 | 🟡 MỘT PHẦN | 1 | `buildPath` có random |
| UPL-4 | Orphan cleanup khi DB fail | P0 | ❌ TODO | 1 | Cần check `post.service.create` |
| UPL-5 | Private media signed URL | P0 | 🟡 MỘT PHẦN | 1 | Có `getSignedUrl`, cần verify expiry |
| UPL-6 | Video duration ≤ 2 phút | P0 | ❌ TODO | 4 | Chưa có |
| UPL-7 | Video transcoding 720p | P1 | ❌ TODO | 4 | Cần FFmpeg |
| PAG-1 | Cursor pagination ổn định | P0 | ✅ DONE | 2 | `utils/pagination.js` |
| PAG-2 | Dedup HTTP + Socket | P0 | ❌ TODO | 2 | Frontend chưa có |
| PAG-3 | In-flight request cancel khi switch | P0 | ❌ TODO | 2 | |
| CACHE-1 | Redis cache layer | P1 | ✅ FOUNDATION | 3 | `libs/cache.js` |
| CACHE-2 | Feed cache 60s | P1 | ✅ DONE | 3 | `getFeed` |
| CACHE-3 | Comment cache 60s | P1 | ✅ DONE | 3 | `comment.service.list` |
| CACHE-4 | Invalidate khi like/comment/post | P1 | ✅ DONE | 3 | `delPattern` |
| CACHE-5 | Cache hit/miss metric | P1 | ❌ TODO | 3 | Cần log |
| CACHE-6 | CDN cache headers cho media | P1 | ❌ TODO | 3 | Supabase có sẵn? |
| RATE-1 | Rate limit per-user | P0 | ✅ DONE | 1 | `rateLimit.middleware.js` |
| RATE-2 | Per-endpoint tier (read/write/upload) | P1 | ❌ TODO | 1 | Hiện tại global |
| RATE-3 | Retry-After header | P1 | ❌ TODO | 1 | |
| PERF-1 | Code-split frontend | P2 | ❌ TODO | 6 | Bundle 1.47MB |
| LOG-1 | Structured log + request ID | P1 | ❌ TODO | 6 | |
| LOG-2 | Không log E2EE plaintext | P0 | 🟡 CẦN VERIFY | 1 | |
| CI-1 | GitHub Actions CI | P2 | ❌ TODO | 6 | |
| CI-2 | Staging environment | P2 | ❌ TODO | 6 | |
| CI-3 | Smoke test script | P2 | ❌ TODO | 6 | |
| CI-4 | Migration an toàn + rollback | P2 | ❌ TODO | 6 | |
| OBS-1 | Sentry / error tracking | P2 | ❌ TODO | 6 | |

---

## Chi tiết theo phase

### Phase 0 — Audit & baseline (DONE)
- ✅ Audit code 72 backend + 83 frontend files
- ✅ Test 94/94 backend + 14/14 frontend + build pass
- ✅ `.gitignore` tạo
- ✅ `git ls-files` không có `node_modules`, `.env`
- ✅ Credential leak phát hiện và xử lý

### Phase 1 — Bảo mật, quyền truy cập, độ tin cậy
- ✅ 1.1. Auth/Authz (đa số done, cần verify E2EE)
- ❓ 1.2. E2EE (cần đọc code thật)
- 🟡 1.3. Upload (cần orphan cleanup + signed URL verify)

### Phase 2 — Pagination & consistency
- ✅ Cursor pagination có sẵn
- ❌ Dedup HTTP + Socket
- ❌ Request cancel khi switch conversation

### Phase 3 — Cache nhiều tầng
- ✅ Foundation Redis
- ✅ Feed + Comment cache
- ❌ Đo baseline + cache hit metric
- ❌ CDN headers

### Phase 4 — Upload/Video pipeline
- ❌ Duration check 2 phút
- ❌ Transcoding 720p + thumbnail
- ❌ BullMQ worker

### Phase 5 — Reels
- ❌ Vertical feed UI
- ❌ Viewport autoplay

### Phase 6 — Production hardening
- ❌ Structured log
- ❌ Sentry
- ❌ CI/CD + staging
- ❌ Smoke test

---

## Test results (output thực tế mới nhất)

```
Backend:   94/94 passed (11 suites, 122s)
Frontend:  14/14 passed (4 suites, 2.4s)
Build:     ✓ built in 6.54s (1.47MB JS - need code-split)
```

---

## Rủi ro còn lại (CHƯA đóng)

1. **E2EE chưa được verify** — chỉ thấy có `libs/e2ee.js` + `e2eeManager.ts`, chưa trace từ composer → DB → recipient.
2. **Git history vẫn chứa secret cũ** — cần Option A (accept) hoặc Option B (rewrite).
3. **Frontend bundle 1.47MB** — ảnh hưởng LCP, cần code-split.
4. **Không có pre-commit hook** — có thể leak secret trong tương lai.
5. **Không có staging env** — chưa test trên môi trường giống production.

---

## Cập nhật lịch sử

- **16/10/2026** (commit `8745b70`): Security fix — xóa credential khỏi tracked files.
- **16/10/2026** (commit `b38f642`): Phase 2+3 — idempotent like, comment cache, group RBAC.
- **16/10/2026** (commit `c3688ae`): Cache + queue foundation.
- **16/10/2026** (commit `0b9e360`): Audit report đầu tiên.
- **16/10/2026** (commit `f3751d1`): .gitignore + move prompt.
