(function () {
  var tbody = document.getElementById("myc-tbody");
  var alertBox = document.getElementById("myc-alert");

  function showAlert(type, msg) {
    if (!alertBox) return;
    alertBox.className = "alert alert-" + type;
    alertBox.textContent = msg;
    alertBox.classList.remove("d-none");
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function fmtDate(d) {
    if (!d) return "—";
    try {
      var x = new Date(d);
      if (isNaN(x.getTime())) return "—";
      return x.toLocaleDateString("vi-VN");
    } catch (e) {
      return "—";
    }
  }

  var fallbackImgs = [
    "images/work-1.jpg",
    "images/work-2.jpg",
    "images/work-3.jpg",
    "images/work-4.jpg",
  ];

  function normalizeCourseImage(c) {
    var raw = c && c.images;
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    if (Array.isArray(raw) && raw.length) {
      var first = raw[0];
      if (typeof first === "string" && first.trim()) return first.trim();
    }
    return "";
  }

  if (!window.OLApi || !OLApi.getToken()) {
    tbody.innerHTML =
      '<tr><td colspan="5">Bạn chưa đăng nhập. <a href="login.html">Đăng nhập</a> để xem khóa học đã mua.</td></tr>';
    return;
  }

  OLApi.enrollmentsMine()
    .then(function (list) {
      if (!list || !list.length) {
        tbody.innerHTML =
          '<tr><td colspan="5" class="text-muted">Chưa có khóa học đã mua. Thêm khóa vào giỏ và <a href="cart.html">thanh toán</a>.</td></tr>';
        return;
      }

      tbody.innerHTML = "";
      list.forEach(function (row, idx) {
        var c = row.course;
        var title = c && c.title ? c.title : "(Đã xóa khóa học)";
        var cid = c && c._id ? String(c._id) : String(row.course || "");
        var qty = row.quantity || 1;
        var paid = row.totalPaid != null ? row.totalPaid : 0;
        var when = row.purchasedAt || row.createdAt || row.updatedAt;
        var imgSrc = c ? normalizeCourseImage(c) : "";
        if (!imgSrc) imgSrc = fallbackImgs[idx % fallbackImgs.length];

        var tr = document.createElement("tr");
        tr.innerHTML =
          '<td class="align-middle">' +
          '<div class="d-flex align-items-center myc-course-cell">' +
          '<img class="myc-thumb mr-3" src=' +
          JSON.stringify(imgSrc) +
          ' alt="" width="52" height="52" loading="lazy" />' +
          '<div class="myc-title text-dark">' +
          esc(title) +
          "</div></div></td>" +
          "<td><small>" +
          esc(cid) +
          "</small></td>" +
          "<td>" +
          esc(qty) +
          "</td>" +
          "<td>" +
          esc(OLApi.formatPriceVnd(paid)) +
          "</td>" +
          "<td>" +
          esc(fmtDate(when)) +
          (cid
            ? ' — <a href="course-watch.html?id=' +
              encodeURIComponent(cid) +
              '">Học ngay</a>'
            : "") +
          "</td>";
        tbody.appendChild(tr);
      });
    })
    .catch(function (e) {
      showAlert("danger", e.message || "Không tải được dữ liệu.");
      tbody.innerHTML = '<tr><td colspan="5" class="text-danger">Lỗi tải dữ liệu.</td></tr>';
    });
})();
