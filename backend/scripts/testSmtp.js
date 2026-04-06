/**
 * Kiểm tra SMTP: node scripts/testSmtp.js [email_nhận_thử]
 * Mặc định gửi tới SMTP_USER nếu không truyền đối số.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { verifySmtpConnection, sendPasswordResetOtp } = require("../utils/mailHandler");
const { generateSixDigitOtp } = require("../utils/otp");

async function main() {
  const to = process.argv[2] || process.env.SMTP_USER;
  if (!to) {
    console.error("Thiếu email đích. Dùng: npm run test:smtp -- your@email.com");
    console.error("Hoặc đặt SMTP_USER trong .env");
    process.exit(1);
  }

  try {
    console.log("Đang kiểm tra kết nối SMTP...");
    await verifySmtpConnection();
    console.log("OK: Kết nối SMTP thành công.");

    const demoOtp = generateSixDigitOtp();
    console.log("Đang gửi email thử tới:", to, "| mã trong mail:", demoOtp);
    await sendPasswordResetOtp(to, demoOtp);
    console.log("OK: Đã gửi. Kiểm tra hộp thư (và spam).");
  } catch (e) {
    console.error("Lỗi:", e.message || e);
    process.exit(1);
  }
}

main();
