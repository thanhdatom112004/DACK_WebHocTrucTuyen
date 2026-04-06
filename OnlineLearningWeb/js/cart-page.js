(function () {
  var tbody = document.getElementById("cart-tbody");
  var alertBox = document.getElementById("cart-alert");
  var hint = document.getElementById("cart-hint");
  var checkoutCard = document.getElementById("cart-checkout-card");
  var totalDisplay = document.getElementById("cart-total-display");
  var checkoutBtn = document.getElementById("cart-checkout-btn");
  if (!tbody) return;

  function showAlert(type, msg) {
    if (!alertBox) return;
    alertBox.className = "alert alert-" + type + " mb-3";
    alertBox.textContent = msg;
    alertBox.classList.remove("d-none");
  }

  function escapeHtml(s) {
    if (s == null) return "";
    var d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
  }

  function courseById(map, id) {
    var k = String(id);
    return map[k] || null;
  }

  function load() {
    if (!OLApi.getToken()) {
      tbody.innerHTML =
        '<tr><td colspan="6">Chưa đăng nhập. <a href="login.html">Đăng nhập</a> để xem giỏ.</td></tr>';
      if (hint) hint.textContent = "";
      if (checkoutCard) checkoutCard.style.display = "none";
      return;
    }

    Promise.all([OLApi.courses(), OLApi.cartGet()])
      .then(function (arr) {
        var courses = arr[0] || [];
        var cartItems = arr[1] || [];
        var courseMap = {};
        courses.forEach(function (c) {
          var id = String(c._id);
          courseMap[id] = c;
        });

        tbody.innerHTML = "";
        if (!cartItems.length) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-muted">Giỏ trống.</td></tr>';
          if (checkoutCard) checkoutCard.style.display = "none";
          return;
        }

        var grandTotal = 0;

        cartItems.forEach(function (line) {
          var cid = line.course;
          var qty = Math.max(1, Number(line.quantity) || 1);
          var course = courseById(courseMap, cid);
          var unit = 0;
          var imgSrc = "";
          if (course) {
            if (line.unitPriceVnd != null && Number.isFinite(Number(line.unitPriceVnd))) {
              unit = Math.max(0, Math.round(Number(line.unitPriceVnd)));
            } else {
              unit = typeof course.price === "number" ? course.price : Number(course.price) || 0;
            }
            imgSrc = course.images || "";
          }
          var lineTotal = unit * qty;
          grandTotal += lineTotal;

          var tr = document.createElement("tr");
          var imgHtml = imgSrc
            ? '<img src="' +
              escapeHtml(imgSrc) +
              '" alt="thumb" style="width:70px;height:46px;object-fit:cover;border-radius:4px;border:1px solid #ddd;" />'
            : '<span class="text-muted">Không có</span>';

          tr.innerHTML =
            "<td>" +
            imgHtml +
            "</td>" +
            "<td>" +
            escapeHtml(course && course.title ? course.title : "") +
            "</td>" +
            "<td>" +
            escapeHtml(OLApi.formatPriceVnd(unit)) +
            "</td>" +
            "<td>" +
            escapeHtml(String(qty)) +
            "</td>" +
            "<td><strong>" +
            escapeHtml(OLApi.formatPriceVnd(lineTotal)) +
            "</strong></td>" +
            '<td><button type="button" class="btn btn-sm btn-danger btn-remove" data-id="' +
            escapeHtml(String(cid)) +
            '">Xóa</button></td>';
          tbody.appendChild(tr);
        });

        if (totalDisplay) totalDisplay.textContent = OLApi.formatPriceVnd(grandTotal);
        if (checkoutCard) checkoutCard.style.display = "block";

        tbody.querySelectorAll(".btn-remove").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var id = btn.getAttribute("data-id");
            OLApi.cartRemove(id)
              .then(function () {
                showAlert("success", "Đã xóa khỏi giỏ.");
                load();
              })
              .catch(function (e) {
                showAlert("danger", e.message || "Lỗi");
              });
          });
        });

        // bỏ nút giảm số lượng, mỗi khóa học chỉ 1 lần trong giỏ
      })
      .catch(function (e) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="text-danger">Lỗi: ' + escapeHtml(e.message) + "</td></tr>";
        if (checkoutCard) checkoutCard.style.display = "none";
      });
  }

  // chuyển sang trang payment.html bằng link trong cart.html

  load();
})();
