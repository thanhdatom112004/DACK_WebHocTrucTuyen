# DACK_WebHocTrucTuyen

## Feature #1 — Nền tảng (clone từ `DACK_OnlineLearningWEB`)

- **Express**: JSON/cookie, **MongoDB**, chạy **`migrateCourseCategories`** khi khởi động (model `category` hỗ trợ migrate).
- **`GET /api/health`** → `{ "ok": true }`.
- Phục vụ static **`OnlineLearningWeb/`** cùng origin với API.
- **`backend/uploads`** phục vụ tại `/uploads`.
- **Chưa** có API khóa học — trang `course.html` cần feature #4 để tải danh sách khóa học.

## Feature #2 — Xác thực & phân quyền (clone từ `DACK_OnlineLearningWEB`)

- API: **`POST /api/auth/register`**, **`POST /api/auth/login`** (cookie httpOnly + token JSON), **`GET /api/auth/me`** (có **`roleName`**), **`POST /api/auth/logout`**.
- Model **User** / **Role**, middleware JWT **`checkLogin`**.
- **`npm run seed:roles`** — tạo role `ADMIN` / `USER`; tùy chọn user admin qua **`ADMIN_*`** trong `.env`.
- Frontend: `js/login-page.js`, `js/index-register.js`, `js/api.js`, `js/auth-nav.js`, `js/admin-guard.js` — sau đăng nhập: **ADMIN** → `admin-dashboard.html`, **USER** → `course.html`.
- Cần **`JWT_SECRET`** trong `backend/.env`.

## Feature #3 — Danh mục khóa học (clone từ `DACK_OnlineLearningWEB`)

- **`GET /api/categories`** — danh sách category (public).
- **`POST` / `PUT` / `DELETE /api/categories`** — ADMIN; xóa category gỡ `category` trên khóa học (`course.category = null`).
- Model **`courses`** (tối thiểu) + **`utils/courseImageUrl`** phục vụ cascade khi xóa danh mục.
- Frontend: **`admin-categories.html`** + **`js/admin-categories.js`**; **`course.html`** + **`js/course-list.js`** (lọc checkbox — cần **`GET /api/courses`** từ feature #4 để hiển thị đầy đủ).

## Chạy

1. `cd backend`
2. Copy `backend/.env.example` → `backend/.env`, điền `MONGODB_URI` và **`JWT_SECRET`**.
3. `npm install`
4. `npm run seed:roles` (ít nhất một lần)
5. `npm run dev` hoặc `npm start`
6. Mở **`http://localhost:3001/`** — không mở HTML bằng `file://`.

## Cấu trúc

- `backend/` — server Node.js  
- `OnlineLearningWeb/` — giao diện HTML/CSS/JS tĩnh  
