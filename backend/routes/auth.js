const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { checkLogin } = require("../middleware/authHandler");
const { userPostValidation, validateResult } = require("../middleware/validationHandler");

const userController = require("../controllers/users");
const userModel = require("../models/users");
const roleModel = require("../models/roles");

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

router.post("/register", userPostValidation, validateResult, async function (req, res, next) {
  try {
    const { username, password, email, avatarUrl } = req.body;

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
          message: "Tên đăng nhập đã tồn tại. Hãy đăng nhập hoặc dùng tên khác.",
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

router.get("/me", checkLogin, async function (req, res, next) {
  let user = await userController.FindByID(req.userId);
  if (!user) return res.status(404).send({ message: "user not found" });
  user = await ensureRolePopulated(user);
  res.send(withRoleName(safeUserDoc(user)));
});

router.post("/logout", checkLogin, function (req, res, next) {
  res.cookie("token", null, { maxAge: 0, httpOnly: true });
  res.send("logout");
});

module.exports = router;
