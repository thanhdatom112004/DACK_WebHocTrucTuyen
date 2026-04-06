(function () {
  var alertBox = document.getElementById("profile-alert");
  var profileForm = document.getElementById("profile-form");
  var passwordForm = document.getElementById("password-form");
  var pendingBlobUrl = null;
  var MAX_AVATAR_BYTES = 5 * 1024 * 1024;

  function showAlert(type, msg) {
    if (!alertBox) return;
    alertBox.className = "alert alert-" + type;
    alertBox.textContent = msg;
    alertBox.classList.remove("d-none");
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value || "-";
  }

  function resolveImgUrl(u) {
    if (!u) return "";
    u = String(u).trim();
    if (u.indexOf("blob:") === 0 || u.indexOf("data:") === 0) return u;
    if (u.indexOf("/") === 0) return window.location.origin + u;
    return u;
  }

  function revokePendingBlob() {
    if (pendingBlobUrl) {
      try {
        URL.revokeObjectURL(pendingBlobUrl);
      } catch (e) {}
      pendingBlobUrl = null;
    }
  }

  /** Xem trước trong form (ô tròn 120px) */
  function setFormPreview(url) {
    var img = document.getElementById("pf-avatar-preview");
    var ph = document.getElementById("pf-avatar-preview-ph");
    if (!img || !ph) return;
    if (!url || !String(url).trim()) {
      img.classList.remove("is-visible");
      img.removeAttribute("src");
      ph.classList.remove("is-hidden");
      return;
    }
    var u = resolveImgUrl(url);
    img.onload = function () {
      img.classList.add("is-visible");
      ph.classList.add("is-hidden");
    };
    img.onerror = function () {
      img.classList.remove("is-visible");
      ph.classList.remove("is-hidden");
    };
    img.src = u;
  }

  function applyAvatar(url) {
    var img = document.getElementById("pf-avatar-img");
    var icon = document.getElementById("pf-avatar-icon");
    setFormPreview(url);
    if (!url || !String(url).trim()) {
      if (img) {
        img.classList.add("d-none");
        img.removeAttribute("src");
      }
      if (icon) icon.classList.remove("d-none");
      return;
    }
    var u = resolveImgUrl(String(url).trim());
    if (img) {
      img.onload = function () {
        img.classList.remove("d-none");
        if (icon) icon.classList.add("d-none");
      };
      img.onerror = function () {
        img.classList.add("d-none");
        if (icon) icon.classList.remove("d-none");
      };
      img.src = u;
    }
  }

  function fillUser(user) {
    var roleValue = user.roleName || user.role;
    if (roleValue && typeof roleValue === "object") {
      roleValue = roleValue.name || roleValue._id || "-";
    }
    setText("pf-username", user.username);
    setText("pf-email", user.email);
    setText("pf-role", roleValue);
    setText("pf-status", user.status ? "Đang hoạt động" : "Chưa kích hoạt");

    var emailRo = document.getElementById("pf-email-ro");
    if (emailRo) emailRo.value = user.email || "";

    var uIn = document.getElementById("pf-username-input");
    if (uIn) uIn.value = user.username || "";

    var fn = document.getElementById("pf-fullname");
    if (fn) fn.value = user.fullName || "";

    var av = document.getElementById("pf-avatar-url");
    if (av) av.value = user.avatarUrl || "";

    revokePendingBlob();
    var fileEl = document.getElementById("pf-avatar-file");
    if (fileEl) fileEl.value = "";
    var upBtn = document.getElementById("pf-avatar-upload");
    if (upBtn) upBtn.disabled = true;

    applyAvatar(user.avatarUrl);

    var emailVerified = user.emailVerified === true;
    var badge = document.getElementById("pf-email-badge");
    if (badge) {
      badge.classList.remove("d-none");
      badge.classList.remove("badge-success", "badge-warning");
      badge.classList.add(emailVerified ? "badge-success" : "badge-warning");
      badge.textContent = emailVerified ? "Email đã xác thực" : "Chưa xác thực email";
    }
    var evEmail = document.getElementById("pf-ev-email-copy");
    if (evEmail) evEmail.textContent = user.email || "-";
    var evOk = document.getElementById("pf-ev-verified");
    var evPen = document.getElementById("pf-ev-pending");
    if (evOk && evPen) {
      if (emailVerified) {
        evOk.classList.remove("d-none");
        evPen.classList.add("d-none");
      } else {
        evOk.classList.add("d-none");
        evPen.classList.remove("d-none");
      }
    }
    var hint = document.getElementById("pf-ev-hint");
    if (hint) hint.textContent = "";
    var otpIn = document.getElementById("pf-ev-otp");
    if (otpIn) otpIn.value = "";
  }

  if (!window.OLApi || !OLApi.getToken()) {
    showAlert("warning", "Bạn chưa đăng nhập.");
    return;
  }

  var pickBtn = document.getElementById("pf-avatar-pick");
  var fileInput = document.getElementById("pf-avatar-file");
  var uploadBtn = document.getElementById("pf-avatar-upload");

  if (pickBtn && fileInput) {
    pickBtn.addEventListener("click", function () {
      fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) {
        if (uploadBtn) uploadBtn.disabled = true;
        return;
      }
      if (!f.type || f.type.indexOf("image") !== 0) {
        showAlert("warning", "Vui lòng chọn file ảnh.");
        fileInput.value = "";
        if (uploadBtn) uploadBtn.disabled = true;
        return;
      }
      if (f.size > MAX_AVATAR_BYTES) {
        showAlert("danger", "Ảnh tối đa 5MB.");
        fileInput.value = "";
        if (uploadBtn) uploadBtn.disabled = true;
        return;
      }
      revokePendingBlob();
      pendingBlobUrl = URL.createObjectURL(f);
      setFormPreview(pendingBlobUrl);
      var img = document.getElementById("pf-avatar-img");
      var icon = document.getElementById("pf-avatar-icon");
      if (img) {
        img.onload = function () {
          img.classList.remove("d-none");
          if (icon) icon.classList.add("d-none");
        };
        img.src = pendingBlobUrl;
      }
      if (uploadBtn) uploadBtn.disabled = false;
      var avUrl = document.getElementById("pf-avatar-url");
      if (avUrl) avUrl.value = "";
    });
  }

  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener("click", function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) {
        showAlert("warning", "Chọn ảnh trước khi tải lên.");
        return;
      }
      var fd = new FormData();
      fd.append("file", f);
      uploadBtn.disabled = true;
      OLApi.profileAvatarUpload(fd)
        .then(function (user) {
          showAlert("success", "Đã cập nhật ảnh đại diện.");
          fillUser(user);
        })
        .catch(function (err) {
          showAlert("danger", err.message || "Tải ảnh thất bại.");
          uploadBtn.disabled = false;
        });
    });
  }

  OLApi.me()
    .then(function (user) {
      fillUser(user);
    })
    .catch(function (e) {
      showAlert("danger", e.message || "Không tải được thông tin cá nhân.");
    });

  if (profileForm) {
    profileForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var usernameEl = document.getElementById("pf-username-input");
      var fullNameEl = document.getElementById("pf-fullname");
      var avatarUrlEl = document.getElementById("pf-avatar-url");
      var username = usernameEl ? usernameEl.value.trim() : "";
      var fullName = fullNameEl ? fullNameEl.value.trim() : "";
      if (!username) {
        showAlert("danger", "Tên đăng nhập không được để trống.");
        return;
      }
      var saveBtn = profileForm.querySelector('button[type="submit"]');
      var f = fileInput && fileInput.files && fileInput.files[0];
      function done(user) {
        showAlert(
          "success",
          f ? "Đã lưu thông tin và ảnh đại diện." : "Đã cập nhật thông tin."
        );
        fillUser(user);
        if (saveBtn) saveBtn.disabled = false;
      }
      function fail(err) {
        showAlert("danger", err.message || "Không lưu được.");
        if (saveBtn) saveBtn.disabled = false;
      }
      if (saveBtn) saveBtn.disabled = true;
      if (f) {
        var fd = new FormData();
        fd.append("file", f);
        OLApi.profileAvatarUpload(fd)
          .then(function () {
            return OLApi.profileUpdate({ username: username, fullName: fullName });
          })
          .then(done)
          .catch(fail);
      } else {
        OLApi.profileUpdate({
          username: username,
          fullName: fullName,
          avatarUrl: avatarUrlEl ? avatarUrlEl.value.trim() : "",
        })
          .then(done)
          .catch(fail);
      }
    });
  }

  if (passwordForm) {
    passwordForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var oldP = document.getElementById("pf-old-pass");
      var newP = document.getElementById("pf-new-pass");
      var newP2 = document.getElementById("pf-new-pass2");
      var a = oldP ? oldP.value : "";
      var b = newP ? newP.value : "";
      var c = newP2 ? newP2.value : "";
      if (b !== c) {
        showAlert("danger", "Mật khẩu mới nhập lại không khớp.");
        return;
      }
      if (b.length < 8) {
        showAlert("danger", "Mật khẩu mới tối thiểu 8 ký tự.");
        return;
      }
      OLApi.changePassword(a, b)
        .then(function () {
          showAlert("success", "Đã đổi mật khẩu thành công.");
          passwordForm.reset();
        })
        .catch(function (err) {
          showAlert("danger", err.message || "Đổi mật khẩu thất bại.");
        });
    });
  }

  var btnEvSend = document.getElementById("pf-ev-send");
  var btnEvConfirm = document.getElementById("pf-ev-confirm");
  var pfEvHint = document.getElementById("pf-ev-hint");

  function setEvHint(msg) {
    if (pfEvHint) pfEvHint.textContent = msg || "";
  }

  if (btnEvSend) {
    btnEvSend.addEventListener("click", function () {
      btnEvSend.disabled = true;
      setEvHint("");
      OLApi.verifyEmailSendOtp()
        .then(function (data) {
          setEvHint(data.message || "Đã gửi mã. Kiểm tra email.");
          showAlert("success", data.message || "Đã gửi mã OTP.");
        })
        .catch(function (err) {
          showAlert("danger", err.message || "Không gửi được mã OTP.");
        })
        .finally(function () {
          btnEvSend.disabled = false;
        });
    });
  }

  if (btnEvConfirm) {
    btnEvConfirm.addEventListener("click", function () {
      var otpEl = document.getElementById("pf-ev-otp");
      var otp = otpEl ? otpEl.value.trim() : "";
      if (!/^\d{6}$/.test(otp)) {
        showAlert("warning", "Nhập đúng mã OTP 6 chữ số.");
        return;
      }
      btnEvConfirm.disabled = true;
      OLApi.verifyEmailConfirm(otp)
        .then(function (data) {
          showAlert("success", data.message || "Đã xác thực email.");
          if (data.user) {
            fillUser(data.user);
          } else {
            return OLApi.me().then(fillUser);
          }
        })
        .catch(function (err) {
          showAlert("danger", err.message || "Xác thực thất bại.");
        })
        .finally(function () {
          btnEvConfirm.disabled = false;
        });
    });
  }
})();
