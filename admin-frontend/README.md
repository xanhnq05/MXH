# GreenX Admin Console

Enterprise admin dashboard cho hệ thống GreenX — quản lý người dùng, kiểm duyệt nội dung, báo cáo vi phạm, phân tích chỉ số và audit log.

## 🎨 Design

- **Style**: Enterprise data-table dày, sidebar thu gọn
- **Theme**: Dark + Light mode (slate-50 + slate-950, blue-600 primary)
- **Sidebar**: Dark cố định, main area adapt theo theme
- **Typography**: Inter (sans) + JetBrains Mono (code)
- **Icons**: Lucide React
- **Charts**: Recharts

## 🛣️ Routes

| Path | Page | Mô tả |
|------|------|-------|
| `/login` | LoginPage | Đăng nhập admin |
| `/` | DashboardPage | Tổng quan chỉ số |
| `/users` | UsersPage | Danh sách người dùng |
| `/users/banned` | BannedUsersPage | User đang bị cấm |
| `/users/:id` | UserDetailPage | Chi tiết user + lịch sử |
| `/reports` | ReportsPage | Hộp thư báo cáo |
| `/media` | MediaPage | Quản lý Sticker & GIF |
| `/analytics` | AnalyticsPage | Phân tích chi tiết |
| `/audit` | AuditLogPage | Nhật ký admin |
| `/settings` | SettingsPage | Cấu hình hệ thống |

## 🔌 API Endpoints sử dụng

Xem chi tiết trong `backend/src/routes/admin.route.js` và `backend/src/routes/reports.route.js`.

Tất cả endpoint `/api/admin/*` yêu cầu JWT + admin allowlist (`ADMIN_EMAILS` env).

## 🏃 Chạy local

```bash
# 1. Cài deps
cd admin-frontend
npm install

# 2. Copy env
cp .env.example .env
# Sửa VITE_API_URL nếu cần

# 3. Dev
npm run dev
# → http://localhost:5174

# 4. Build production
npm run build
```

## 🐳 Docker

```bash
# Build image
docker-compose --profile builder up admin-frontend-builder

# Chạy NGINX serve
docker-compose up admin-nginx
# → http://localhost:3001
```

## 🔑 Đăng nhập

- Tài khoản admin phải có email nằm trong `ADMIN_EMAILS` env của backend
- Hoặc ObjectId nằm trong `ADMIN_USER_IDS`
- Sau khi login thành công, hệ thống sẽ kiểm tra quyền admin qua API

## 📦 Tech stack

- **Vite + React 19 + TypeScript**
- **React Router 7** cho routing
- **Zustand** cho state (auth, theme)
- **Axios** cho HTTP + auto refresh token
- **TailwindCSS 3** cho styling
- **shadcn/ui-style** components (custom built)
- **Recharts** cho charts
- **Sonner** cho toast
- **Lucide React** cho icons
