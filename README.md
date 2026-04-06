# DACK_WebHocTrucTuyen

## Feature #1 — Nền tảng (đã clone)

- Express, phục vụ static `OnlineLearningWeb/`
- MongoDB + `migrateCourseCategories` (cần collection `courses` khi có dữ liệu)
- `GET /api/health` → `{ "ok": true }`
- **Chưa** mount các route `/api/auth`, `/api/courses`, … (các feature sau)

## Chạy

1. `cd backend`
2. Copy `backend/.env.example` → `backend/.env`, điền `MONGODB_URI` (và `JWT_SECRET` khi cần feature auth).
3. `npm install`
4. `npm run dev` hoặc `npm start`
5. Mở trình duyệt: `http://localhost:3001/` (cùng origin với API; không mở file HTML trực tiếp bằng `file://`).

## Cấu trúc

- `backend/` — server Node.js
- `OnlineLearningWeb/` — template HTML/CSS/JS tĩnh
