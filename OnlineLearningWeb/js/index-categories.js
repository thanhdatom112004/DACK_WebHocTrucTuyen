(function () {
  var wrap = document.getElementById("index-category-list");
  var loading = document.getElementById("index-category-loading");
  if (!wrap || !window.OLApi) return;

  var fallbackImages = [
    "images/work-1.jpg",
    "images/work-2.jpg",
    "images/work-3.jpg",
    "images/work-4.jpg",
    "images/work-5.jpg",
    "images/work-6.jpg",
    "images/work-7.jpg",
    "images/work-8.jpg",
    "images/work-9.jpg",
  ];

  function esc(v) {
    var d = document.createElement("div");
    d.textContent = v == null ? "" : String(v);
    return d.innerHTML;
  }

  function normalize(str) {
    return String(str || "").trim().toLowerCase();
  }

  function categoryName(c) {
    if (!c || !c.category) return "";
    if (typeof c.category === "object" && c.category.name) return String(c.category.name).trim();
    return String(c.category).trim();
  }

  Promise.all([OLApi.categories(), OLApi.courses()])
    .then(function (arr) {
      var categories = arr[0] || [];
      var courses = arr[1] || [];

      var byCategory = {};
      courses.forEach(function (c) {
        var key = normalize(categoryName(c));
        if (!key) return;
        if (!byCategory[key]) byCategory[key] = [];
        byCategory[key].push(c);
      });

      if (loading) loading.remove();
      wrap.innerHTML = "";

      if (!categories.length) {
        wrap.innerHTML = '<div class="col-12 text-center text-muted">Chưa có category.</div>';
        return;
      }

      categories.forEach(function (cat, idx) {
        var key = normalize(cat.name);
        var list = byCategory[key] || [];
        var img = cat.image || (list[0] && list[0].images) || fallbackImages[idx % fallbackImages.length];
        var total = list.length;

        var col = document.createElement("div");
        col.className = "col-md-3 col-lg-2";
        col.innerHTML =
          '<a href="course.html" class="course-category img d-flex align-items-center justify-content-center" style="background-image: url(\'' +
          esc(img) +
          '\');">' +
          '<div class="text w-100 text-center">' +
          "<h3>" +
          esc(cat.name) +
          "</h3>" +
          "<span>" +
          total +
          " course</span>" +
          "</div></a>";
        wrap.appendChild(col);
      });
    })
    .catch(function (e) {
      if (loading) loading.remove();
      wrap.innerHTML = '<div class="col-12 text-center text-danger">Không tải được category.</div>';
    });
})();

