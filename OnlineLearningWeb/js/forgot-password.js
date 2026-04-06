(function () {
  var alertBox = document.getElementById("fp-alert");
  var step1 = document.getElementById("fp-step1");
  var step2 = document.getElementById("fp-step2");
  var formEmail = document.getElementById("fp-form-email");
  var formReset = document.getElementById("fp-form-reset");
  var btnSend = document.getElementById("fp-btn-send");
  var btnBack = document.getElementById("fp-back");

  if (!formEmail || !window.OLApi) return;

  function showAlert(type, msg) {
    if (!alertBox) return;
    alertBox.className = "alert alert-" + type;
    alertBox.textContent = msg;
    alertBox.classList.remove("d-none");
  }

  function goStep2(identifier, mailHint) {
    var disp = document.getElementById("fp-email-display");
    var hid = document.getElementById("fp-email-hidden");
    if (hid) hid.value = identifier;
    if (disp) {
      disp.textContent = mailHint || identifier || "";
    }
    if (step1) step1.classList.add("d-none");
    if (step2) step2.classList.remove("d-none");
  }

  function goStep1() {
    if (step1) step1.classList.remove("d-none");
    if (step2) step2.classList.add("d-none");
    var otp = document.getElementById("fp-otp");
    if (otp) otp.value = "";
  }

  formEmail.addEventListener("submit", function (e) {
    e.preventDefault();
    var em = document.getElementById("fp-email");
    var raw = em ? em.value.trim() : "";
    var identifier = raw.indexOf("@") !== -1 ? raw.toLowerCase() : raw;
    if (!identifier) {
      showAlert("warning", "Vui lòng nhập email hoặc tên đăng nhập.");
      return;
    }
    if (btnSend) btnSend.disabled = true;
    OLApi.forgotPassword(identifier)
      .then(function (data) {
        if (data && data.delivered === false) {
          showAlert("warning", data.message || "Không tìm thấy tài khoản.");
          return;
        }
        showAlert(
          "success",
          (data && data.message) || "Đã gửi mã OTP. Kiểm tra email (và spam)."
        );
        goStep2(identifier, data && data.mailHint);
      })
      .catch(function (err) {
        showAlert("danger", err.message || "Không gửi được mã. Kiểm tra cấu hình SMTP hoặc thử lại.");
      })
      .finally(function () {
        if (btnSend) btnSend.disabled = false;
      });
  });

  if (formReset) {
    formReset.addEventListener("submit", function (e) {
      e.preventDefault();
      var hid = document.getElementById("fp-email-hidden");
      var otpEl = document.getElementById("fp-otp");
      var p1 = document.getElementById("fp-new-pass");
      var p2 = document.getElementById("fp-new-pass2");
      var email = hid ? hid.value.trim() : "";
      var otp = otpEl ? otpEl.value.trim() : "";
      var np = p1 ? p1.value : "";
      var np2 = p2 ? p2.value : "";
      if (!/^\d{6}$/.test(otp)) {
        showAlert("warning", "Nhập đúng mã OTP 6 chữ số.");
        return;
      }
      if (np !== np2) {
        showAlert("warning", "Mật khẩu mới nhập lại không khớp.");
        return;
      }
      if (np.length < 8) {
        showAlert("warning", "Mật khẩu mới tối thiểu 8 ký tự.");
        return;
      }
      OLApi.resetPassword(email, otp, np)
        .then(function () {
          showAlert("success", "Đã đặt lại mật khẩu. Đang chuyển tới đăng nhập...");
          setTimeout(function () {
            window.location.href = "login.html";
          }, 1200);
        })
        .catch(function (err) {
          showAlert("danger", err.message || "Đặt lại mật khẩu thất bại.");
        });
    });
  }

  if (btnBack) {
    btnBack.addEventListener("click", function () {
      goStep1();
      if (alertBox) alertBox.classList.add("d-none");
    });
  }
})();
