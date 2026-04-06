/**
 * Widget chat hỗ trợ — một inbox chung, mọi admin nhận cùng luồng tin.
 * Chỉ hiển thị cho học viên đã đăng nhập (không phải ADMIN).
 * Ảnh dán/chọn giữ ở khung soạn cho đến khi Enter hoặc Gửi.
 */
(function () {
  var RECALL_MS = 3 * 60 * 60 * 1000;
  var supportUserId = "";
  var myId = "";
  var socket = null;
  var shownIds = {};
  var root = null;

  function absUrl(path) {
    if (!path) return "";
    if (path.indexOf("http") === 0 || path.indexOf("data:") === 0) return path;
    return window.location.origin + path;
  }

  function canRecall(m) {
    if (!m || !m._id || !m.createdAt || m.revokedAt) return false;
    var fromId = m.from && m.from._id ? String(m.from._id) : String(m.from);
    if (fromId !== myId) return false;
    return Date.now() - new Date(m.createdAt).getTime() <= RECALL_MS;
  }

  function buildUI() {
    root = document.createElement("div");
    root.className = "ol-chat-widget";
    root.setAttribute("aria-live", "polite");
    root.innerHTML =
      '<button type="button" class="ol-chat-toggle" title="Chat hỗ trợ" aria-label="Mở chat hỗ trợ">' +
      '<span class="fa fa-comments"></span>' +
      "</button>" +
      '<div class="ol-chat-panel" role="dialog" aria-label="Hỗ trợ StudyLab">' +
      '<div class="ol-chat-header">' +
      '<img class="ol-chat-header-avatar" src="https://i.sstatic.net/l60Hf.png" alt="" />' +
      '<div class="ol-chat-header-text">' +
      "<h3>Hỗ trợ StudyLab</h3>" +
      "<p>Chúng tôi thường trả lời nhanh</p>" +
      "</div>" +
      '<button type="button" class="ol-chat-close" aria-label="Đóng">&times;</button>' +
      "</div>" +
      '<div class="ol-chat-messages" id="ol-chat-messages"></div>' +
      '<div class="ol-chat-input-wrap">' +
      '<div id="ol-chat-pending" class="ol-chat-pending"></div>' +
      '<form class="ol-chat-form" id="ol-chat-form">' +
      '<div class="ol-chat-input-row">' +
      '<label class="btn btn-light ol-chat-attach mb-0"><span class="fa fa-image"></span>' +
      '<input type="file" id="ol-chat-file" accept="image/*" class="d-none" />' +
      "</label>" +
      '<textarea id="ol-chat-text" rows="1" placeholder="Nhập tin nhắn" autocomplete="off"></textarea>' +
      '<button type="submit" class="btn btn-primary ol-chat-send">Gửi</button>' +
      "</div>" +
      "</form>" +
      "</div>" +
      "</div>";

    document.body.appendChild(root);

    root.querySelector(".ol-chat-toggle").addEventListener("click", function () {
      root.classList.toggle("open");
      if (root.classList.contains("open")) {
        scrollToBottom();
      }
    });
    root.querySelector(".ol-chat-close").addEventListener("click", function () {
      root.classList.remove("open");
    });
  }

  function scrollToBottom() {
    var el = document.getElementById("ol-chat-messages");
    if (el) el.scrollTop = el.scrollHeight;
  }

  function renderBubble(m) {
    var fromId = m.from && m.from._id ? String(m.from._id) : String(m.from);
    var mine = fromId === myId;
    var wrap = document.createElement("div");
    wrap.className = "ol-chat-msg-row " + (mine ? "me" : "them");
    if (m._id) wrap.setAttribute("data-mid", String(m._id));

    if (!mine) {
      var av = document.createElement("img");
      av.className = "ol-chat-msg-avatar";
      av.src = (m.from && m.from.avatarUrl) || "https://i.sstatic.net/l60Hf.png";
      av.alt = "";
      wrap.appendChild(av);
    }

    var bubble = document.createElement("div");
    bubble.className = "ol-chat-bubble";

    if (m.revokedAt) {
      var em = document.createElement("div");
      em.className = "ol-chat-revoked";
      em.textContent = "Tin nhắn đã thu hồi";
      bubble.appendChild(em);
    } else if (m.message && m.message.type === "file") {
      var img = document.createElement("img");
      img.className = "ol-chat-img";
      img.src = absUrl(m.message.text);
      img.alt = "Ảnh";
      bubble.appendChild(img);
    } else {
      var t = document.createElement("div");
      t.textContent = (m.message && m.message.text) || "";
      bubble.appendChild(t);
    }

    var time = document.createElement("div");
    time.className = "ol-chat-msg-time";
    time.textContent = m.createdAt ? new Date(m.createdAt).toLocaleString("vi-VN") : "";
    bubble.appendChild(time);

    if (mine && canRecall(m)) {
      var rb = document.createElement("button");
      rb.type = "button";
      rb.className = "ol-chat-recall-btn";
      rb.textContent = "Thu hồi";
      rb.addEventListener("click", function (e) {
        e.preventDefault();
        if (!window.confirm("Thu hồi tin nhắn này?")) return;
        window.OLApi.messagesRecall(m._id).then(updateMessage).catch(function () {});
      });
      bubble.appendChild(rb);
    }

    wrap.appendChild(bubble);
    return wrap;
  }

  function updateMessage(m) {
    var mid = m._id ? String(m._id) : "";
    if (!mid) return;
    shownIds[mid] = true;
    var box = document.getElementById("ol-chat-messages");
    if (!box) return;
    var el = box.querySelector('[data-mid="' + mid + '"]');
    if (el) {
      el.replaceWith(renderBubble(m));
    } else {
      appendMessage(m);
    }
    scrollToBottom();
  }

  function appendMessage(m) {
    var mid = m._id ? String(m._id) : "";
    if (mid && shownIds[mid]) return;
    if (mid) shownIds[mid] = true;
    var box = document.getElementById("ol-chat-messages");
    if (!box) return;
    box.appendChild(renderBubble(m));
    scrollToBottom();
  }

  function clearMessages() {
    shownIds = {};
    var box = document.getElementById("ol-chat-messages");
    if (box) box.innerHTML = "";
  }

  function loadThread() {
    if (!window.OLApi || !window.OLApi.messagesSupportThread) return;
    window.OLApi
      .messagesSupportThread()
      .then(function (list) {
        clearMessages();
        (list || []).forEach(appendMessage);
      })
      .catch(function () {});
  }

  function connectSocket() {
    if (typeof io === "undefined") return;
    socket = io({
      auth: { token: window.OLApi.getToken() },
      transports: ["websocket", "polling"],
    });
    socket.on("new_message", function (m) {
      if (!m) return;
      var fromId = m.from && m.from._id ? String(m.from._id) : String(m.from);
      var toId = m.to && m.to._id ? String(m.to._id) : String(m.to);
      if (fromId === myId || toId === myId) {
        appendMessage(m);
      }
    });
    socket.on("message_revoked", function (m) {
      if (!m) return;
      var fromId = m.from && m.from._id ? String(m.from._id) : String(m.from);
      var toId = m.to && m.to._id ? String(m.to._id) : String(m.to);
      if (fromId === myId || toId === myId) {
        updateMessage(m);
      }
    });
  }

  function bindForm() {
    var form = document.getElementById("ol-chat-form");
    var textEl = document.getElementById("ol-chat-text");
    var fileEl = document.getElementById("ol-chat-file");
    var pendingEl = document.getElementById("ol-chat-pending");
    var pendingFile = null;
    var pendingObjectUrl = null;

    function clearPending() {
      if (pendingObjectUrl) {
        try {
          URL.revokeObjectURL(pendingObjectUrl);
        } catch (e) {}
        pendingObjectUrl = null;
      }
      pendingFile = null;
      if (pendingEl) {
        pendingEl.classList.remove("show");
        pendingEl.innerHTML = "";
      }
    }

    function setPendingFile(file) {
      if (!file) return;
      clearPending();
      pendingFile = file;
      pendingObjectUrl = URL.createObjectURL(file);
      if (!pendingEl) return;
      pendingEl.innerHTML =
        '<div class="ol-chat-pending-inner">' +
        '<img src="' +
        pendingObjectUrl +
        '" alt="" />' +
        '<button type="button" class="ol-chat-pending-remove" aria-label="Bỏ ảnh">&times;</button>' +
        "</div>";
      pendingEl.classList.add("show");
      var rm = pendingEl.querySelector(".ol-chat-pending-remove");
      if (rm) rm.addEventListener("click", clearPending);
    }

    function submitSend() {
      if (!supportUserId) return;
      var txt = (textEl.value || "").trim();
      var file = pendingFile;
      if (!txt && !file) return;

      function sendText() {
        if (!txt) return Promise.resolve();
        return window.OLApi.messagesSend(supportUserId, txt).then(function (m) {
          textEl.value = "";
          if (m) appendMessage(m);
        });
      }

      function sendImg() {
        if (!file) return Promise.resolve();
        var fd = new FormData();
        fd.append("to", supportUserId);
        fd.append("file", file, file.name || "paste.png");
        return window.OLApi.messagesSendWithFile(fd).then(function (m) {
          clearPending();
          if (fileEl) fileEl.value = "";
          if (m) appendMessage(m);
        });
      }

      sendText()
        .then(function () {
          return sendImg();
        })
        .catch(function () {});
    }

    if (!form || !textEl) return;

    if (fileEl) {
      fileEl.addEventListener("change", function () {
        var f = fileEl.files && fileEl.files[0];
        if (f) {
          setPendingFile(f);
          fileEl.value = "";
        }
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      submitSend();
    });

    textEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitSend();
      }
    });

    textEl.addEventListener("paste", function (e) {
      var items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      var file = null;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.indexOf("image") !== -1) {
          file = items[i].getAsFile();
          break;
        }
      }
      if (!file) return;
      e.preventDefault();
      setPendingFile(file);
    });
  }

  function init() {
    if (!window.OLApi || !window.OLApi.getToken()) return;

    window.OLApi
      .me()
      .then(function (me) {
        var role =
          (me && me.roleName) ||
          (me && me.role
            ? typeof me.role === "object"
              ? me.role.name
              : me.role
            : "") ||
          "";
        if (String(role).toUpperCase() === "ADMIN") return;

        myId = me && me._id ? String(me._id) : "";
        buildUI();
        bindForm();

        return window.OLApi.messagesSupportConfig().then(function (cfg) {
          supportUserId = (cfg && cfg.supportUserId) || "";
          loadThread();
          connectSocket();
        });
      })
      .catch(function () {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
