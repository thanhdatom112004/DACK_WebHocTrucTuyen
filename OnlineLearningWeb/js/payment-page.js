(function () {
  var alertBox = document.getElementById("pay-alert");
  var totalSpan = document.getElementById("pay-total");
  var noteSpan = document.getElementById("pay-transfer-note");
  var qrImage = document.getElementById("pay-qr-image");
  var confirmBtn = document.getElementById("pay-confirm-btn");
  if (!confirmBtn) return;

  function show(type, msg) {
    if (!alertBox) return;
    alertBox.className = "alert alert-" + type + " mb-3";
    alertBox.textContent = msg;
    alertBox.classList.remove("d-none");
  }

  function buildVietQrUrl(amount, transferCode) {
    var base = "https://img.vietqr.io/image/techcombank-19038491122011-compact2.png";
    var params = new URLSearchParams({
      accountName: "NGUYEN LE THANH DAT",
      amount: String(Math.max(0, Number(amount) || 0)),
      addInfo: transferCode,
    });
    return base + "?" + params.toString();
  }

  var transferCode = "PAY-" + Date.now();
  if (noteSpan) noteSpan.textContent = transferCode;

  if (!OLApi.getToken()) {
    show("warning", "Cần đăng nhập để thanh toán. Vui lòng đăng nhập lại.");
    return;
  }

  Promise.all([OLApi.courses(), OLApi.cartGet()])
    .then(function (arr) {
      var courses = arr[0] || [];
      var cartItems = arr[1] || [];
      if (!cartItems.length) {
        show("warning", "Giỏ hàng đang trống. Vui lòng thêm khóa học rồi quay lại trang này.");
        return;
      }
      var courseMap = {};
      courses.forEach(function (c) {
        courseMap[String(c._id)] = c;
      });
      var total = 0;
      cartItems.forEach(function (line) {
        var c = courseMap[String(line.course)];
        if (!c) return;
        var qty = Math.max(1, Number(line.quantity) || 1);
        var unit =
          line.unitPriceVnd != null && Number.isFinite(Number(line.unitPriceVnd))
            ? Math.max(0, Math.round(Number(line.unitPriceVnd)))
            : typeof c.price === "number"
              ? c.price
              : Number(c.price) || 0;
        total += unit * qty;
      });
      if (totalSpan) totalSpan.textContent = OLApi.formatPriceVnd(total);
      if (qrImage) {
        qrImage.src = buildVietQrUrl(total, transferCode);
      }
    })
    .catch(function (e) {
      show("danger", e.message || "Không lấy được thông tin giỏ hàng.");
    });

  confirmBtn.addEventListener("click", function () {
    if (!OLApi.getToken()) {
      show("warning", "Cần đăng nhập để gửi yêu cầu xác nhận.");
      return;
    }
    confirmBtn.disabled = true;
    OLApi.paymentOrderCreate(transferCode, "bank-transfer")
      .then(function (data) {
        var msg =
          "Đã ghi nhận yêu cầu thanh toán, vui lòng đợi admin xác nhận. Mã: " + transferCode;
        show("success", msg);
        setTimeout(function () {
          window.location.href = "my-courses.html";
        }, 1500);
      })
      .catch(function (e) {
        show("danger", e.message || "Không gửi được yêu cầu xác nhận.");
      })
      .finally(function () {
        confirmBtn.disabled = false;
      });
  });
})();

