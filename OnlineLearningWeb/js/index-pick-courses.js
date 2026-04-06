/**
 * Trang chủ — khối "Pick Your Course": load khóa học từ API.
 * Giá = 0: hiển thị Miễn phí, nút "Đăng ký ngay" (thêm vào giỏ đăng ký).
 * Giá > 0: hiển thị giá, nút "Thêm vào giỏ".
 * Đã có enrollment: badge "Đã đăng ký" thay cho nút giỏ.
 */
(function () {
  var row = document.getElementById("index-pick-courses-row");
  var loading = document.getElementById("index-pick-courses-loading");
  var alertBox = document.getElementById("index-pick-alert");
  if (!row) return;

  var imgs = [
    "images/work-1.jpg",
    "images/work-2.jpg",
    "images/work-3.jpg",
    "images/work-4.jpg",
    "images/work-5.jpg",
    "images/work-6.jpg",
  ];

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

  function isFree(c) {
    var p = typeof c.price === "number" ? c.price : Number(c.price);
    return !isNaN(p) && p <= 0;
  }

  /** Chuẩn hoá ảnh khóa học (API có thể trả string hoặc dữ liệu cũ dạng mảng). */
  function normalizeCourseImage(c) {
    var raw = c && c.images;
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    if (Array.isArray(raw) && raw.length) {
      var first = raw[0];
      if (typeof first === "string" && first.trim()) return first.trim();
    }
    return "";
  }

  var enrolledByCourseId = {};

  function setEnrolledFromList(enrollments) {
    enrolledByCourseId = {};
    (enrollments || []).forEach(function (en) {
      var cid = "";
      if (en && en.course && en.course._id) cid = String(en.course._id);
      else if (en && en.course) cid = String(en.course);
      if (cid) enrolledByCourseId[cid] = true;
    });
  }

  function isEnrolled(courseId) {
    return !!enrolledByCourseId[String(courseId)];
  }

  var enrollmentsPromise = OLApi.getToken()
    ? OLApi.enrollmentsMine().catch(function () {
        return [];
      })
    : Promise.resolve([]);

  Promise.all([OLApi.courses(), enrollmentsPromise])
    .then(function (arr) {
      var list = arr[0] || [];
      setEnrolledFromList(arr[1] || []);
      if (loading) loading.remove();
      row.innerHTML = "";
      if (!list || !list.length) {
        row.innerHTML =
          '<div class="col-12 text-center text-muted py-4">Chưa có khóa học nào.</div>';
        return;
      }
      list.forEach(function (c, i) {
        var img = normalizeCourseImage(c) || imgs[i % imgs.length];
        var cat = "Khóa học";
        if (c.category && typeof c.category === "object" && c.category.name) {
          cat = c.category.name;
        } else if (typeof c.category === "string" && String(c.category).trim()) {
          cat = String(c.category).trim();
        }
        var price = typeof c.price === "number" ? c.price : Number(c.price) || 0;
        var id = c._id;
        var free = isFree(c);
        var priceLabel = OLApi.formatCoursePriceDisplay(price);
        var desc = (c.description || "").slice(0, 100);
        if (c.description && c.description.length > 100) desc += "…";

        var col = document.createElement("div");
        // Không dùng .ftco-animate: template ẩn opacity:0 cho tới khi Waypoint chạy — nội dung
        // thêm sau khi load API không được Waypoint bắt → màn hình trống vĩnh viễn.
        col.className = "col-md-4 d-flex mb-4";
        col.innerHTML =
          '<div class="project-wrap index-pick-card d-flex flex-column h-100 w-100">' +
          '<a href="course-watch.html?id=' +
          encodeURIComponent(String(id)) +
          '" class="img index-pick-course-img">' +
          '<span class="price">' +
          escapeHtml(cat) +
          "</span></a>" +
          '<div class="text p-4 d-flex flex-column flex-grow-1">' +
          "<h3><a href=\"course-watch.html?id=" +
          encodeURIComponent(String(id)) +
          '">' +
          escapeHtml(c.title || "") +
          "</a></h3>" +
          '<p class="advisor small text-muted mb-0">' +
          escapeHtml(desc || " ") +
          "</p>" +
          '<ul class="list-unstyled index-pick-meta">' +
          '<li class="price">' +
          escapeHtml(priceLabel) +
          "</li>" +
          '<li class="index-pick-actions">' +
          '<a class="btn btn-sm btn-outline-success" href="course-watch.html?id=' +
          encodeURIComponent(String(id)) +
          '">Xem bài học</a>' +
          (isEnrolled(id)
            ? '<span class="sl-enrolled-tag sl-enrolled-tag--compact" role="status"><span class="sl-enrolled-tag__icon fa fa-check" aria-hidden="true"></span><span class="sl-enrolled-tag__text">Đã đăng ký</span></span>'
            : '<button type="button" class="btn btn-sm btn-pick-cart ' +
              (free ? "btn-success" : "btn-primary") +
              '" data-id="' +
              escapeHtml(String(id)) +
              '" data-free="' +
              (free ? "1" : "0") +
              '">' +
              (free ? "Đăng ký ngay" : "Thêm vào giỏ") +
              "</button>") +
          "</li>" +
          "</ul></div></div>";
        row.appendChild(col);
        var imgLink = col.querySelector(".index-pick-course-img");
        if (imgLink) {
          // Gán qua JS tránh lỗi dấu " lồng trong style="..." khi URL có & ? hoặc data URL
          imgLink.style.backgroundImage = "url(" + JSON.stringify(img) + ")";
        }
      });

      row.querySelectorAll(".btn-pick-cart").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var cid = btn.getAttribute("data-id");
          var free = btn.getAttribute("data-free") === "1";
          if (!OLApi.getToken()) {
            showAlert(
              "warning",
              "Bạn cần đăng nhập để " + (free ? "đăng ký khóa học" : "thêm vào giỏ") + ". Mở trang Đăng nhập."
            );
            return;
          }
          OLApi.cartAdd(cid, 1)
            .then(function () {
              showAlert(
                "success",
                free
                  ? "Đã đăng ký khóa học miễn phí (đã thêm vào Giỏ đăng ký)."
                  : "Đã thêm vào giỏ đăng ký."
              );
            })
            .catch(function (e) {
              showAlert("danger", e.message || "Không thực hiện được.");
            });
        });
      });
    })
    .catch(function (e) {
      if (loading) loading.remove();
      row.innerHTML =
        '<div class="col-12 text-center text-danger py-4">Không tải được khóa học: ' +
        escapeHtml(e.message || "") +
        "</div>";
    });
})();
