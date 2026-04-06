const crypto = require("crypto");

/**
 * Mã OTP 6 chữ số (000001–999999), ngẫu nhiên cryptographically secure.
 * Không sinh 000000 để tránh nhầm với email thử SMTP cũ / nhập nhầm.
 */
function generateSixDigitOtp() {
  return String(crypto.randomInt(1, 1000000)).padStart(6, "0");
}

module.exports = { generateSixDigitOtp };
