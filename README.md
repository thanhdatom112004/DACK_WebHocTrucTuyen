# DACK_WebHocTrucTuyen

Web học trực tuyến — khởi tạo theo từng feature branch.

## Feature `01-foundation`

- Backend **Express**: JSON/cookie, **MongoDB**, migration `course.category`, **`GET /api/health`**, static **`OnlineLearningWeb/`**.

## Feature `02-auth` (Epic: Xác thực người dùng & phân quyền)

- API: **`POST /api/auth/register`**, **`POST /api/auth/login`** (cookie + token JSON), **`GET /api/auth/me`** (có **`roleName`**), **`POST /api/auth/logout`**.
- Model **User** / **Role**, middleware **JWT** (`checkLogin`).
- Script **`npm run seed:roles`** — tạo role `ADMIN` / `USER`; tùy chọn tạo user admin qua biến `ADMIN_*` trong `.env`.
- Frontend (đã có trong `OnlineLearningWeb/`): **`login-page.js`**, **`index-register.js`**, **`api.js`**, **`auth-nav.js`**, **`admin-guard.js`** — đăng nhập xong: **ADMIN** → `admin-dashboard.html`, **USER** → `course.html`.

## Chạy local

1. Cài **MongoDB** local hoặc dùng Atlas.
2. Trong `backend/`:
   - Copy `.env.example` → `.env`, chỉnh `MONGODB_URI`, **`JWT_SECRET`**.
   - `npm install`
   - `npm run seed:roles` (ít nhất một lần để có role; có thể bật `ADMIN_*` để tạo tài khoản admin).
   - `npm run dev` hoặc `npm start`
3. Mở **`http://localhost:3001/`** — không dùng `file://`.

## Kiểm tra nhanh

- `GET /api/health` → `{ "ok": true }`
- Đăng ký trên `index.html`, đăng nhập `login.html`, gọi `/api/auth/me` có `roleName`.
