(function () {
  var alertMap = {
    "admin-dashboard.html": "admin-alert",
    "admin-courses.html": "ac-alert",
    "admin-categories.html": "act-alert",
    "admin-users.html": "au-alert",
    "admin-payment-orders.html": "apo-alert",
    "admin-chat.html": "achat-alert",
  };

  function showAlert(msg) {
    var page = location.pathname.split("/").pop();
    var id = alertMap[page];
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    el.className = "alert alert-danger";
    el.textContent = msg;
    el.classList.remove("d-none");
  }

  if (!window.OLApi || !OLApi.getToken()) {
    showAlert("Bạn chưa đăng nhập.");
    setTimeout(function () {
      location.href = "login.html";
    }, 700);
    return;
  }

  OLApi.me()
    .then(function (u) {
      var role =
        (u && u.roleName) ||
        (u && u.role && (typeof u.role === "object" ? u.role.name : u.role)) ||
        "";
      if (String(role || "").toUpperCase() !== "ADMIN") {
        showAlert("Bạn không có quyền truy cập trang quản trị.");
        setTimeout(function () {
          location.href = "index.html";
        }, 1000);
      }
    })
    .catch(function () {
      showAlert("Phiên đăng nhập không hợp lệ.");
      setTimeout(function () {
        location.href = "login.html";
      }, 700);
    });
})();

