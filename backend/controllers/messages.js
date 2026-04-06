const mongoose = require("mongoose");
const messageModel = require("../models/messages");
const userModel = require("../models/users");
const roleModel = require("../models/roles");
const userController = require("./users");
const { getSupportUserId } = require("../utils/supportUser");

const RECALL_MS = 3 * 60 * 60 * 1000;

function assertCanSend(fromUser, toUser) {
  if (!fromUser || !toUser) {
    throw new Error("user khong ton tai");
  }
  const fromAdmin = fromUser.role && String(fromUser.role.name).toUpperCase() === "ADMIN";
  const toAdmin = toUser.role && String(toUser.role.name).toUpperCase() === "ADMIN";
  if (fromAdmin) return;
  if (toAdmin) return;
  throw new Error("ban khong co quyen gui tin nhan");
}

async function createMessage(fromId, toId, messagePayload) {
  const fromUser = await userController.FindByID(fromId);
  const toUser = await userController.FindByID(toId);
  assertCanSend(fromUser, toUser);

  const supportId = await getSupportUserId();
  const sid = String(supportId);
  let threadKey = "";
  if (String(toId) === sid) {
    threadKey = "support:" + String(fromId);
  } else {
    const fromAdmin = fromUser.role && String(fromUser.role.name).toUpperCase() === "ADMIN";
    const toAdmin = toUser.role && String(toUser.role.name).toUpperCase() === "ADMIN";
    if (fromAdmin && !toAdmin && String(toId) !== sid) {
      threadKey = "support:" + String(toId);
    }
  }

  const doc = new messageModel({
    from: fromId,
    to: toId,
    message: messagePayload,
    threadKey: threadKey || undefined,
  });
  await doc.save();
  return messageModel
    .findById(doc._id)
    .populate({
      path: "from",
      select: "username email fullName avatarUrl",
      populate: { path: "role", select: "name" },
    })
    .populate({
      path: "to",
      select: "username email fullName avatarUrl",
      populate: { path: "role", select: "name" },
    });
}

async function findConversation(user1, user2) {
  const u1 = user1.toString();
  const u2 = user2.toString();
  return messageModel
    .find({
      $or: [
        { from: u1, to: u2 },
        { from: u2, to: u1 },
      ],
    })
    .sort({ createdAt: 1 })
    .populate({
      path: "from",
      select: "username email fullName avatarUrl",
      populate: { path: "role", select: "name" },
    })
    .populate({
      path: "to",
      select: "username email fullName avatarUrl",
      populate: { path: "role", select: "name" },
    });
}

async function listConversationSummariesForUser(userId) {
  const uid = userId.toString();
  const messages = await messageModel
    .find({
      $or: [{ from: uid }, { to: uid }],
    })
    .sort({ createdAt: -1 })
    .populate({
      path: "from",
      select: "username email fullName avatarUrl",
      populate: { path: "role", select: "name" },
    })
    .populate({
      path: "to",
      select: "username email fullName avatarUrl",
      populate: { path: "role", select: "name" },
    });

  const map = new Map();
  for (const m of messages) {
    const fromId = m.from && m.from._id ? m.from._id.toString() : String(m.from);
    const other = fromId === uid ? m.to : m.from;
    const key = other && other._id ? other._id.toString() : String(other);
    if (!map.has(key)) {
      map.set(key, m);
    }
  }
  return Array.from(map.values());
}

function deriveLearnerIdFromMessage(m, supportId) {
  const sid = String(supportId);
  if (m.threadKey && String(m.threadKey).startsWith("support:")) {
    return String(m.threadKey).replace(/^support:/, "");
  }
  const fromId = m.from && m.from._id ? String(m.from._id) : String(m.from);
  const toId = m.to && m.to._id ? String(m.to._id) : String(m.to);
  if (toId === sid) return fromId;
  const fromRole = m.from && m.from.role && m.from.role.name;
  if (String(fromRole).toUpperCase() === "ADMIN" && toId !== sid) return toId;
  return null;
}

async function findSupportThreadForUser(userId) {
  const uid = userId.toString();
  const sid = await getSupportUserId();
  const supportOid = new mongoose.Types.ObjectId(sid);
  const adminRole = await roleModel.findOne({ name: "ADMIN" });
  if (!adminRole) {
    return [];
  }
  const admins = await userModel.find({ role: adminRole._id }).select("_id").lean();
  const adminIds = admins.map((a) => a._id);

  return messageModel
    .find({
      $or: [
        { threadKey: "support:" + uid },
        { from: uid, to: supportOid },
        { to: uid, from: { $in: adminIds } },
      ],
    })
    .sort({ createdAt: 1 })
    .populate({
      path: "from",
      select: "username email fullName avatarUrl",
      populate: { path: "role", select: "name" },
    })
    .populate({
      path: "to",
      select: "username email fullName avatarUrl",
      populate: { path: "role", select: "name" },
    });
}

async function recallMessage(messageId, userId) {
  const m = await messageModel.findById(messageId);
  if (!m) {
    throw new Error("khong tim thay tin nhan");
  }
  if (String(m.from) !== String(userId)) {
    throw new Error("ban chi co the thu hoi tin cua minh");
  }
  if (m.revokedAt) {
    throw new Error("tin da duoc thu hoi");
  }
  if (Date.now() - new Date(m.createdAt).getTime() > RECALL_MS) {
    throw new Error("qua thoi gian thu hoi (3 gio)");
  }
  m.revokedAt = new Date();
  await m.save();
  return messageModel
    .findById(m._id)
    .populate({
      path: "from",
      select: "username email fullName avatarUrl",
      populate: { path: "role", select: "name" },
    })
    .populate({
      path: "to",
      select: "username email fullName avatarUrl",
      populate: { path: "role", select: "name" },
    });
}

async function listSupportInboxForAdmins() {
  const sid = await getSupportUserId();
  const supportOid = new mongoose.Types.ObjectId(sid);
  const messages = await messageModel
    .find({
      $or: [{ threadKey: { $regex: /^support:/ } }, { to: supportOid }],
    })
    .sort({ createdAt: -1 })
    .populate({
      path: "from",
      select: "username email fullName avatarUrl",
      populate: { path: "role", select: "name" },
    })
    .populate({
      path: "to",
      select: "username email fullName avatarUrl",
      populate: { path: "role", select: "name" },
    })
    .limit(500)
    .lean();

  const map = new Map();
  for (const m of messages) {
    const learnerId = deriveLearnerIdFromMessage(m, sid);
    if (!learnerId || learnerId === sid) continue;
    const u = await userController.FindByID(learnerId);
    if (!u || !u.role || String(u.role.name).toUpperCase() === "ADMIN") continue;
    if (!map.has(learnerId)) {
      map.set(learnerId, m);
    }
  }

  const out = [];
  for (const [learnerId, lastMsg] of map.entries()) {
    const user = await userController.FindByID(learnerId);
    if (user) {
      out.push({
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
        },
        lastMessage: lastMsg,
      });
    }
  }
  out.sort(function (a, b) {
    const ta = a.lastMessage && a.lastMessage.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const tb = b.lastMessage && b.lastMessage.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return tb - ta;
  });
  return out;
}

module.exports = {
  assertCanSend,
  createMessage,
  findConversation,
  listConversationSummariesForUser,
  findSupportThreadForUser,
  listSupportInboxForAdmins,
  deriveLearnerIdFromMessage,
  recallMessage,
  RECALL_MS,
};
