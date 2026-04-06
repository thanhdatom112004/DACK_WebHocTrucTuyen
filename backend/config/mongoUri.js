/**
 * Chuỗi MongoDB Atlas: dùng MONGODB_USER + MONGODB_PASSWORD + MONGODB_HOSTS để encode
 * đúng mật khẩu có ký tự đặc biệt; hoặc gán nguyên MONGODB_URI.
 */
require("dotenv").config();

function getMongoUri() {
  const user = process.env.MONGODB_USER;
  const pass = process.env.MONGODB_PASSWORD;
  const hosts = process.env.MONGODB_HOSTS;

  if (user && pass !== undefined && pass !== "" && hosts) {
    const db = process.env.MONGODB_DB || "onlinelearning";
    const rs = process.env.MONGODB_REPLICA_SET;
    const params = new URLSearchParams({
      tls: "true",
      authSource: "admin",
      retryWrites: "true",
      w: "majority",
    });
    if (rs) params.set("replicaSet", rs);
    const appName = process.env.MONGODB_APP_NAME;
    if (appName) params.set("appName", appName);

    return `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${hosts}/${db}?${params.toString()}`;
  }

  return process.env.MONGODB_URI;
}

function requireMongoUri() {
  const uri = getMongoUri();
  if (!uri) {
    console.error(
      "Thiếu kết nối MongoDB: đặt MONGODB_URI hoặc MONGODB_USER + MONGODB_PASSWORD + MONGODB_HOSTS trong backend/.env"
    );
    process.exit(1);
  }
  return uri;
}

module.exports = { getMongoUri, requireMongoUri };
