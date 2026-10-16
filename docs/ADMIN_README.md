# GreenX — MXH (Mạng Xã Hội)

Hệ thống mạng xã hội với **2 frontend tách biệt**:

| App | Port | Đường dẫn | Mô tả |
|-----|------|-----------|-------|
| **User app** (GreenX) | 5173 → 3000 | `frontend/` | Mạng xã hội chính: feed, chat, post, friend |
| **Admin console** (GreenX Admin) | 5174 → 3001 | `admin-frontend/` | Quản trị: user, reports, media, audit, analytics |
| **Backend API** | 5001 | `backend/` | Express + MongoDB + Socket.IO + Supabase |

## 🚀 Khởi động nhanh

```bash
# 1. Backend
cd backend
npm install
npm run dev
# → http://localhost:5001

# 2. User frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173

# 3. Admin frontend
cd admin-frontend
npm install
npm run dev
# → http://localhost:5174
```

## 🐛 Chạy với Docker

```bash
# Build + chạy full stack
docker-compose up

# Build admin frontend
docker-compose --profile builder up admin-frontend-builder
docker-compose up admin-nginx
# → http://localhost:3001 (admin)
# → http://localhost:3000 (user)
```

## 👤 Tài khoản admin

Thêm email vào `ADMIN_EMAILS` env trong `.env` (cả backend) hoặc `VITE_ADMIN_EMAILS` (user frontend) để có quyền admin.

## 🏗️ Kiến trúc Admin

### Backend (Node.js + Express + Mongoose)
- **Models**: `User`, `Ban`, `Report`, `AdminAuditLog`, `MediaAsset`
- **Routes**:
  - `GET /api/admin/users` - List users
  - `POST /api/admin/users/:id/ban` - Ban user
  - `POST /api/admin/users/:id/unban` - Unban
  - `POST /api/admin/users/:id/warn` - Warn
  - `GET /api/admin/reports` - List reports
  - `POST /api/admin/reports/:id/resolve` - Resolve report
  - `GET /api/admin/analytics/overview` - Dashboard stats
  - `GET /api/admin/audit-logs` - Admin actions log
  - `GET/POST/PATCH/DELETE /api/admin/media/*` - Sticker & GIF CRUD
  - `POST /api/reports` (user) - Gửi report
- **Services**: ban, adminUsers, reports, analytics, audit

### Admin Frontend (React 19 + Vite + Tailwind)
- **Pages**: Dashboard, Users, BannedUsers, UserDetail, Reports, Media, Analytics, Audit, Settings, Login
- **Components**: AdminLayout (sidebar + topbar), DataTable (generic), 3 dialog (Ban/Unban/Warn), ReportDetail, MediaEdit, MediaUpload
- **Theme**: Enterprise dark/light (slate-50/950 + blue-600)
- **Charts**: Recharts

## 📋 Tính năng

### ✅ Đã triển khai
- Quản lý user (list/search/filter/sort/export CSV)
- Ban/Unban user với lý do, category, scope, expiresAt
- Warn user (ghi nhận cảnh báo)
- Soft-delete user
- Bảng reports với status workflow (open → reviewing → resolved/dismissed)
- Quick resolve: ban user, delete content, warn, dismiss
- Quản lý Sticker & GIF (CRUD + upload)
- Analytics dashboard (charts: user growth, message volume, reports)
- Audit log (mọi admin action)
- User gửi report từ user app
- Theme dark/light
- Auth guard với admin check

### 🔜 Sẽ triển khai tiếp (đề xuất)
- Posts/Comments moderation
- Real-time notification cho admin (Socket.IO)
- Impersonate user
- Force logout
- System config UI
- Bulk action trên DataTable
- Export audit log CSV
- Auto-flag rule (≥3 report/24h)
- Email notification
- 2FA cho admin

## 🎨 Design Tokens

| Token | Light | Dark |
|-------|-------|------|
| Background | slate-50 (`210 40% 98%`) | slate-950 (`222 47% 6%`) |
| Card | white | slate-900 |
| Primary | blue-600 | blue-500 |
| Sidebar | slate-900 (cố định) | slate-950 (cố định) |
| Border | slate-200 | slate-800 |

Typography: **Inter** (sans) + **JetBrains Mono** (code)
Icons: **Lucide React**
