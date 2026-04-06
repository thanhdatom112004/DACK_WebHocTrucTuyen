(function () {
  var tbody = document.getElementById("act-tbody");
  var form = document.getElementById("cat-form");
  var alertBox = document.getElementById("act-alert");
  var imageFileInput = document.getElementById("cat-image-file");
  var imagePreview = document.getElementById("cat-image-preview");
  var uploadedImageDataUrl = "";

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

  function readForm() {
    return {
      id: document.getElementById("cat-id").value.trim(),
      name: document.getElementById("cat-name").value.trim(),
      description: document.getElementById("cat-description").value.trim(),
      image: document.getElementById("cat-image").value.trim(),
    };
  }

  function setPreview(src) {
    if (!imagePreview) return;
    if (!src) {
      imagePreview.style.display = "none";
      imagePreview.removeAttribute("src");
      return;
    }
    imagePreview.src = src;
    imagePreview.style.display = "inline-block";
  }

  function resetForm() {
    form.reset();
    document.getElementById("cat-id").value = "";
    uploadedImageDataUrl = "";
    if (imageFileInput) imageFileInput.value = "";
    setPreview("");
  }

  function fillForm(c) {
    document.getElementById("cat-id").value = c._id || "";
    document.getElementById("cat-name").value = c.name || "";
    document.getElementById("cat-description").value = c.description || "";
    document.getElementById("cat-image").value = c.image || "";
    uploadedImageDataUrl = "";
    if (imageFileInput) imageFileInput.value = "";
    setPreview(c.image || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function load() {
    OLApi.categories()
      .then(function (items) {
        tbody.innerHTML = "";
        if (!items || !items.length) {
          tbody.innerHTML = '<tr><td colspan="4">Chưa có category.</td></tr>';
          return;
        }

        items.forEach(function (c) {
          var tr = document.createElement("tr");
          var imgSrc = c.image || "";
          tr.innerHTML =
            "<td>" +
            esc(c.name) +
            "</td><td>" +
            esc(c.description || "") +
            "</td><td>" +
            (imgSrc
              ? '<img src="' + esc(imgSrc) + '" alt="cat" style="width:70px;height:46px;object-fit:cover;border-radius:4px;border:1px solid #ddd;" />'
              : '<span class="text-muted">Không có</span>') +
            '</td><td><button class="btn btn-sm btn-outline-primary mr-1 btn-edit">Sửa</button><button class="btn btn-sm btn-outline-danger btn-del">Xóa</button></td>';

          tr.querySelector(".btn-edit").addEventListener("click", function () {
            fillForm(c);
          });
          tr.querySelector(".btn-del").addEventListener("click", function () {
            if (!confirm("Xóa category này?")) return;
            OLApi.categoryDelete(c._id)
              .then(function () {
                show("success", "Đã xóa category.");
                load();
              })
              .catch(function (e) {
                show("danger", e.message || "Lỗi xóa category");
              });
          });
          tbody.appendChild(tr);
        });
      })
      .catch(function (e) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-danger">Lỗi tải category.</td></tr>';
        show("danger", e.message || "Không tải được category");
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = readForm();
    if (!data.name) return show("danger", "Tên category không được rỗng.");

    var p = data.id
      ? OLApi.categoryUpdate(data.id, {
          name: data.name,
          description: data.description,
          image: uploadedImageDataUrl || data.image,
        })
      : OLApi.categoryCreate({
          name: data.name,
          description: data.description,
          image: uploadedImageDataUrl || data.image,
        });

    p.then(function () {
      show("success", data.id ? "Đã cập nhật category." : "Đã tạo category.");
      resetForm();
      load();
    }).catch(function (e2) {
      show("danger", e2.message || "Lỗi lưu category");
    });
  });

  var resetBtn = document.getElementById("cat-reset");
  if (resetBtn) resetBtn.addEventListener("click", resetForm);

  if (imageFileInput) {
    imageFileInput.addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) {
        uploadedImageDataUrl = "";
        setPreview(document.getElementById("cat-image").value.trim());
        return;
      }
      var reader = new FileReader();
      reader.onload = function (ev) {
        uploadedImageDataUrl = ev.target && ev.target.result ? String(ev.target.result) : "";
        setPreview(uploadedImageDataUrl);
      };
      reader.onerror = function () {
        uploadedImageDataUrl = "";
        show("danger", "Không đọc được file ảnh.");
      };
      reader.readAsDataURL(file);
    });
  }

  var imageUrlInput = document.getElementById("cat-image");
  if (imageUrlInput) {
    imageUrlInput.addEventListener("input", function () {
      if (!uploadedImageDataUrl) setPreview(imageUrlInput.value.trim());
    });
  }

  load();
})();

