const supportUser = require("./supportUser");

async function emitNewMessage(io, saved) {
  if (!io || !saved) return;
  const payload = saved.toObject ? saved.toObject() : saved;
  const toId = payload.to && payload.to._id ? String(payload.to._id) : String(payload.to);
  const fromId = payload.from && payload.from._id ? String(payload.from._id) : String(payload.from);
  io.to("user:" + toId).emit("new_message", payload);
  io.to("user:" + fromId).emit("new_message", payload);
  const sid = await supportUser.getSupportUserId();
  const tk = payload.threadKey || "";
  if (toId === sid || fromId === sid || (tk && String(tk).startsWith("support:"))) {
    io.to("admins").emit("new_message", payload);
    io.to("admins").emit("support_inbox", payload);
  }
}

async function emitMessageRevoked(io, saved) {
  if (!io || !saved) return;
  const payload = saved.toObject ? saved.toObject() : saved;
  const toId = payload.to && payload.to._id ? String(payload.to._id) : String(payload.to);
  const fromId = payload.from && payload.from._id ? String(payload.from._id) : String(payload.from);
  io.to("user:" + toId).emit("message_revoked", payload);
  io.to("user:" + fromId).emit("message_revoked", payload);
  const sid = await supportUser.getSupportUserId();
  const tk = payload.threadKey || "";
  if (toId === sid || fromId === sid || (tk && String(tk).startsWith("support:"))) {
    io.to("admins").emit("message_revoked", payload);
  }
}

module.exports = { emitNewMessage, emitMessageRevoked };
