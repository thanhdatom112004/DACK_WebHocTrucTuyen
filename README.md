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

## Feature #4 — Khóa học & tài nguyên (clone từ `DACK_OnlineLearningWEB`)

- **`GET /api/courses`** — danh sách khóa học (populate category).
- **`GET /api/courses/:id`** — chi tiết khóa học.
- **`POST /api/courses`** (ADMIN) — tạo khóa + bản ghi **inventory** (transaction).
- **`PUT` / `DELETE /api/courses/:id`** (ADMIN).
- **`POST /api/courses/upload-image`** (ADMIN, multipart `file`) — lưu **`/uploads/courses/`**.
- **`utils/uploadHandler.js`**, **`utils/titleHandler.js`**, model **`inventories`**.
- Frontend: **`admin-courses.html`** + **`js/admin-courses.js`**; **`course.html`** đã tải được danh sách qua **`OLApi.courses()`**.

## Feature #5 — Giỏ hàng & thanh toán (clone từ `DACK_OnlineLearningWEB`, nhánh `feature/05-cart-payment`)

- **`/api/carts`** — `GET /get-cart`, `POST /add-cart`, `POST /add-one`, `POST /reduce`, `POST /remove`, `POST /checkout` (đều cần đăng nhập). Checkout demo: ghi **enrollment**, tăng **soldCount** inventory, xóa giỏ.
- **`/api/payment-orders`** — `POST /` tạo đơn từ giỏ (mã chuyển khoản); `GET /` (ADMIN) danh sách; `POST /:id/confirm` (ADMIN) xác nhận → enrollment + inventory + xóa giỏ.
- Models **`carts`**, **`paymentOrders`**, **`enrollments`**.
- Frontend: **`cart.html`**, **`payment.html`**, **`admin-payment-orders.html`** + **`js/cart-page.js`**, **`js/api.js`** (`OLApi.cart*`, `paymentOrder*`).

## Feature #6 — Đăng ký & xem bài (`feature/06-enrollment-watch`)

- **`GET /api/enrollments/mine`** — danh sách khóa đã mua (populate course + category).
- **`middleware/enrollmentHandler.js`** — `requireCourseEnrollment`: ADMIN hoặc đã có enrollment mới gọi quiz.
- **`/api/lesson-quizzes/...`** — quiz theo bài (video): GET làm bài, POST submit, GET my-stats; ADMIN: GET `/full`, PUT, DELETE (soft).
- Models **`lessonQuizzes`**, **`lessonQuizAttempts`**.
- Frontend: **`course-watch.html`** + **`js/course-watch.js`**, **`my-courses.html`** + **`js/my-courses-page.js`**; **`course.html`** / **`index.html`** dùng `enrollmentsMine()` để badge “Đã đăng ký”.

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
