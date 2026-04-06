# Cập nhật: Enrollment + Quiz + Thông báo tiếng Việt

Tài liệu này ghi lại **những thay đổi đã làm** trong dự án liên quan đến việc **chỉ học viên đã mua khóa (có bản ghi enrollment)** mới được làm quiz / xem điểm / nộp bài, và **đồng bộ thông báo tiếng Việt có dấu**.

---

## Mục tiêu nghiệp vụ

- Học viên **chưa thanh toán / chưa có enrollment** cho khóa học đó → **không** được:
  - Lấy đề quiz để làm bài
  - Xem thống kê điểm (`my-stats`)
  - Nộp bài (`submit`)
- Tương đương: **chỉ người đã “mua” (checkout tạo enrollment)** mới dùng được các chức năng trên.
- **ADMIN** (role có tên `ADMIN`, so sánh không phân biệt hoa thường) **bỏ qua** kiểm tra enrollment khi truy cập các route đã gắn middleware.
- Route quiz **đầy đủ có đáp án** (`/full`) vẫn **chỉ dành cho ADMIN** (không đổi logic enrollment ở đó).

---

## File đã thêm / sửa

### 1. `backend/middleware/enrollmentHandler.js` *(mới)*

- Export middleware **`requireCourseEnrollment`**:
  - Chạy **sau** `checkLogin` (cần `req.userId`).
  - Lấy `courseId` từ `req.params.courseId`.
  - Nếu user là **ADMIN** → `next()`.
  - Ngược lại, tìm `enrollment` theo `user` + `course`.
  - Không có enrollment → **`403`** với `message` tiếng Việt **có dấu** (phiên bản hiện tại):

    > Bạn cần mua khóa học (thanh toán trong giỏ hàng) để làm quiz, xem điểm và nộp bài.

---

### 2. `backend/routes/lessonQuizzes.js` *(sửa)*

- Import `requireCourseEnrollment` từ `../middleware/enrollmentHandler`.
- Gắn **`checkLogin` + `requireCourseEnrollment`** cho:
  - **`GET /:courseId/:lessonId`** — lấy quiz để học viên làm (không lộ đáp án trong phần sanitize).
  - **`GET /:courseId/:lessonId/my-stats`** — thống kê điểm của user hiện tại.
  - **`POST /:courseId/:lessonId/submit`** — nộp bài, chấm điểm, trả `review` sau khi nộp.
- Các route **ADMIN** giữ nguyên:
  - **`GET /:courseId/:lessonId/full`** — `checkLogin` + `checkRole("ADMIN")`.
  - **`PUT` / `DELETE /:courseId/:lessonId`** — quiz CRUD cho admin.

**Lưu ý thứ tự route Express:** các path cụ thể (`/full`, `/my-stats`, `/submit`) đặt **trước** `GET /:courseId/:lessonId` để không bị route động “nuốt” nhầm.

---

### 3. `OnlineLearningWeb/js/course-watch.js` *(sửa)*

- **`loadQuizPanel`**:
  - **Không có token** → hiển thị cảnh báo, link **Đăng nhập** / **Giỏ hàng**, **không** gọi API quiz; xóa text thống kê quiz nếu có.
  - **Có token** nhưng API lỗi (ví dụ **403** chưa mua khóa) → hiển thị lỗi + link **Giỏ hàng** / **Khóa đã mua**; xóa thống kê quiz cho đồng bộ UI.
- Fallback lỗi tải quiz: **“Không tải được bài kiểm tra.”** (thay cho “quiz” không formal).
- Đã bỏ luồng cho phép **khách vẫn làm thử quiz** khi chưa đăng nhập / chưa mua.

---

### 4. `OnlineLearningWeb/js/api.js` *(tham chiếu, không đổi logic enrollment)*

- Các hàm gọi API quiz vẫn trỏ đúng:
  - `lessonQuizGet` → `GET /api/lesson-quizzes/:courseId/:lessonId`
  - `lessonQuizStats` → `GET .../my-stats`
  - `lessonQuizSubmit` → `POST .../submit`
  - `lessonQuizGetFull` → `GET .../full` (admin)

---

## Kiểm tra nhanh sau khi triển khai

1. User **chưa mua** khóa → gọi quiz / stats / submit → **403** + message tiếng Việt có dấu; trang `course-watch` hiển thị đúng hướng dẫn.
2. Sau **checkout**, có **`enrollment`** đúng `courseId` → các API trên **200** bình thường.
3. **ADMIN** → vẫn qua enrollment cho các route đã gắn middleware; vẫn dùng `/full` để xem đáp án đầy đủ.

---

## Gợi ý liên quan (chưa bắt buộc trong code)

- Đảm bảo luồng **`POST /api/carts/checkout`** (hoặc tương đương) **luôn tạo** bản ghi **`enrollments`** đúng `user` + `course`.
- Sau khi thanh toán, user có thể cần **tải lại** trang học (`course-watch.html`) để panel quiz gọi API lại.

---

*Tài liệu được tạo để đồng bộ nội bộ team; cập nhật khi có thay đổi thêm.*
