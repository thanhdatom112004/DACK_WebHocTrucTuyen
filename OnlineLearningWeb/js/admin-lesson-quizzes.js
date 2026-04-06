(function () {
  var alertBox = document.getElementById("alq-alert");
  var courseSel = document.getElementById("alq-course");
  var lessonSel = document.getElementById("alq-lesson");
  var editor = document.getElementById("alq-editor");
  var itemsWrap = document.getElementById("alq-items");
  var btnAddMcq = document.getElementById("alq-add-mcq");
  var btnAddFc = document.getElementById("alq-add-fc");
  var btnSave = document.getElementById("alq-save");
  var btnDel = document.getElementById("alq-delete-quiz");

  var currentCourseId = "";
  var currentLessonId = "";
  var currentItems = [];

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

  function lessonKey(v, idx) {
    if (v && v._id) return String(v._id);
    return "idx-" + idx;
  }

  function renderItems() {
    if (!itemsWrap) return;
    itemsWrap.innerHTML = "";
    currentItems.forEach(function (it, i) {
      var wrap = document.createElement("div");
      wrap.className = "border rounded p-3 mb-3 bg-light";
      if (it.type === "mcq") {
        wrap.innerHTML =
          '<div class="d-flex justify-content-between align-items-center mb-2">' +
          "<strong>Câu trắc nghiệm #" +
          (i + 1) +
          '</strong><button type="button" class="btn btn-sm btn-outline-danger alq-remove" data-i="' +
          i +
          '">Xóa</button></div>' +
          '<div class="form-group"><label>Nội dung câu hỏi</label>' +
          '<input type="text" class="form-control alq-mcq-prompt" data-i="' +
          i +
          '" value="' +
          esc(it.prompt || "") +
          '" /></div>' +
          '<div class="form-row">' +
          '<div class="form-group col-md-6"><label>Lựa chọn A</label><input class="form-control alq-opt" data-i="' +
          i +
          '" data-j="0" value="' +
          esc((it.options && it.options[0]) || "") +
          '" /></div>' +
          '<div class="form-group col-md-6"><label>Lựa chọn B</label><input class="form-control alq-opt" data-i="' +
          i +
          '" data-j="1" value="' +
          esc((it.options && it.options[1]) || "") +
          '" /></div>' +
          '</div><div class="form-row">' +
          '<div class="form-group col-md-6"><label>Lựa chọn C</label><input class="form-control alq-opt" data-i="' +
          i +
          '" data-j="2" value="' +
          esc((it.options && it.options[2]) || "") +
          '" /></div>' +
          '<div class="form-group col-md-6"><label>Lựa chọn D</label><input class="form-control alq-opt" data-i="' +
          i +
          '" data-j="3" value="' +
          esc((it.options && it.options[3]) || "") +
          '" /></div>' +
          '</div>' +
          '<div class="form-group"><label>Đáp án đúng</label>' +
          '<select class="form-control alq-correct" data-i="' +
          i +
          '">' +
          '<option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option>' +
          "</select></div>";
        var sel = wrap.querySelector(".alq-correct");
        if (sel) sel.value = String(it.correctIndex != null ? it.correctIndex : 0);
      } else {
        wrap.innerHTML =
          '<div class="d-flex justify-content-between align-items-center mb-2">' +
          "<strong>Flashcard #" +
          (i + 1) +
          '</strong><button type="button" class="btn btn-sm btn-outline-danger alq-remove" data-i="' +
          i +
          '">Xóa</button></div>' +
          '<div class="form-group"><label>Mặt trước</label>' +
          '<input type="text" class="form-control alq-f-front" data-i="' +
          i +
          '" value="' +
          esc(it.front || "") +
          '" /></div>' +
          '<div class="form-group"><label>Mặt sau</label>' +
          '<textarea class="form-control alq-f-back" data-i="' +
          i +
          '" rows="2">' +
          esc(it.back || "") +
          "</textarea></div>";
      }
      itemsWrap.appendChild(wrap);
    });

    itemsWrap.querySelectorAll(".alq-remove").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var ix = Number(btn.getAttribute("data-i"));
        currentItems.splice(ix, 1);
        renderItems();
      });
    });
  }

  function readItemsFromDom() {
    var out = [];
    for (var i = 0; i < currentItems.length; i++) {
      var base = currentItems[i];
      if (base.type === "mcq") {
        var p = itemsWrap.querySelector(".alq-mcq-prompt[data-i='" + i + "']");
        var opts = [];
        for (var j = 0; j < 4; j++) {
          var inp = itemsWrap.querySelector(".alq-opt[data-i='" + i + "'][data-j='" + j + "']");
          opts.push(inp ? inp.value.trim() : "");
        }
        var c = itemsWrap.querySelector(".alq-correct[data-i='" + i + "']");
        out.push({
          type: "mcq",
          prompt: p ? p.value.trim() : "",
          options: opts,
          correctIndex: c ? Number(c.value) : 0,
        });
      } else {
        var f = itemsWrap.querySelector(".alq-f-front[data-i='" + i + "']");
        var b = itemsWrap.querySelector(".alq-f-back[data-i='" + i + "']");
        out.push({
          type: "flashcard",
          front: f ? f.value.trim() : "",
          back: b ? b.value.trim() : "",
        });
      }
    }
    return out;
  }

  function loadCourses() {
    OLApi.courses()
      .then(function (list) {
        if (!courseSel) return;
        courseSel.innerHTML = '<option value="">-- Chọn --</option>';
        (list || []).forEach(function (c) {
          var op = document.createElement("option");
          op.value = c._id;
          op.textContent = c.title || c._id;
          courseSel.appendChild(op);
        });
      })
      .catch(function (e) {
        show("danger", e.message || "Không tải khóa học");
      });
  }

  function loadLessons(courseId) {
    if (!lessonSel) return;
    lessonSel.innerHTML = '<option value="">-- Chọn bài --</option>';
    lessonSel.disabled = true;
    currentLessonId = "";
    if (!courseId) return;
    OLApi.course(courseId)
      .then(function (course) {
        lessonSel.disabled = false;
        (course.videos || []).forEach(function (v, idx) {
          var op = document.createElement("option");
          op.value = lessonKey(v, idx);
          op.textContent = (v.title || "Bài " + (idx + 1)) + " (" + lessonKey(v, idx) + ")";
          lessonSel.appendChild(op);
        });
      })
      .catch(function () {
        show("danger", "Không tải chi tiết khóa học");
      });
  }

  function loadExistingQuiz() {
    if (!currentCourseId || !currentLessonId) return;
    OLApi.lessonQuizGetFull(currentCourseId, currentLessonId)
      .then(function (data) {
        if (data && data.exists && data.items && data.items.length) {
          currentItems = data.items.map(function (it) {
            if (it.type === "mcq") {
              return {
                type: "mcq",
                prompt: it.prompt,
                options: it.options || ["", "", "", ""],
                correctIndex:
                  typeof it.correctIndex === "number" ? it.correctIndex : 0,
              };
            }
            return { type: "flashcard", front: it.front, back: it.back };
          });
          show("success", "Đã tải quiz hiện có.");
        } else {
          currentItems = [];
          show("warning", "Chưa có quiz — thêm câu hỏi bên dưới.");
        }
        renderItems();
      })
      .catch(function () {
        currentItems = [];
        renderItems();
      });
  }

  if (courseSel) {
    courseSel.addEventListener("change", function () {
      currentCourseId = courseSel.value;
      currentItems = [];
      if (editor) editor.style.display = "none";
      if (btnDel) btnDel.disabled = true;
      loadLessons(currentCourseId);
    });
  }

  if (lessonSel) {
    lessonSel.addEventListener("change", function () {
      currentLessonId = lessonSel.value;
      if (!currentLessonId) {
        if (editor) editor.style.display = "none";
        if (btnDel) btnDel.disabled = true;
        return;
      }
      if (editor) editor.style.display = "block";
      if (btnDel) btnDel.disabled = false;
      loadExistingQuiz();
    });
  }

  if (btnAddMcq) {
    btnAddMcq.addEventListener("click", function () {
      currentItems.push({
        type: "mcq",
        prompt: "",
        options: ["", "", "", ""],
        correctIndex: 0,
      });
      renderItems();
    });
  }

  if (btnAddFc) {
    btnAddFc.addEventListener("click", function () {
      currentItems.push({ type: "flashcard", front: "", back: "" });
      renderItems();
    });
  }

  if (btnSave) {
    btnSave.addEventListener("click", function () {
      if (!currentCourseId || !currentLessonId) return;
      var items = readItemsFromDom();
      for (var k = 0; k < items.length; k++) {
        var it = items[k];
        if (it.type === "mcq") {
          if (!it.prompt) return show("danger", "Câu MCQ #" + (k + 1) + " thiếu nội dung.");
          var nonempty = it.options.filter(function (o) {
            return o && o.length;
          });
          if (nonempty.length < 2) return show("danger", "Mỗi MCQ cần ít nhất 2 lựa chọn có nội dung.");
        }
      }
      OLApi.lessonQuizUpsert(currentCourseId, currentLessonId, items)
        .then(function () {
          show("success", "Đã lưu quiz.");
        })
        .catch(function (e) {
          show("danger", e.message || "Lỗi lưu");
        });
    });
  }

  if (btnDel) {
    btnDel.addEventListener("click", function () {
      if (!currentCourseId || !currentLessonId) return;
      if (!confirm("Xóa quiz của bài này?")) return;
      OLApi.lessonQuizDelete(currentCourseId, currentLessonId)
        .then(function () {
          currentItems = [];
          renderItems();
          show("success", "Đã xóa quiz.");
        })
        .catch(function (e) {
          show("danger", e.message || "Lỗi");
        });
    });
  }

  loadCourses();
})();
