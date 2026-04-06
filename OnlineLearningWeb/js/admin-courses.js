(function () {
  var tbody = document.getElementById("ac-tbody");
  var form = document.getElementById("course-form");
  var alertBox = document.getElementById("ac-alert");
  var imageFileInput = document.getElementById("course-image-file");
  var imagePreview = document.getElementById("course-image-preview");
  var imagePreviewGroup = document.getElementById("course-image-preview-group");
  var videoList = document.getElementById("video-list");
  var addVideoBtn = document.getElementById("add-video-btn");
  var uploadedImageUrl = "";

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

  function getYouTubeId(url) {
    if (!url || typeof url !== "string") return null;
    var u = url.trim();
    var m;
    m = u.match(/youtube\.com\/embed\/([^?&#/]+)/i);
    if (m) return m[1];
    m = u.match(/youtube\.com\/shorts\/([^?&#/]+)/i);
    if (m) return m[1];
    m = u.match(/youtu\.be\/([^?&#/]+)/i);
    if (m) return m[1];
    if (/youtube\.com/i.test(u)) {
      m = u.match(/[?&]v=([^?&#/]+)/i);
      if (m) return m[1];
    }
    return null;
  }

  function readForm() {
    var videos = [];
    if (videoList) {
      var items = videoList.querySelectorAll(".video-item");
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var t = item.querySelector(".video-title");
        var u = item.querySelector(".video-url");
        var title = t ? t.value.trim() : "";
        var url = u ? u.value.trim() : "";
        // Có URL là lưu được (thiếu tiêu đề thì backend gán "Bài học")
        if (url) {
          var vid = { title: title || "Bài học", url: url };
          var lid = item.querySelector(".video-lesson-id");
          if (lid && lid.value) vid._id = lid.value;
          videos.push(vid);
        }
        else if (title) {
          // Có tiêu đề nhưng chưa có URL — báo để không bị "mất" bài học âm thầm
          throw new Error("Bài video \"" + title + "\" chưa có URL hoặc chưa upload file.");
        }
      }
    }
    var priceInput = document.getElementById("course-price");
    var pv = OLApi.validatePriceVnd(priceInput ? priceInput.value : 0);
    if (!pv.ok) {
      throw new Error(pv.message);
    }
    return {
      id: document.getElementById("course-id").value.trim(),
      title: document.getElementById("course-title").value.trim(),
      price: pv.value,
      category: document.getElementById("course-category").value.trim(),
      description: document.getElementById("course-description").value.trim(),
      images: document.getElementById("course-images").value.trim(),
      videos: videos,
    };
  }

  function setPreview(src) {
    if (!imagePreview) return;
    if (!src) {
      imagePreview.style.display = "none";
      imagePreview.removeAttribute("src");
      if (imagePreviewGroup) imagePreviewGroup.classList.add("d-none");
      return;
    }
    imagePreview.src = src;
    imagePreview.style.display = "inline-block";
    if (imagePreviewGroup) imagePreviewGroup.classList.remove("d-none");
  }

  function resetForm() {
    form.reset();
    document.getElementById("course-id").value = "";
    uploadedImageUrl = "";
    if (imageFileInput) imageFileInput.value = "";
    setPreview("");
    if (videoList) videoList.innerHTML = "";
    loadCategories("");
  }

  function createVideoItem(video) {
    var row = document.createElement("div");
    row.className = "video-item border rounded p-2 mb-2";
    row.innerHTML =
      '<div class="form-row">' +
      '<div class="form-group col-md-4 mb-2">' +
      "<label>Tiêu đề bài</label>" +
      '<input class="form-control video-title" placeholder="Bài 1: Lập trình cơ bản" />' +
      "</div>" +
      '<div class="form-group col-md-6 mb-2">' +
      "<label>Video URL / Data URL</label>" +
      '<input class="form-control video-url" placeholder="https://... hoặc data:video/..." />' +
      "</div>" +
      '<div class="form-group col-md-2 mb-2 d-flex align-items-end">' +
      '<button type="button" class="btn btn-outline-danger btn-sm btn-block video-remove">Xóa</button>' +
      "</div>" +
      "</div>" +
      '<div class="form-row">' +
      '<div class="form-group col-md-9 mb-1">' +
      '<input type="file" class="form-control-file video-file" accept="video/*" />' +
      '<small class="text-muted">Có thể upload video từ máy (sẽ chuyển thành data URL).</small>' +
      "</div>" +
      '<div class="form-group col-md-3 mb-1 d-flex align-items-end video-preview-wrap" style="display:none;">' +
      '<button type="button" class="btn btn-outline-secondary btn-sm btn-block video-preview-btn">Preview</button>' +
      "</div>" +
      "</div>" +
      '<input type="hidden" class="video-lesson-id" value="" />' +
      '<video class="video-preview w-100" controls style="display:none;max-height:220px"></video>' +
      '<iframe class="video-preview-yt w-100" title="YouTube preview" style="display:none;min-height:200px;max-height:220px;border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';

    var titleInput = row.querySelector(".video-title");
    var urlInput = row.querySelector(".video-url");
    var fileInput = row.querySelector(".video-file");
    var previewBtn = row.querySelector(".video-preview-btn");
    var previewWrap = row.querySelector(".video-preview-wrap");
    var preview = row.querySelector(".video-preview");
    var previewYt = row.querySelector(".video-preview-yt");
    var removeBtn = row.querySelector(".video-remove");

    var lessonIdInput = row.querySelector(".video-lesson-id");
    if (video) {
      titleInput.value = video.title || "";
      urlInput.value = video.url || "";
      if (lessonIdInput && video._id) lessonIdInput.value = String(video._id);
    }

    function syncVideoPreviewState() {
      var src = urlInput.value.trim();
      if (!src) {
        preview.style.display = "none";
        preview.removeAttribute("src");
        if (previewYt) {
          previewYt.style.display = "none";
          previewYt.removeAttribute("src");
        }
        if (previewWrap) previewWrap.style.display = "none";
        return;
      }
      if (previewWrap) previewWrap.style.display = "flex";
    }

    fileInput.addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        urlInput.value = ev.target && ev.target.result ? String(ev.target.result) : "";
        syncVideoPreviewState();
        show("success", "Đã nạp video vào bài học.");
      };
      reader.onerror = function () {
        show("danger", "Không đọc được video file.");
      };
      reader.readAsDataURL(file);
    });

    previewBtn.addEventListener("click", function () {
      var src = urlInput.value.trim();
      if (!src) return show("warning", "Chưa có URL video để preview.");
      var ytId = getYouTubeId(src);
      if (ytId && previewYt) {
        preview.style.display = "none";
        preview.removeAttribute("src");
        previewYt.style.display = "block";
        previewYt.src =
          "https://www.youtube.com/embed/" +
          encodeURIComponent(ytId) +
          "?rel=0&modestbranding=1";
        return;
      }
      if (previewYt) {
        previewYt.style.display = "none";
        previewYt.removeAttribute("src");
      }
      preview.src = src;
      preview.style.display = "block";
    });

    urlInput.addEventListener("input", syncVideoPreviewState);

    removeBtn.addEventListener("click", function () {
      row.remove();
    });

    syncVideoPreviewState();
    return row;
  }

  function categoryIdForForm(c) {
    if (!c || !c.category) return "";
    if (typeof c.category === "object" && c.category._id) return String(c.category._id);
    return String(c.category || "");
  }

  function categoryNameForTable(c) {
    if (!c || !c.category) return "";
    if (typeof c.category === "object" && c.category.name) return c.category.name;
    return "";
  }

  function fillForm(c) {
    document.getElementById("course-id").value = c._id || "";
    document.getElementById("course-title").value = c.title || "";
    document.getElementById("course-price").value = c.price || 0;
    document.getElementById("course-description").value = c.description || "";
    document.getElementById("course-images").value = c.images || "";
    uploadedImageUrl = "";
    if (imageFileInput) imageFileInput.value = "";
    setPreview(c.images || "");
    if (videoList) {
      videoList.innerHTML = "";
      (c.videos || []).forEach(function (v) {
        videoList.appendChild(createVideoItem(v));
      });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    loadCategories(categoryIdForForm(c));
  }

  function renderCategoryOptions(items, selectedValue) {
    var select = document.getElementById("course-category");
    if (!select) return;
    select.innerHTML = '<option value="">-- Chọn category --</option>';
    (items || []).forEach(function (cat) {
      var op = document.createElement("option");
      op.value = String(cat._id);
      op.textContent = cat.name;
      if (selectedValue && String(selectedValue) === String(cat._id)) {
        op.selected = true;
      }
      select.appendChild(op);
    });
  }

  function loadCategories(selectedValue) {
    return OLApi.categories()
      .then(function (items) {
        renderCategoryOptions(items, selectedValue);
      })
      .catch(function () {
        // không chặn luồng nếu category API lỗi
      });
  }

  function load() {
    OLApi.courses()
      .then(function (list) {
        tbody.innerHTML = "";
        if (!list || !list.length) {
          tbody.innerHTML = '<tr><td colspan="4">Chưa có khóa học.</td></tr>';
          return;
        }
        list.forEach(function (c) {
          var tr = document.createElement("tr");
          tr.innerHTML =
            "<td>" +
            esc(c.title) +
            "</td><td>" +
            esc(OLApi.formatPriceVnd(c.price || 0)) +
            "</td><td>" +
            esc(categoryNameForTable(c)) +
            '</td><td><button class="btn btn-sm btn-outline-success mr-1 btn-view">Xem</button><button class="btn btn-sm btn-outline-primary mr-1 btn-edit">Sửa</button><button class="btn btn-sm btn-outline-danger btn-del">Xóa</button></td>';
          tr.querySelector(".btn-view").addEventListener("click", function () {
            window.location.href = "course-watch.html?id=" + encodeURIComponent(c._id);
          });
          tr.querySelector(".btn-edit").addEventListener("click", function () {
            OLApi.course(c._id)
              .then(function (full) {
                fillForm(full);
              })
              .catch(function () {
                fillForm(c);
              });
          });
          tr.querySelector(".btn-del").addEventListener("click", function () {
            if (!confirm("Xóa mềm khóa học này?")) return;
            OLApi.courseDelete(c._id)
              .then(function () {
                show("success", "Đã xóa khóa học.");
                load();
              })
              .catch(function (e) {
                show("danger", e.message || "Lỗi xóa");
              });
          });
          tbody.appendChild(tr);
        });
      })
      .catch(function (e) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-danger">Lỗi tải dữ liệu</td></tr>';
        show("danger", e.message || "Không tải được courses");
      });
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data;
      try {
        data = readForm();
      } catch (err) {
        show("danger", err.message || "Lỗi dữ liệu bài học video.");
        return;
      }
      if (!data.title) return show("danger", "Tiêu đề không được để trống.");

      var payload = {
        title: data.title,
        price: data.price,
        category: data.category || "",
        description: data.description,
        images: uploadedImageUrl || data.images,
        videos: data.videos,
      };

      var p = data.id ? OLApi.courseUpdate(data.id, payload) : OLApi.courseCreate(payload);
      p.then(function () {
        show("success", data.id ? "Đã cập nhật khóa học." : "Đã tạo khóa học.");
        resetForm();
        load();
      }).catch(function (e) {
        show("danger", e.message || "Lỗi lưu khóa học");
      });
    });
  }

  var resetBtn = document.getElementById("course-reset");
  if (resetBtn) resetBtn.addEventListener("click", resetForm);

  if (imageFileInput) {
    imageFileInput.addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) {
        uploadedImageUrl = "";
        setPreview(document.getElementById("course-images").value.trim());
        return;
      }
      var fd = new FormData();
      fd.append("file", file);
      show("info", "Đang tải ảnh lên server...");
      OLApi.courseImageUpload(fd)
        .then(function (res) {
          uploadedImageUrl = res && res.imageUrl ? String(res.imageUrl) : "";
          document.getElementById("course-images").value = uploadedImageUrl;
          setPreview(uploadedImageUrl);
          show("success", "Đã tải ảnh lên thành công.");
        })
        .catch(function (err) {
          uploadedImageUrl = "";
          if (imageFileInput) imageFileInput.value = "";
          setPreview(document.getElementById("course-images").value.trim());
          show("danger", err.message || "Không tải được file ảnh.");
        });
    });
  }

  var imageUrlInput = document.getElementById("course-images");
  if (imageUrlInput) {
    imageUrlInput.addEventListener("input", function () {
      if (!uploadedImageUrl) {
        setPreview(imageUrlInput.value.trim());
      }
    });
  }

  if (addVideoBtn && videoList) {
    addVideoBtn.addEventListener("click", function () {
      videoList.appendChild(createVideoItem());
    });
  }

  loadCategories();
  load();
})();

