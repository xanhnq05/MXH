# Security Incident — Credential Leak (16/10/2026)

> **Loại sự cố:** Lộ credentials thật trong file được Git theo dõi, trên public repo.
> **Trạng thái:** Đã thay placeholder trong working tree. **CHƯA đóng** — cần thu hồi trên dịch vụ ngoài và rewrite Git history.

---

## 1. Phạm vi lộ

| # | File | Số secrets | Commit đầu tiên có secret | Trạng thái |
|---|---|---|---|---|
| 1 | `backend/src/plan.md` | 4 (MongoDB URI, Supabase URL, Supabase publishable key, Supabase secret key) | `74f8b14` (first commit) | ✅ Đã thay placeholder |
| 2 | `backend/tests/setup.js` | 1 (MongoDB URI test) | `74f8b14` | ✅ Đã thay bằng mongodb-memory-server |

Loại secret đã lộ:
- **MongoDB Atlas** connection string (user `xanhnguyen05_db_user`, database `banking`/`mxh`)
- **Supabase Project** (URL + publishable key + secret key)

Không thấy GMAIL credentials hay JWT secret lộ trong file tracked (GMAIL_CLIENT_ID chỉ là OAuth client ID, không phải secret, nhưng vẫn khuyến nghị rotate).

---

## 2. Việc đã làm trong repo (working tree)

1. Thay toàn bộ giá trị secret trong `backend/src/plan.md` bằng placeholder (`YOUR_MONGODB_URI`, `YOUR_SUPABASE_URL`, `YOUR_SUPABASE_PUBLISHABLE_KEY`, `YOUR_SUPABASE_SECRET_KEY`).
2. Refactor `backend/tests/setup.js` + `tests/setupE2E.js` để dùng `mongodb-memory-server` (in-memory) khi không có `TEST_MONGODB_URI` env. Không còn hardcode connection string nào.
3. Cài dependency mới: `mongodb-memory-server` (chỉ devDependency).
4. Verify test suite: **94/94 pass** (2 skipped khi không có Redis).

---

## 3. Việc BẮT BUỘC làm NGOÀI repo (do chủ dự án thực hiện)

> ⚠️ Em **KHÔNG thể** thực hiện các thao tác này. Cần anh vào dashboard dịch vụ tương ứng để thu hồi.

### 3.1. MongoDB Atlas (database `banking` + `mxh`)

1. Đăng nhập https://cloud.mongodb.com
2. **Đổi password** user `xanhnguyen05_db_user`:
   - Database Access → user → Edit Password → "Update Password"
   - Lưu vào password manager (KHÔNG commit).
3. **Whitelist IP**: nếu trước đây cho `0.0.0.0/0` thì nên giới hạn lại theo IP deploy.
4. Kiểm tra **access logs** trong Atlas (Activity Feed) xem có truy cập lạ từ IP không phải của bạn không. Nếu có → điều tra thêm.
5. Tạo connection string MỚI dán vào `backend/.env` (file này KHÔNG tracked, an toàn).

### 3.2. Supabase (project tnbkodmuhoopgnynqmkm)

1. Đăng nhập https://supabase.com/dashboard
2. Vào project → Settings → API
3. **Rotate service_role key** (Supabase secret key):
   - Click "Generate new key" cho service_role
   - Copy key mới vào `backend/.env` (SUPABASE_SECRET_KEY)
   - **Lưu ý**: Supabase KHÔNG cho xem lại key cũ sau khi rotate.
4. Kiểm tra Storage bucket policy:
   - Storage → bucket → Policies → xem có policy nào cho public không.
   - Nếu media MXH là private → chuyển sang signed URL only.
5. Kiểm tra Database logs xem có query lạ không.
6. **Rotate publishable key** (nếu có option) hoặc ít nhất rotate JWT secret:
   - Settings → API → JWT Secret → Generate new.

### 3.3. GitHub (origin)

1. Vào https://github.com/xanhnq05/MXH/settings/secrets (nếu có) để rotate secrets lưu trong repo.
2. **Quan trọng**: dù repo là public, GitHub vẫn có thể có Actions secrets → rotate.
3. Bật "Secret scanning" và "Push protection" trong Settings → Code security and analysis.

### 3.4. Google Cloud (GMAIL OAuth2)

1. Nếu project MXH dùng Gmail API: https://console.cloud.google.com
2. Vào APIs & Services → Credentials
3. **Rotate OAuth Client Secret** cho `ciiwrmrgbephhdwc` (client ID).
4. Re-authorize lại để có refresh_token mới.

---

## 4. Việc NÊN làm trong repo (cleanup Git history)

> ⚠️ Các bước này **phá hủy lịch sử Git**. Chỉ làm khi đã chắc chắn không cần rollback.

Lịch sử Git vẫn chứa giá trị secret cũ. Có 2 lựa chọn:

### Option A: Accept & move on (đơn giản hơn)
- Secret đã rotate trên dịch vụ ngoài → giá trị cũ trong Git history vô giá trị.
- Ghi nhận rủi ro trong báo cáo audit.
- Phù hợp nếu repo ít contributor và bạn đã rotate hết credentials.

### Option B: Rewrite history (chuyên sâu hơn)
Dùng `git filter-repo` (khuyến nghị hơn `filter-branch`):

```bash
# Backup truoc khi thao tac
git clone --mirror https://github.com/xanhnq05/MXH.git MXH-backup.git

# Can cai git-filter-repo: https://github.com/newren/git-filter-repo
# Thay the cac chuoi secret cu bang placeholder
git filter-repo --replace-text expressions.txt --force
# expressions.txt chua cac regex cua cac secret cu

# Force-push len remote
git remote add origin https://github.com/xanhnq05/MXH.git
git push --force --all
git push --force --tags
```

**Cảnh báo:**
- Tất cả collaborator phải re-clone repo sau khi force-push.
- PR / fork cũ vẫn có thể chứa secret. GitHub cần "purge cached views".
- Pull request ID có thay đổi → link cũ hỏng.

### Đề xuất của em
Nếu chỉ có 1-2 contributor và đã rotate hết credentials → **Option A** đủ an toàn.
Nếu có nhiều contributor hoặc secret nằm trong nhiều commit cũ → **Option B** + liên hệ GitHub Support để purge cached views.

---

## 5. Checklist hành động

- [ ] Rotate MongoDB password (`xanhnguyen05_db_user`)
- [ ] Whitelist IP lại cho MongoDB cluster
- [ ] Rotate Supabase secret key
- [ ] Rotate Supabase JWT secret (nếu dùng)
- [ ] Rotate GMAIL OAuth client secret
- [ ] Kiểm tra MongoDB + Supabase access logs (7 ngày qua)
- [ ] Cập nhật `backend/.env` với credentials mới
- [ ] Test app chạy với credentials mới
- [ ] Quyết định: Option A (accept) hay Option B (rewrite history)
- [ ] Bật GitHub secret scanning + push protection
- [ ] Thêm pre-commit hook check secret (gitleaks/talisman)

---

## 6. Phòng tránh tương lai

1. **Pre-commit hook** phát hiện secret (gitleaks hoặc talisman).
2. **CI/CD check**: GitHub Actions chạy `gitleaks detect` trên mỗi PR.
3. **Quy ước đặt tên file**: tất cả config thật → `.env` (gitignored), tài liệu → chỉ dùng placeholder.
4. **Code review**: PR có thay đổi `.env.example` cần review kỹ.
5. **Định kỳ audit** `git log -p | grep -iE "password|secret|key|token" --color=always` để phát hiện leak cũ.

---

## 7. Liên hệ

Nếu phát hiện truy cập lạ hoặc dữ liệu bị xâm phạm:
- MongoDB Atlas: support@mongodb.com
- Supabase: support@supabase.com
- GitHub: trust@github.com (nếu cần purge cached secret)
