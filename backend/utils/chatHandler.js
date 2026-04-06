const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const userController = require("../controllers/users");
const messageController = require("../controllers/messages");
const { emitNewMessage } = require("./messageSocketEmit");

function getJwtSecret() {
  return process.env.JWT_SECRET || "HUTECH";
}

function SocketServer(server, app) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  if (app && app.set) {
    app.set("io", io);
  }

  io.on("connection", async (socket) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) {
        socket.disconnect(true);
        return;
      }
      const result = jwt.verify(token, getJwtSecret());
      if (!result.exp || result.exp <= Date.now()) {
        socket.disconnect(true);
        return;
      }
      const user = await userController.FindByID(result.id);
      if (!user) {
        socket.disconnect(true);
        return;
      }
      socket.data.userId = String(user._id);
      socket.join("user:" + socket.data.userId);
      if (user.role && String(user.role.name).toUpperCase() === "ADMIN") {
        socket.join("admins");
      }

      socket.emit("welcome", { username: user.username, userId: socket.data.userId });

      socket.on("private_message", async (payload, ack) => {
        try {
          const to = payload && payload.to;
          if (!to) {
            if (typeof ack === "function") ack({ ok: false, message: "Thieu nguoi nhan" });
            return;
          }
          let messageContent;
          if (payload.type === "file" && payload.text) {
            messageContent = { type: "file", text: String(payload.text) };
          } else {
            const text = (payload.message || "").trim();
            if (!text) {
              if (typeof ack === "function") ack({ ok: false, message: "Noi dung trong" });
              return;
            }
            messageContent = { type: "text", text };
          }

          const saved = await messageController.createMessage(socket.data.userId, to, messageContent);
          const plain = saved.toObject ? saved.toObject() : saved;
          await emitNewMessage(io, saved);
          if (typeof ack === "function") ack({ ok: true, message: plain });
        } catch (e) {
          if (typeof ack === "function") ack({ ok: false, message: String(e.message || e) });
        }
      });

      socket.on("disconnect", function () {});
    } catch (e) {
      socket.disconnect(true);
    }
  });

  return io;
}

module.exports = { SocketServer };
