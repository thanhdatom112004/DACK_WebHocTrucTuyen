/**
 * Kiểm tra biến môi trường tối thiểu trước khi chạy server hoặc deploy.
 * Usage: node scripts/checkEnv.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { requireMongoUri } = require("../config/mongoUri");

function main() {
  const missing = [];
  if (!process.env.JWT_SECRET || String(process.env.JWT_SECRET).trim() === "") {
    missing.push("JWT_SECRET");
  }
  try {
    requireMongoUri();
  } catch (e) {
    console.error("MONGODB_URI:", e.message || e);
    process.exit(1);
  }
  if (missing.length) {
    console.error("Thiếu biến môi trường:", missing.join(", "));
    process.exit(1);
  }
  console.log("OK: JWT_SECRET và MONGODB_URI đã cấu hình.");
  process.exit(0);
}

main();
