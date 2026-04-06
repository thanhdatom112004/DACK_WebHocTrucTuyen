(function () {
  function getToken() {
    try {
      return localStorage.getItem("ol_token") || "";
    } catch (e) {
      return "";
    }
  }

  function ensureLoginItem(navList) {
    var loginLink = navList.querySelector('a[href="login.html"]');
    if (loginLink) return loginLink.closest("li");

    var li = document.createElement("li");
    li.className = "nav-item";
    li.innerHTML = '<a href="login.html" class="nav-link">Đăng nhập</a>';
    navList.appendChild(li);
    return li;
  }

  function setGuestNav(navList) {
    ensureLoginItem(navList);
  }

  function setUserNav(navList, username, roleName) {
    var loginItem = ensureLoginItem(navList);
    if (!loginItem) return;

    var isAdmin = String(roleName || "").toUpperCase() === "ADMIN";
    var homeLabel = isAdmin ? "Trang quản trị" : "Trang học";
    var homeHref = isAdmin ? "admin-dashboard.html" : "course.html";

    loginItem.className = "nav-item dropdown";
    loginItem.innerHTML =
      '<a class="nav-link dropdown-toggle" href="#" id="userDropdownNav" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">' +
      '<span class="fa fa-user-circle"></span> ' +
      (username || "Tài khoản") +
      (isAdmin
        ? ' <span class="badge badge-warning ml-1" style="font-size:10px;vertical-align:middle;">ADMIN</span>'
        : "") +
      "</a>" +
      '<div class="dropdown-menu dropdown-menu-right" aria-labelledby="userDropdownNav">' +
      '<a class="dropdown-item" href="' + homeHref + '">' + homeLabel + "</a>" +
      (isAdmin
        ? '<a class="dropdown-item" href="admin-payment-orders.html">Xác nhận thanh toán</a>'
        : "") +
      '<a class="dropdown-item" href="profile.html">Thông tin cá nhân</a>' +
      (isAdmin
        ? '<a class="dropdown-item" href="admin-courses.html">Quản lý khóa học</a>'
        : '<a class="dropdown-item" href="my-courses.html">Khóa học đã mua</a>') +
      (isAdmin ? "" : '<a class="dropdown-item" href="cart.html">Giỏ hàng</a>') +
      '<div class="dropdown-divider"></div>' +
      '<button class="dropdown-item text-danger" type="button" id="logoutBtnNav">Đăng xuất</button>' +
      "</div>";

    var logoutBtn = loginItem.querySelector("#logoutBtnNav");
    if (!logoutBtn) return;

    logoutBtn.addEventListener("click", function () {
      var logout = window.OLApi && window.OLApi.logout
        ? window.OLApi.logout()
        : Promise.resolve();

      logout.finally(function () {
        try {
          localStorage.removeItem("ol_token");
        } catch (e) {}
        window.location.href = "login.html";
      });
    });
  }

  function init() {
    var navLists = document.querySelectorAll(".navbar-nav.ml-auto");
    if (!navLists.length) return;

    var token = getToken();
    if (!token) {
      navLists.forEach(setGuestNav);
      return;
    }

    if (window.OLApi && window.OLApi.me) {
      window.OLApi
        .me()
        .then(function (user) {
          var username = user && user.username ? user.username : "Tài khoản";
          var roleName =
            (user && user.roleName) ||
            (user && user.role && (typeof user.role === "object" ? user.role.name : user.role)) ||
            "";
          navLists.forEach(function (nav) {
            setUserNav(nav, username, roleName);
          });
        })
        .catch(function () {
          navLists.forEach(function (nav) {
            setUserNav(nav, "Tài khoản", "");
          });
        });
    } else {
      navLists.forEach(function (nav) {
        setUserNav(nav, "Tài khoản", "");
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

