(function () {
  var tbody = document.getElementById("au-tbody");
  var alertBox = document.getElementById("au-alert");

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

  function roleName(user) {
    if (!user || !user.role) return "-";
    return typeof user.role === "object" ? user.role.name || "-" : user.role;
  }

  function load() {
    OLApi.users()
      .then(function (users) {
        tbody.innerHTML = "";
        if (!users || !users.length) {
          tbody.innerHTML = '<tr><td colspan="5">Chưa có người dùng.</td></tr>';
          return;
        }
        users.forEach(function (u) {
          var tr = document.createElement("tr");
          tr.innerHTML =
            "<td>" +
            esc(u.username) +
            "</td><td>" +
            esc(u.email) +
            "</td><td>" +
            esc(roleName(u)) +
            "</td><td>" +
            (u.status ? "Active" : "Inactive") +
            '</td><td><button class="btn btn-sm btn-outline-danger btn-del">Xóa mềm</button></td>';

          tr.querySelector(".btn-del").addEventListener("click", function () {
            if (!confirm("Xóa mềm user này?")) return;
            OLApi.userDelete(u._id)
              .then(function () {
                show("success", "Đã xóa user.");
                load();
              })
              .catch(function (e) {
                show("danger", e.message || "Lỗi xóa user");
              });
          });
          tbody.appendChild(tr);
        });
      })
      .catch(function (e) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-danger">Không tải được users.</td></tr>';
        show("danger", e.message || "Lỗi tải users");
      });
  }

  load();
})();

