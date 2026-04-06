(function () {
  var RECALL_MS = 3 * 60 * 60 * 1000;
  var userListEl = document.getElementById("achat-user-list");
  var messagesEl = document.getElementById("achat-messages");
  var peerTitle = document.getElementById("achat-peer-title");
  var peerSub = document.getElementById("achat-peer-sub");
  var textEl = document.getElementById("achat-text");
  var fileEl = document.getElementById("achat-file");
  var formEl = document.getElementById("achat-form");
  var sendBtn = document.getElementById("achat-send");
  var filterEl = document.getElementById("achat-filter");
  var pendingEl = document.getElementById("achat-pending");

  if (!userListEl || !OLApi.getToken()) return;

  var myId = "";
  var myUsername = "";
  var selectedUserId = null;
  var socket = null;
  var inboxRows = [];
  var shownMessageIds = {};
  var pendingFile = null;
  var pendingObjectUrl = null;

  function showAlert(msg) {
    var el = document.getElementById("achat-alert");
    if (!el) return;
    el.className = "alert alert-danger";
    el.textContent = msg;
    el.classList.remove("d-none");
  }

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

  function previewLast(m) {
    if (!m || !m.message) return "";
    if (m.revokedAt) return "[Đã thu hồi]";
    if (m.message.type === "file") return "[Ảnh]";
    return (m.message.text || "").slice(0, 80);
  }

  function messageBelongsToThread(m, learnerId) {
    if (!learnerId || !m) return false;
    var tk = m.threadKey || "";
    if (tk === "support:" + learnerId) return true;
    var fromId = m.from && m.from._id ? String(m.from._id) : String(m.from);
    var toId = m.to && m.to._id ? String(m.to._id) : String(m.to);
    return fromId === learnerId || toId === learnerId;
  }

  function renderBubble(m) {
    var fromId = m.from && m.from._id ? String(m.from._id) : String(m.from);
    var mine = fromId === myId;
    var wrap = document.createElement("div");
    wrap.className = "admin-chat-bubble " + (mine ? "me" : "them");
    if (m._id) wrap.setAttribute("data-mid", String(m._id));

    var meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = mine ? "Bạn" : (m.from && m.from.username) || "";
    wrap.appendChild(meta);

    if (m.revokedAt) {
      var em = document.createElement("em");
      em.className = "text-muted small";
      em.textContent = "Tin nhắn đã thu hồi";
      wrap.appendChild(em);
    } else if (m.message && m.message.type === "file") {
      var img = document.createElement("img");
      img.className = "chat-img";
      img.src = absUrl(m.message.text);
      img.alt = "Ảnh";
      wrap.appendChild(img);
    } else {
      var t = document.createElement("div");
      t.textContent = (m.message && m.message.text) || "";
      wrap.appendChild(t);
    }

    var time = document.createElement("div");
    time.className = "small mt-1";
    time.style.opacity = "0.85";
    time.textContent = m.createdAt ? new Date(m.createdAt).toLocaleString("vi-VN") : "";
    wrap.appendChild(time);

    if (mine && canRecall(m)) {
      var rb = document.createElement("button");
      rb.type = "button";
      rb.className = "btn btn-link btn-sm p-0 mt-1";
      rb.textContent = "Thu hồi";
      rb.addEventListener("click", function (e) {
        e.preventDefault();
        if (!window.confirm("Thu hồi tin nhắn này?")) return;
        OLApi.messagesRecall(m._id).then(updateMessage).catch(function (err) {
          showAlert(err.message || "Không thu hồi được");
        });
      });
      wrap.appendChild(rb);
    }

    return wrap;
  }

  function updateMessage(m) {
    var mid = m._id ? String(m._id) : "";
    if (!mid) return;
    shownMessageIds[mid] = true;
    var el = messagesEl.querySelector('[data-mid="' + mid + '"]');
    if (el) {
      el.replaceWith(renderBubble(m));
    } else {
      appendMessage(m);
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function appendMessage(m) {
    var mid = m._id ? String(m._id) : "";
    if (mid && shownMessageIds[mid]) return;
    if (mid) shownMessageIds[mid] = true;
    messagesEl.appendChild(renderBubble(m));
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function clearMessages() {
    shownMessageIds = {};
    messagesEl.innerHTML = "";
  }

  function loadThread() {
    if (!selectedUserId) return;
    OLApi.messagesSupportThread(selectedUserId)
      .then(function (list) {
        clearMessages();
        (list || []).forEach(appendMessage);
      })
      .catch(function (e) {
        showAlert(e.message || "Không tải được tin nhắn");
      });
  }

  function setSelected(user) {
    selectedUserId = user.id;
    peerTitle.textContent = user.username;
    peerSub.textContent = user.email || "";
    textEl.disabled = false;
    fileEl.disabled = false;
    sendBtn.disabled = false;
    clearPendingDraft();
    userListEl.querySelectorAll(".list-group-item").forEach(function (el) {
      el.classList.toggle("active", el.getAttribute("data-id") === selectedUserId);
    });
    loadThread();
  }

  function renderUserList(list) {
    userListEl.innerHTML = "";
    (list || []).forEach(function (row) {
      var u = row.user || row;
      if (!u || !u._id) return;
      var id = String(u._id);
      if (id === myId) return;
      var item = document.createElement("button");
      item.type = "button";
      item.className = "list-group-item list-group-item-action text-left";
      item.setAttribute("data-id", id);
      var last = row.lastMessage;
      item.innerHTML =
        "<strong>" +
        (u.username || "") +
        "</strong><br><small class='text-muted'>" +
        (previewLast(last) || u.email || "") +
        "</small>";
      item.addEventListener("click", function () {
        setSelected({ id: id, username: u.username, email: u.email });
      });
      userListEl.appendChild(item);
    });
  }

  function applyFilter() {
    var q = (filterEl && filterEl.value ? filterEl.value : "").toLowerCase().trim();
    if (!q) {
      renderUserList(inboxRows);
      return;
    }
    renderUserList(
      inboxRows.filter(function (row) {
        var u = row.user || {};
        var s = (u.username || "") + " " + (u.email || "");
        return s.toLowerCase().indexOf(q) !== -1;
      })
    );
  }

  function refreshInbox() {
    OLApi.messagesSupportInbox()
      .then(function (rows) {
        inboxRows = rows || [];
        applyFilter();
      })
      .catch(function () {});
  }

  function clearPendingDraft() {
    if (pendingObjectUrl) {
      try {
        URL.revokeObjectURL(pendingObjectUrl);
      } catch (e) {}
      pendingObjectUrl = null;
    }
    pendingFile = null;
    if (pendingEl) {
      pendingEl.classList.add("d-none");
      pendingEl.innerHTML = "";
    }
  }

  function setPendingFile(file) {
    if (!file || !pendingEl) return;
    clearPendingDraft();
    pendingFile = file;
    pendingObjectUrl = URL.createObjectURL(file);
    pendingEl.innerHTML =
      '<div class="d-flex align-items-center">' +
      '<img class="mr-2" src="' +
      pendingObjectUrl +
      '" alt="" style="max-height:72px;border-radius:8px;" />' +
      '<button type="button" class="btn btn-sm btn-outline-danger" id="achat-pending-rm">Bỏ ảnh</button>' +
      "</div>";
    pendingEl.classList.remove("d-none");
    var rm = document.getElementById("achat-pending-rm");
    if (rm) rm.addEventListener("click", clearPendingDraft);
  }

  function connectSocket() {
    if (typeof io === "undefined") return;
    socket = io({
      auth: { token: OLApi.getToken() },
      transports: ["websocket", "polling"],
    });
    socket.on("new_message", function (m) {
      if (!selectedUserId || !m) return;
      if (!messageBelongsToThread(m, selectedUserId)) return;
      appendMessage(m);
    });
    socket.on("message_revoked", function (m) {
      if (!selectedUserId || !m) return;
      if (!messageBelongsToThread(m, selectedUserId)) return;
      updateMessage(m);
    });
    socket.on("support_inbox", function () {
      refreshInbox();
    });
    socket.on("connect_error", function () {
      console.warn("Socket connect_error");
    });
  }

  OLApi.me()
    .then(function (me) {
      myId = me && me._id ? String(me._id) : "";
      myUsername = (me && me.username) || "";
      return OLApi.messagesSupportInbox();
    })
    .then(function (rows) {
      inboxRows = rows || [];
      renderUserList(inboxRows);
      connectSocket();
    })
    .catch(function (e) {
      showAlert(e.message || "Không tải được hộp thư hỗ trợ");
    });

  if (filterEl) {
    filterEl.addEventListener("input", applyFilter);
  }

  fileEl.addEventListener("change", function () {
    var f = fileEl.files && fileEl.files[0];
    if (f) {
      setPendingFile(f);
      fileEl.value = "";
    }
  });

  function submitSend() {
    if (!selectedUserId) return;
    var txt = (textEl.value || "").trim();
    var file = pendingFile;
    if (!txt && !file) return;

    function sendText() {
      if (!txt) return Promise.resolve();
      return OLApi.messagesSend(selectedUserId, txt).then(function (m) {
        textEl.value = "";
        if (m) appendMessage(m);
        refreshInbox();
      });
    }

    function sendImg() {
      if (!file) return Promise.resolve();
      var fd = new FormData();
      fd.append("to", selectedUserId);
      fd.append("file", file, file.name || "paste.png");
      return OLApi.messagesSendWithFile(fd).then(function (m) {
        clearPendingDraft();
        fileEl.value = "";
        if (m) appendMessage(m);
        refreshInbox();
      });
    }

    sendText()
      .then(function () {
        return sendImg();
      })
      .catch(function (err) {
        showAlert(err.message || "Gửi thất bại");
      });
  }

  formEl.addEventListener("submit", function (e) {
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
})();
