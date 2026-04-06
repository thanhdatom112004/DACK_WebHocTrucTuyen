const nodemailer = require("nodemailer");

/**
 * Cấu hình SMTP từ biến môi trường.
 * - Port 465: thường dùng SSL (secure: true).
 * - Port 587: STARTTLS (secure: false, requireTLS: true) — Gmail, Outlook phổ biến.
 * Ghi đè bằng SMTP_SECURE=true|false nếu cần.
 */
function buildSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT || 587);

  let secure = process.env.SMTP_SECURE;
  if (secure === undefined || secure === "") {
    secure = port === 465;
  } else {
    secure =
      String(secure).toLowerCase() === "true" ||
      secure === "1" ||
      String(secure).toLowerCase() === "yes";
  }

  const cfg = {
    host,
    port,
    secure,
    auth: { user, pass },
  };

  if (!secure && (port === 587 || port === 25)) {
    cfg.requireTLS = true;
  }

  const rejectUnauthorized = process.env.SMTP_TLS_REJECT_UNAUTHORIZED;
  if (rejectUnauthorized !== undefined && rejectUnauthorized !== "") {
    cfg.tls = {
      rejectUnauthorized: String(rejectUnauthorized).toLowerCase() !== "false",
    };
  }

  return cfg;
}

function assertSmtpConfigured() {
  const cfg = buildSmtpConfig();
  if (!cfg) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in backend/.env (see backend/.env.example)."
    );
  }
  return cfg;
}

/** Transporter dùng cho mọi hàm gửi mail */
function getSmtpTransport() {
  assertSmtpConfigured();
  return nodemailer.createTransport(buildSmtpConfig());
}

/**
 * Kiểm tra kết nối SMTP (dùng cho script test hoặc health).
 */
async function verifySmtpConnection() {
  const t = getSmtpTransport();
  try {
    await t.verify();
    return true;
  } finally {
    try {
      t.close();
    } catch (e) {}
  }
}

async function sendMail(to, url) {
  const transporter = getSmtpTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@localhost";
  try {
    return await transporter.sendMail({
      from,
      to,
      subject: "Reset Password email",
      text: "click vao day de reset password",
      html: 'click vao <a href="' + url + '">day</a> de reset password',
    });
  } finally {
    try {
      transporter.close();
    } catch (e) {}
  }
}

/**
 * Gửi mã OTP đặt lại mật khẩu (6 chữ số).
 */
async function sendPasswordResetOtp(to, otpCode) {
  const transporter = getSmtpTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@localhost";
  const minutes = Number(process.env.PASSWORD_RESET_OTP_MINUTES || 10);

  const text =
    "Mã OTP đặt lại mật khẩu của bạn là: " +
    otpCode +
    ". Mã có hiệu lực trong " +
    minutes +
    " phút. Không chia sẻ mã này với bất kỳ ai.";

  const html =
    "<p>Xin chào,</p>" +
    '<p>Mã OTP đặt lại mật khẩu của bạn là: <strong style="font-size:18px;letter-spacing:2px">' +
    otpCode +
    "</strong></p>" +
    "<p>Mã có hiệu lực trong <strong>" +
    minutes +
    "</strong> phút.</p>" +
    "<p>Vui lòng không chia sẻ mã này với bất kỳ ai.</p>";

  try {
    return await transporter.sendMail({
      from,
      to,
      subject: "Mã OTP đặt lại mật khẩu",
      text,
      html,
    });
  } finally {
    try {
      transporter.close();
    } catch (e) {}
  }
}

/**
 * OTP xác thực địa chỉ email (đăng nhập trong profile).
 */
async function sendEmailVerificationOtp(to, otpCode) {
  const transporter = getSmtpTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@localhost";
  const minutes = Number(process.env.EMAIL_VERIFY_OTP_MINUTES || 15);

  const text =
    "Mã OTP xác thực email của bạn là: " +
    otpCode +
    ". Mã có hiệu lực trong " +
    minutes +
    " phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.";

  const html =
    "<p>Xin chào,</p>" +
    '<p>Mã OTP xác thực email tài khoản StudyLab của bạn là: <strong style="font-size:18px;letter-spacing:2px">' +
    otpCode +
    "</strong></p>" +
    "<p>Mã có hiệu lực trong <strong>" +
    minutes +
    "</strong> phút.</p>" +
    "<p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua.</p>";

  try {
    return await transporter.sendMail({
      from,
      to,
      subject: "Mã OTP xác thực email",
      text,
      html,
    });
  } finally {
    try {
      transporter.close();
    } catch (e) {}
  }
}

module.exports = {
  buildSmtpConfig,
  getSmtpTransport,
  verifySmtpConnection,
  sendMail,
  sendPasswordResetOtp,
  sendEmailVerificationOtp,
};
