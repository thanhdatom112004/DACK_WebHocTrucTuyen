/**
 * Smoke test: gọi GET /api/health (server phải đang chạy).
 * Usage: npm run test:smoke
 *        hoặc: node scripts/smokeTest.js [port]
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const http = require("http");

const port = Number(process.argv[2] || process.env.PORT || 3001);
const host = process.env.SMOKE_HOST || "127.0.0.1";

const req = http.request(
  {
    hostname: host,
    port,
    path: "/api/health",
    method: "GET",
    timeout: 5000,
  },
  (res) => {
    let body = "";
    res.on("data", (c) => {
      body += c;
    });
    res.on("end", () => {
      if (res.statusCode !== 200) {
        console.error("FAIL: HTTP", res.statusCode, body);
        process.exit(1);
      }
      try {
        const j = JSON.parse(body);
        if (j && j.ok === true) {
          console.log("OK: /api/health", j);
          process.exit(0);
        }
      } catch (e) {
        /* fallthrough */
      }
      console.error("FAIL: unexpected body", body);
      process.exit(1);
    });
  }
);

req.on("error", (e) => {
  console.error("FAIL: không kết nối được tới http://" + host + ":" + port + " — " + e.message);
  console.error("Hãy chạy server: npm run dev hoặc npm start");
  process.exit(1);
});

req.on("timeout", () => {
  req.destroy();
  console.error("FAIL: timeout");
  process.exit(1);
});

req.end();
