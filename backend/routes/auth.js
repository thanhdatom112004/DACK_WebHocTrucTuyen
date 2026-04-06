const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { checkLogin } = require("../middleware/authHandler");
const { userPostValidation, validateResult } = require("../middleware/validationHandler");

const userController = require("../controllers/users");
const userModel = require("../models/users");
const roleModel = require("../models/roles");
const { sendPasswordResetOtp, sendEmailVerificationOtp } = require("../utils/mailHandler");
const { generateSixDigitOtp } = require("../utils/otp");
const { uploadChatImage } = require("../utils/uploadHandler");

/** Quên/đặt lại mật khẩu: tìm user theo email hoặc tên đăng nhập (không có @) */
async function findUserByEmailOrUsername(raw) {
  const id = raw != null ? String(raw).trim() : "";
  if (!id) return null;
  if (id.indexOf("@") !== -1) {
    return userModel.findOne({ email: id.toLowerCase(), isDeleted: false });
  }
  return userModel.findOne({ username: id, isDeleted: false });
}

function maskEmailHint(email) {
  const e = String(email || "").trim();
  const at = e.indexOf("@");
  if (at < 1) return "";
  return e[0] + "***" + e.slice(at);
}

/** Đảm bảo role có { name } (populate lỗi / user tạo tay trong DB vẫn có tên role cho frontend). */
async function ensureRolePopulated(user) {
  if (!user) return user;
  const lean = user.toObject ? user.toObject() : user;
  const r = lean.role;
  if (r && typeof r === "object" && r.name) return user;
  const rid = r && r._id ? r._id : r;
  if (!rid) return user;
  const roleDoc = await roleModel.findOne({ _id: rid, isDeleted: false }).select("name").lean();
  if (roleDoc) {
    user.role = { _id: roleDoc._id, name: roleDoc.name };
  }
  return user;
}

function withRoleName(rest) {
  if (!rest || typeof rest !== "object") return rest;
  const name =
    rest.role && typeof rest.role === "object" && rest.role.name
      ? String(rest.role.name)
      : "";
  rest.roleName = name;
  return rest;
}

// POST /api/auth/register
router.post("/register", userPostValidation, validateResult, async function (req, res, next) {
  try {
    const { username, password, email, avatarUrl } = req.body;

    // Auto-assign role USER; if missing, create it automatically
    const userRole = await roleModel.findOneAndUpdate(
      { name: "USER" },
      {
        $set: { isDeleted: false },
        $setOnInsert: { name: "USER", description: "Normal user" },
      },
      { new: true, upsert: true }
    );

    const newUser = await userController.CreateAnUser(
      username,
      password,
      email,
      userRole._id,
      "",
      avatarUrl || "",
      false,
      undefined
    );

    let populatedUser = await userController.FindByID(newUser._id);
    populatedUser = await ensureRolePopulated(populatedUser);
    res.send(withRoleName(safeUserDoc(populatedUser)));
  } catch (e) {
    const msg = String(e.message || e);
    if (msg.indexOf("E11000") !== -1 || msg.indexOf("duplicate key") !== -1) {
      if (msg.indexOf("username") !== -1) {
        return res.status(400).send({
          message:
            "Tên đăng nhập đã tồn tại. Hãy đăng nhập hoặc dùng tên khác.",
        });
      }
      if (msg.indexOf("email") !== -1) {
        return res.status(400).send({
          message: "Email đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.",
        });
      }
      return res.status(400).send({
        message: "Tên đăng nhập hoặc email đã tồn tại. Vui lòng kiểm tra lại.",
      });
    }
    res.status(400).send({ message: msg });
  }
});

// POST /api/auth/login — username hoặc email + password
router.post("/login", async function (req, res, next) {
  try {
    const { username, password } = req.body;
    const raw = username != null ? String(username).trim() : "";
    if (!raw) {
      return res.status(400).send({ message: "Vui lòng nhập tên đăng nhập hoặc email" });
    }

    let getUser = null;
    if (raw.indexOf("@") !== -1) {
      getUser = await userController.FindByEmail(raw.toLowerCase());
    } else {
      getUser = await userController.FindByUsername(raw);
    }

    if (!getUser) {
      return res.status(404).send({ message: "Thông tin đăng nhập không đúng." });
    }

    let result = false;
    try {
      result = bcrypt.compareSync(password, getUser.password);
    } catch (e) {
      result = false;
    }

    // Backward compatibility: user inserted manually with plaintext password.
    // If plaintext matches, re-save user to trigger pre-save hash.
    if (!result && getUser.password === password) {
      getUser.password = password;
      await getUser.save();
      result = true;
    }

    if (!result) {
      return res.status(404).send({ message: "Thông tin đăng nhập không đúng." });
    }

    let token = jwt.sign(
      {
        id: getUser._id,
        exp: Date.now() + 3600 * 1000,
      },
      process.env.JWT_SECRET || "HUTECH"
    );

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 60 * 60 * 1000,
    });
    let populatedUser = await userController.FindByID(getUser._id);
    populatedUser = await ensureRolePopulated(populatedUser);
    res.send({ token, user: withRoleName(safeUserDoc(populatedUser)) });
  } catch (e) {
    res.status(500).send({ message: String(e.message || e) });
  }
});

/** Tài khoản cũ không có field emailVerified → coi như đã xác thực */
function isEmailVerified(userDoc) {
  if (!userDoc) return false;
  const v = userDoc.emailVerified;
  if (v === true) return true;
  if (v === false) return false;
  return true;
}

function safeUserDoc(user) {
  if (!user) return null;
  const o = user.toObject ? user.toObject() : user;
  const { password: _p, ...rest } = o;
  rest.emailVerified = isEmailVerified(user);
  return rest;
}

// GET /api/auth/me
router.get("/me", checkLogin, async function (req, res, next) {
  let user = await userController.FindByID(req.userId);
  if (!user) return res.status(404).send({ message: "user not found" });
  user = await ensureRolePopulated(user);
  res.send(withRoleName(safeUserDoc(user)));
});

// PUT /api/auth/profile — cập nhật thông tin (không cho đổi email)
router.put("/profile", checkLogin, async function (req, res, next) {
  try {
    if (req.body && req.body.email !== undefined) {
      return res.status(400).send({ message: "Không được thay đổi email" });
    }

    const user = await userModel.findOne({ _id: req.userId, isDeleted: false });
    if (!user) return res.status(404).send({ message: "user not found" });

    const { username, fullName, avatarUrl } = req.body;

    if (username !== undefined) {
      const u = String(username).trim();
      if (!u) return res.status(400).send({ message: "Tên đăng nhập không được để trống" });
      if (u !== user.username) {
        const taken = await userModel.findOne({
          username: u,
          isDeleted: false,
          _id: { $ne: user._id },
        });
        if (taken) return res.status(400).send({ message: "Tên đăng nhập đã được sử dụng" });
      }
      user.username = u;
    }

    if (fullName !== undefined) {
      user.fullName = String(fullName).trim();
    }

    if (avatarUrl !== undefined) {
      const a = String(avatarUrl).trim();
      if (a === "") {
        user.avatarUrl = "https://i.sstatic.net/l60Hf.png";
      } else if (
        !/^https?:\/\//i.test(a) &&
        !a.startsWith("data:") &&
        !a.startsWith("/")
      ) {
        return res.status(400).send({
          message: "Avatar phải là URL (http/https), đường dẫn /uploads/... hoặc data URL",
        });
      } else {
        user.avatarUrl = a;
      }
    }

    await user.save();
    const populated = await userController.FindByID(user._id);
    res.send(safeUserDoc(populated));
  } catch (e) {
    res.status(400).send({ message: String(e.message || e) });
  }
});

// POST /api/auth/profile/avatar — upload ảnh đại diện (multipart field: file)
router.post("/profile/avatar", checkLogin, uploadChatImage.single("file"), async function (req, res) {
  try {
    if (!req.file) {
      return res.status(400).send({ message: "Vui long chon file anh" });
    }
    const rel = "/uploads/chat/" + req.file.filename;
    const user = await userModel.findOne({ _id: req.userId, isDeleted: false });
    if (!user) return res.status(404).send({ message: "user not found" });
    user.avatarUrl = rel;
    await user.save();
    const populated = await userController.FindByID(user._id);
    res.send(safeUserDoc(populated));
  } catch (e) {
    res.status(400).send({ message: String(e.message || e) });
  }
});

// POST /api/auth/logout
router.post("/logout", checkLogin, function (req, res, next) {
  res.cookie("token", null, { maxAge: 0, httpOnly: true });
  res.send("logout");
});

// POST /api/auth/changepassword
router.post("/changepassword", checkLogin, async function (req, res, next) {
  try {
    let { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).send({ message: "Cần nhập mật khẩu cũ và mật khẩu mới" });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).send({ message: "Mật khẩu mới tối thiểu 8 ký tự" });
    }

    let user = await userModel.findOne({ _id: req.userId, isDeleted: false });
    if (!user) return res.status(404).send({ message: "user not found" });

    let ok = false;
    try {
      ok = bcrypt.compareSync(oldPassword, user.password);
    } catch (e) {
      ok = false;
    }
    if (!ok && user.password === oldPassword) {
      ok = true;
    }

    if (!ok) {
      return res.status(403).send({ message: "Mật khẩu cũ không đúng" });
    }

    user.password = newPassword;
    await user.save();
    res.send({ ok: true, message: "Đã cập nhật mật khẩu" });
  } catch (e) {
    res.status(400).send({ message: String(e.message || e) });
  }
});

// POST /api/auth/verify-email/send-otp — gửi OTP xác thực email (đã đăng nhập)
router.post("/verify-email/send-otp", checkLogin, async function (req, res) {
  try {
    const user = await userModel.findOne({ _id: req.userId, isDeleted: false });
    if (!user) return res.status(404).send({ message: "user not found" });
    if (isEmailVerified(user)) {
      return res.status(400).send({ message: "Email đã được xác thực." });
    }

    const otp = generateSixDigitOtp();
    await sendEmailVerificationOtp(user.email, otp);

    const salt = await bcrypt.genSalt(10);
    user.emailVerifyOtpHash = await bcrypt.hash(otp, salt);
    const minutes = Math.min(60, Math.max(1, Number(process.env.EMAIL_VERIFY_OTP_MINUTES || 15)));
    user.emailVerifyOtpExp = new Date(Date.now() + minutes * 60 * 1000);
    await user.save();

    res.json({ ok: true, message: "Đã gửi mã OTP tới email của bạn." });
  } catch (e) {
    console.error("[auth/verify-email/send-otp]", e.message || e);
    res.status(500).send({ message: String(e.message || e) });
  }
});

// POST /api/auth/verify-email/confirm — body: { otp }
router.post("/verify-email/confirm", checkLogin, async function (req, res) {
  try {
    const otp = req.body && req.body.otp !== undefined ? String(req.body.otp).trim() : "";
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).send({ message: "Mã OTP phải gồm 6 chữ số" });
    }

    const user = await userModel.findOne({ _id: req.userId, isDeleted: false });
    if (!user) return res.status(404).send({ message: "user not found" });

    if (isEmailVerified(user)) {
      const populated = await userController.FindByID(user._id);
      return res.json({
        ok: true,
        message: "Email đã được xác thực trước đó.",
        user: safeUserDoc(populated),
      });
    }

    if (!user.emailVerifyOtpHash || !user.emailVerifyOtpExp) {
      return res.status(400).send({ message: "Chưa có mã OTP. Vui lòng bấm Gửi mã OTP trước." });
    }
    if (user.emailVerifyOtpExp.getTime() <= Date.now()) {
      return res.status(400).send({ message: "Mã OTP đã hết hạn. Vui lòng gửi lại mã." });
    }

    const otpOk = await bcrypt.compare(otp, user.emailVerifyOtpHash);
    if (!otpOk) {
      return res.status(400).send({ message: "Mã OTP không đúng" });
    }

    user.emailVerified = true;
    user.emailVerifyOtpHash = undefined;
    user.emailVerifyOtpExp = undefined;
    await user.save();

    const populated = await userController.FindByID(user._id);
    res.json({
      ok: true,
      message: "Đã xác thực email thành công.",
      user: safeUserDoc(populated),
    });
  } catch (e) {
    res.status(500).send({ message: String(e.message || e) });
  }
});

// POST /api/auth/forgotpassword — gửi mã OTP 6 số qua email (cần SMTP)
router.post("/forgotpassword", async function (req, res, next) {
  try {
    const raw = req.body && req.body.email;
    const identifier = raw != null ? String(raw).trim() : "";
    if (!identifier) {
      return res.status(400).send({ message: "Vui lòng nhập email hoặc tên đăng nhập" });
    }

    const user = await findUserByEmailOrUsername(identifier);
    if (!user) {
      console.log("[auth/forgotpassword] không có tài khoản cho:", identifier);
      return res.json({
        delivered: false,
        message:
          "Không tìm thấy tài khoản. Thử email hoặc tên đăng nhập đúng như lúc đăng ký.",
      });
    }

    const otp = generateSixDigitOtp();
    await sendPasswordResetOtp(user.email, otp);
    console.log("[auth/forgotpassword] đã gửi OTP tới email DB:", user.email, "| nhập:", identifier);

    const salt = await bcrypt.genSalt(10);
    user.passwordResetOtpHash = await bcrypt.hash(otp, salt);
    const minutes = Math.min(60, Math.max(1, Number(process.env.PASSWORD_RESET_OTP_MINUTES || 10)));
    user.passwordResetOtpExp = new Date(Date.now() + minutes * 60 * 1000);
    user.forgotPasswordToken = "";
    user.forgotPasswordTokenExp = null;
    await user.save();

    res.json({
      delivered: true,
      mailHint: maskEmailHint(user.email),
      message:
        "Đã gửi mã OTP tới email đã đăng ký của tài khoản. Kiểm tra hộp thư và spam (có thể vài phút).",
    });
  } catch (e) {
    console.error("[auth/forgotpassword]", e.message || e);
    res.status(500).send({ message: String(e.message || e) });
  }
});

// POST /api/auth/resetpassword — body: { email, otp, newPassword }
router.post("/resetpassword", async function (req, res, next) {
  try {
    const rawEmail = req.body && req.body.email;
    const identifier = rawEmail != null ? String(rawEmail).trim() : "";
    const otp = req.body && req.body.otp !== undefined ? String(req.body.otp).trim() : "";
    const newPassword = req.body && req.body.newPassword;

    if (!identifier || !otp || !newPassword) {
      return res.status(400).send({ message: "Cần email hoặc tên đăng nhập, mã OTP và mật khẩu mới" });
    }
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).send({ message: "Mã OTP phải gồm 6 chữ số" });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).send({ message: "Mật khẩu mới tối thiểu 8 ký tự" });
    }

    const user = await findUserByEmailOrUsername(identifier);
    if (!user || !user.passwordResetOtpHash || !user.passwordResetOtpExp) {
      return res.status(400).send({ message: "Tài khoản hoặc mã OTP không hợp lệ, hoặc đã hết hạn" });
    }
    if (user.passwordResetOtpExp.getTime() <= Date.now()) {
      return res.status(400).send({ message: "Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã." });
    }

    const otpOk = await bcrypt.compare(otp, user.passwordResetOtpHash);
    if (!otpOk) {
      return res.status(400).send({ message: "Mã OTP không đúng" });
    }

    user.password = newPassword;
    user.passwordResetOtpHash = undefined;
    user.passwordResetOtpExp = undefined;
    user.forgotPasswordToken = "";
    user.forgotPasswordTokenExp = null;
    await user.save();

    res.json({ ok: true, message: "Đã đặt lại mật khẩu thành công" });
  } catch (e) {
    res.status(500).send({ message: String(e.message || e) });
  }
});

module.exports = router;
