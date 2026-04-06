(function () {
  var tbody = document.getElementById("apo-tbody");
  var alertBox = document.getElementById("apo-alert");
  var filterSelect = document.getElementById("apo-filter-status");

  function show(type, msg) {
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

  function statusBadge(status) {
    var s = String(status || "").toUpperCase();
    if (s === "PAID") return '<span class="badge badge-success">ĐÃ XÁC NHẬN</span>';
    return '<span class="badge badge-warning text-dark">CHỜ XÁC NHẬN</span>';
  }

  function load() {
    var status = filterSelect ? filterSelect.value : "";
    tbody.innerHTML = '<tr><td colspan="6" class="text-muted">Đang tải...</td></tr>';
    OLApi.paymentOrdersList(status)
      .then(function (list) {
        tbody.innerHTML = "";
        if (!list || !list.length) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-muted">Chưa có đơn thanh toán.</td></tr>';
          return;
        }
        list.forEach(function (o) {
          var tr = document.createElement("tr");
          var user = o.user || {};
          var createdAt = o.createdAt ? new Date(o.createdAt) : null;
          var timeText = createdAt
            ? createdAt.toLocaleString("vi-VN")
            : "";
          tr.innerHTML =
            "<td>" +
            esc(o.transferCode) +
            "</td><td>" +
            esc(user.username || "") +
            " (" +
            esc(user.email || "") +
            ")</td><td>" +
            esc(OLApi.formatPriceVnd(o.totalAmount || 0)) +
            "</td><td>" +
            statusBadge(o.status) +
            "</td><td>" +
            esc(timeText) +
            '</td><td class="text-right">' +
            (o.status === "PENDING"
              ? '<button class="btn btn-sm btn-success btn-confirm">Xác nhận</button>'
              : "") +
            "</td>";

          if (o.status === "PENDING") {
            tr.querySelector(".btn-confirm").addEventListener("click", function () {
              if (!confirm("Xác nhận đã nhận thanh toán cho đơn " + o.transferCode + "?")) return;
              OLApi.paymentOrderConfirm(o._id)
                .then(function (res) {
                  show("success", (res && res.message) || "Đã xác nhận thanh toán.");
                  load();
                })
                .catch(function (e) {
                  show("danger", e.message || "Lỗi xác nhận thanh toán.");
                });
            });
          }

          tbody.appendChild(tr);
        });
      })
      .catch(function (e) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="text-danger">Lỗi tải danh sách đơn thanh toán.</td></tr>';
        show("danger", e.message || "Không tải được danh sách đơn thanh toán.");
      });
  }

  if (filterSelect) {
    filterSelect.addEventListener("change", load);
  }

  load();
})();

