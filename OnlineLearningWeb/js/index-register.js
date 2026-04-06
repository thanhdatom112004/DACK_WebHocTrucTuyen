(function () {
  var form = document.getElementById("register-form");
  var alertBox = document.getElementById("register-alert");
  if (!form) return;

  function hideRegisterSection() {
    // Khối đăng ký nằm trong <section> chứa form
    var section = form.closest("section");
    if (section) section.style.display = "none";
  }

  // Nếu đã đăng nhập thì ẩn form đăng ký ngay khi vào index.html
  try {
    if (window.OLApi && OLApi.getToken && OLApi.getToken()) {
      OLApi.me()
        .then(function () {
          hideRegisterSection();
        })
        .catch(function () {
          // token hết hạn hoặc invalid -> để form hiển thị
        });
    }
  } catch (e) {}

  function showAlert(type, msg) {
    alertBox.className = "alert alert-" + type;
    alertBox.textContent = msg;
    alertBox.classList.remove("d-none");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var username = document.getElementById("reg-username").value.trim();
    var email = document.getElementById("reg-email").value.trim();
    var pw = document.getElementById("reg-password").value;
    var pw2 = document.getElementById("reg-password2").value;

    if (pw !== pw2) {
      showAlert("danger", "Mật khẩu nhập lại không khớp.");
      return;
    }

    OLApi.register({ username: username, password: pw, email: email })
      .then(function () {
        showAlert("success", "Đăng ký thành công. Chuyển đến trang đăng nhập...");
        setTimeout(function () {
          window.location.href = "login.html";
        }, 1200);
      })
      .catch(function (err) {
        showAlert("danger", err.message || "Đăng ký thất bại");
      });
  });
})();
