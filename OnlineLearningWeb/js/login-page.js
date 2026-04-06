(function () {
  var form = document.getElementById("login-form");
  var alertBox = document.getElementById("login-alert");
  if (!form) return;

  function showAlert(type, msg) {
    alertBox.className = "alert alert-" + type;
    alertBox.textContent = msg;
    alertBox.classList.remove("d-none");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var u = document.getElementById("login-username").value.trim();
    var p = document.getElementById("login-password").value;
    OLApi.login(u, p)
      .then(function (data) {
        if (!data || !data.token) {
          throw new Error("Phản hồi đăng nhập thiếu token.");
        }
        // Token đã lưu — hỏi /me để lấy role chuẩn (tránh body login thiếu populate).
        return OLApi.me();
      })
      .then(function (me) {
        var roleName =
          (me && me.roleName) ||
          (me && me.role && (typeof me.role === "object" ? me.role.name : me.role)) ||
          "";
        var isAdmin = String(roleName || "").toUpperCase() === "ADMIN";
        showAlert(
          "success",
          isAdmin
            ? "Đăng nhập admin thành công. Đang chuyển đến trang quản trị..."
            : "Đăng nhập thành công. Đang chuyển đến trang học..."
        );
        setTimeout(function () {
          window.location.href = isAdmin ? "admin-dashboard.html" : "course.html";
        }, 700);
      })
      .catch(function (err) {
        showAlert("danger", err.message || "Đăng nhập thất bại");
      });
  });
})();
