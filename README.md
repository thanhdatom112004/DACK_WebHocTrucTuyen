# DACK_WebHocTrucTuyen

## Feature #1 — Nền tảng (clone từ `DACK_OnlineLearningWEB`)

- **Express**: JSON/cookie, **MongoDB**, chạy **`migrateCourseCategories`** khi khởi động (model `category` hỗ trợ migrate).
- **`GET /api/health`** → `{ "ok": true }`.
- Phục vụ static **`OnlineLearningWeb/`** cùng origin với API.
- **`backend/uploads`** phục vụ tại `/uploads`.
- **Chưa** mount `/api/auth`, `/api/courses`, … (các feature sau).

## Chạy

1. `cd backend`
2. Copy `backend/.env.example` → `backend/.env`, điền `MONGODB_URI` (Atlas hoặc local).
3. `npm install`
4. `npm run dev` hoặc `npm start`
5. Mở **`http://localhost:3001/`** — không mở HTML bằng `file://`.

## Cấu trúc

- `backend/` — server Node.js  
- `OnlineLearningWeb/` — giao diện HTML/CSS/JS tĩnh  
