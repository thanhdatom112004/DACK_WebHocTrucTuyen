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
- Frontend: **`course-watch.html`** + **`js/course-watch.js`**, **`my-courses.html`** + **`js/my-courses-page.js`**; **`course.html`** / **`index.html`** dùng `enrollmentsMine()` để badge “Đã đăng ký”. Trang **admin soạn quiz** nằm ở Feature #7.

## Feature #7 — Quiz bài học (`feature/07-quizzes`)

- **API** `GET/POST .../api/lesson-quizzes/...` đã nằm trong Feature #6; feature này gói **quản trị quiz** và **tài liệu nghiệp vụ**.
- **`admin-lesson-quizzes.html`** + **`js/admin-lesson-quizzes.js`** — chọn khóa → chọn bài (video), thêm câu **MCQ** / **flashcard**, lưu qua **`OLApi.lessonQuizUpsert`**, tải đáp án qua **`lessonQuizGetFull`**, xóa mềm qua **`lessonQuizDelete`**. Bảo vệ admin: **`js/admin-guard.js`** (`alq-alert`).
- **`CAP-NHAT-ENROLLMENT-QUIZ.md`** — mô tả middleware enrollment, route quiz, hành vi `course-watch.js`, checklist kiểm tra.

## Feature #8 — Hồ sơ & bảo mật (`feature/08-profile-security`)

- **`PUT /api/auth/profile`** — cập nhật username, fullName, avatarUrl (không đổi email).
- **`POST /api/auth/profile/avatar`** — multipart `file` → `/uploads/chat/`.
- **`POST /api/auth/changepassword`** — đổi mật khẩu (tối thiểu 8 ký tự; pre-save hash bcrypt).
- **`POST /api/auth/forgotpassword`** / **`POST /api/auth/resetpassword`** — OTP 6 số qua email (cần **SMTP** trong `.env`).
- **`POST /api/auth/verify-email/send-otp`** / **`confirm`** — xác thực email khi đăng nhập.
- **`utils/mailHandler.js`**, **`utils/otp.js`**; **`npm run test:smtp`** — kiểm tra gửi mail.
- **`GET/DELETE /api/users`** — ADMIN (danh sách / xóa mềm), dùng với **`admin-users.html`**.
- Frontend: **`profile.html`**, **`js/profile-page.js`**, **`forgot-password.html`**, **`js/forgot-password.js`**, **`login.html`** link quên mật khẩu.

## Feature #9 — Chat (`feature/09-chat`)

- **`/api/messages`** — `POST /` (JSON hoặc multipart ảnh), `GET /conversations`, `GET /with/:userId`, `GET /admins`, `POST /:id/recall`; **`/support/config`**, **`/support/thread`**, **`/support/inbox`** (ADMIN).
- **`socket.io`** — `bin/www.js` gọi **`SocketServer`**: sự kiện `private_message`, `new_message`, room `user:*` và `admins`.
- Model **`messages`**, **`controllers/messages`**, **`utils/chatHandler.js`**, **`utils/messageSocketEmit.js`**, **`utils/supportUser.js`** (inbox hỗ trợ hoặc **`SUPPORT_USER_ID`** trong `.env`).
- Frontend: **`js/chat-widget.js`** (Socket.IO client), **`admin-chat.html`** + **`js/admin-chat.js`**.

## Feature #10 — Cấu hình & kiểm thử (`feature/10-config-test`)

- **`app.js`** — thứ tự giống gốc: mount toàn bộ **`/api/*`** trước, sau đó **`/uploads`**, **`GET /api/health`**, rồi static **`OnlineLearningWeb/`**.
- **`GET /api/roles`** — CRUD role (ADMIN): **`routes/roles.js`**, mount **`/api/roles`**.
- **Script kiểm tra**
  - **`npm run check:env`** — `scripts/checkEnv.js`: **`JWT_SECRET`**, **`MONGODB_URI`** (hoặc bộ Atlas trong `config/mongoUri.js`).
  - **`npm run test:smoke`** — `scripts/smokeTest.js`: gọi **`GET /api/health`** (cần server đang chạy; mặc định port **`PORT`** hoặc **3001**).
  - Giữ **`npm run test:smtp`** (feature #8) khi cần kiểm tra SMTP.
- **`.gitignore`** — bỏ qua **`.env`**, **`node_modules`**, **`backend/uploads/`**.

## Chạy

1. `cd backend`
2. Copy `backend/.env.example` → `backend/.env`, điền `MONGODB_URI` và **`JWT_SECRET`**.
3. `npm install`
4. `npm run seed:roles` (ít nhất một lần)
5. (Tuỳ chọn) `npm run check:env` — xác nhận biến môi trường tối thiểu.
6. `npm run dev` hoặc `npm start`
7. (Tuỳ chọn) terminal khác: `npm run test:smoke` — kiểm tra **`GET /api/health`**.
8. Mở **`http://localhost:3001/`** — không mở HTML bằng `file://`.

## Cấu trúc

- `backend/` — server Node.js  
- `OnlineLearningWeb/` — giao diện HTML/CSS/JS tĩnh  
