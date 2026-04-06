# DACK_WebHocTrucTuyen

Web học trực tuyến — khởi tạo theo từng feature branch.

## Feature `01-foundation` (đã có trong repo này)

- Backend **Express**: JSON/cookie, **MongoDB** (`mongoose`), migration `course.category` khi có collection `courses`, **`GET /api/health`**, phục vụ static **`OnlineLearningWeb/`**.
- **Chưa có** API auth/courses/… và **chưa có** Socket.io (thêm ở các feature sau).

## Chạy local

1. Cài **MongoDB** local hoặc dùng Atlas.
2. Trong thư mục `backend/`:
   - Copy `.env.example` → `.env`, chỉnh `MONGODB_URI` (nên có tên DB trong path, ví dụ `.../onlinelearning?...`).
   - `npm install`
   - `npm run dev` hoặc `npm start`
3. Mở trình duyệt: **`http://localhost:3001/`** (hoặc `PORT` trong `.env`). Không mở file HTML bằng `file://`.

## Kiểm tra nhanh

- `GET http://localhost:3001/api/health` → `{ "ok": true }`
- Trang chủ template load từ static.
