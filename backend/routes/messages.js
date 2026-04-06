const express = require("express");
const router = express.Router();

const { checkLogin, checkRole } = require("../middleware/authHandler");
const userController = require("../controllers/users");
const messageController = require("../controllers/messages");
const { uploadChatImage } = require("../utils/uploadHandler");
const { emitNewMessage, emitMessageRevoked } = require("../utils/messageSocketEmit");
const roleModel = require("../models/roles");
const userModel = require("../models/users");
const { getSupportUserId } = require("../utils/supportUser");

function optionalUpload(req, res, next) {
  const ct = req.headers["content-type"] || "";
  if (ct.indexOf("multipart/form-data") !== -1) {
    return uploadChatImage.single("file")(req, res, next);
  }
  return next();
}

router.post("/", checkLogin, optionalUpload, async function (req, res, next) {
  try {
    const to = req.body.to;
    if (!to) {
      return res.status(400).send({ message: "Thieu nguoi nhan (to)" });
    }

    let messageContent;
    if (!req.file) {
      messageContent = {
        type: "text",
        text: (req.body.message || "").trim(),
      };
      if (!messageContent.text) {
        return res.status(400).send({ message: "Noi dung tin nhan trong" });
      }
    } else {
      const rel = "/uploads/chat/" + req.file.filename;
      messageContent = {
        type: "file",
        text: rel,
      };
    }

    const saved = await messageController.createMessage(req.userId, to, messageContent);
    const io = req.app.get("io");
    if (io) {
      await emitNewMessage(io, saved);
    }
    res.send(saved);
  } catch (e) {
    res.status(400).send({ message: String(e.message || e) });
  }
});

router.get("/support/config", checkLogin, async function (req, res, next) {
  try {
    const supportUserId = await getSupportUserId();
    res.send({ supportUserId: supportUserId });
  } catch (e) {
    res.status(500).send({ message: String(e.message || e) });
  }
});

router.get("/support/thread", checkLogin, async function (req, res, next) {
  try {
    const me = await userController.FindByID(req.userId);
    const isAdmin = me && me.role && String(me.role.name).toUpperCase() === "ADMIN";
    if (isAdmin && req.query.userId) {
      const list = await messageController.findSupportThreadForUser(req.query.userId);
      return res.send(list);
    }
    if (!isAdmin) {
      const list = await messageController.findSupportThreadForUser(req.userId);
      return res.send(list);
    }
    res.status(400).send({ message: "Can truyen userId (hoc vien) khi xem tu admin" });
  } catch (e) {
    res.status(400).send({ message: String(e.message || e) });
  }
});

router.get("/support/inbox", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    const list = await messageController.listSupportInboxForAdmins();
    res.send(list);
  } catch (e) {
    res.status(400).send({ message: String(e.message || e) });
  }
});

router.get("/conversations", checkLogin, async function (req, res, next) {
  try {
    const list = await messageController.listConversationSummariesForUser(req.userId);
    res.send(list);
  } catch (e) {
    res.status(400).send({ message: String(e.message || e) });
  }
});

router.get("/with/:userId", checkLogin, async function (req, res, next) {
  try {
    const me = await userController.FindByID(req.userId);
    const other = await userController.FindByID(req.params.userId);
    if (!other) {
      return res.status(404).send({ message: "user khong ton tai" });
    }
    messageController.assertCanSend(me, other);
    const list = await messageController.findConversation(req.userId, req.params.userId);
    res.send(list);
  } catch (e) {
    const code = String(e.message || "").includes("quyen") ? 403 : 400;
    res.status(code).send({ message: String(e.message || e) });
  }
});

router.get("/admins", checkLogin, async function (req, res, next) {
  try {
    const adminRole = await roleModel.findOne({ name: "ADMIN" });
    if (!adminRole) {
      return res.send([]);
    }
    const admins = await userModel
      .find({ role: adminRole._id, isDeleted: false })
      .select("username email fullName avatarUrl")
      .lean();
    res.send(admins);
  } catch (e) {
    res.status(400).send({ message: String(e.message || e) });
  }
});

router.post("/:id/recall", checkLogin, async function (req, res, next) {
  try {
    const updated = await messageController.recallMessage(req.params.id, req.userId);
    const io = req.app.get("io");
    if (io) {
      await emitMessageRevoked(io, updated);
    }
    res.send(updated);
  } catch (e) {
    const msg = String(e.message || e);
    let code = 400;
    if (msg.indexOf("chi co the") !== -1 || msg.indexOf("khong co quyen") !== -1) code = 403;
    res.status(code).send({ message: msg });
  }
});

module.exports = router;
