(function () {
  var alertBox = document.getElementById("cw-alert");
  var titleEl = document.getElementById("cw-title");
  var descEl = document.getElementById("cw-desc");
  var player = document.getElementById("cw-player");
  var youtubeFrame = document.getElementById("cw-youtube");
  var lessons = document.getElementById("cw-lessons");
  var openQuizBtn = document.getElementById("cw-open-quiz");
  var quizStats = document.getElementById("cw-quiz-stats");
  var quizContent = document.getElementById("cw-quiz-content");
  var quizSubmit = document.getElementById("cw-quiz-submit");

  var courseIdGlobal = null;
  var currentLessonId = null;
  var currentQuizItems = null; // sanitized items for render

  function userCanLearnCourse(course) {
    var courseId = course && course._id ? course._id : courseIdGlobal;
    var price = typeof course.price === "number" ? course.price : Number(course.price) || 0;
    // Khóa học miễn phí: ai cũng học được
    if (price <= 0) return Promise.resolve(true);
    if (!OLApi.getToken()) return Promise.resolve(false);
    return Promise.all([OLApi.me(), OLApi.enrollmentsMine()])
      .then(function (arr) {
        var me = arr[0] || {};
        var list = arr[1] || [];
        var roleName = String(
          (me && me.roleName) ||
            (me && me.role && typeof me.role === "object" ? me.role.name : me && me.role) ||
            ""
        ).toUpperCase();
        if (roleName === "ADMIN") return true;
        return list.some(function (en) {
          var cid = en && en.course && en.course._id ? String(en.course._id) : "";
          return cid === String(courseId);
        });
      })
      .catch(function () {
        return false;
      });
  }

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

  function hidePlayers() {
    if (player) {
      try {
        player.pause();
      } catch (e) {}
      player.removeAttribute("src");
      player.load();
      player.style.display = "none";
    }
    if (youtubeFrame) {
      youtubeFrame.removeAttribute("src");
      youtubeFrame.style.display = "none";
    }
  }

  function lessonKeyFromVideo(v, idx) {
    if (v && v._id) return String(v._id);
    return "idx-" + idx;
  }

  function loadQuizPanel() {
    if (!quizContent || !courseIdGlobal || !currentLessonId) return;
    quizContent.innerHTML =
      '<p class="text-muted small mb-0">Đang tải bài kiểm tra...</p>';
    if (quizSubmit) quizSubmit.style.display = "none";
    if (quizStats) quizStats.textContent = "";

    if (!OLApi.getToken()) {
      quizContent.innerHTML =
        '<div class="alert alert-warning mb-0">' +
        "<strong>Đăng nhập</strong> và <strong>mua khóa học</strong> (thêm vào giỏ → thanh toán) để làm quiz và lưu điểm. " +
        '<a href="login.html">Đăng nhập</a> · <a href="cart.html">Giỏ hàng</a></div>';
      if (quizStats) quizStats.textContent = "";
      return;
    }

    OLApi.lessonQuizGet(courseIdGlobal, currentLessonId)
      .then(function (data) {
        if (!data || !data.exists || !data.items || !data.items.length) {
          quizContent.innerHTML =
            '<p class="text-muted mb-0">Chưa có trắc nghiệm hoặc flashcard cho bài học này.</p>';
          if (quizSubmit) quizSubmit.style.display = "none";
          if (quizStats) quizStats.textContent = "";
          return;
        }
        currentQuizItems = data.items;
        renderQuizForm(data.items);
        if (quizSubmit) {
          var hasMcq = data.items.some(function (it) {
            return it.type === "mcq";
          });
          quizSubmit.style.display = hasMcq ? "inline-block" : "none";
        }
        return OLApi.lessonQuizStats(courseIdGlobal, currentLessonId).then(function (st) {
          if (!quizStats || !st) return;
          var parts = [];
          if (st.totalAttempts > 0) {
            parts.push(
              "Đã làm: " +
                st.totalAttempts +
                " lần" +
                (st.bestPercent != null ? " · Điểm cao nhất: " + st.bestPercent + "%" : "") +
                (st.latest && st.latest.percent != null
                  ? " · Lần gần nhất: " + st.latest.percent + "%"
                  : "")
            );
            parts.push(" (Làm lại sẽ lưu thêm một lần làm mới.)");
          } else {
            parts.push("Chưa có lần làm nào cho bài này.");
          }
          quizStats.innerHTML = esc(parts.join(""));
        });
      })
      .catch(function (e) {
        var msg = e && e.message ? e.message : "Không tải được bài kiểm tra.";
        quizContent.innerHTML =
          '<div class="alert alert-danger mb-0">' +
          esc(msg) +
          ' <a href="cart.html">Giỏ hàng</a> · <a href="my-courses.html">Khóa đã mua</a></div>';
        if (quizStats) quizStats.textContent = "";
        if (quizSubmit) quizSubmit.style.display = "none";
      });
  }

  function renderQuizForm(items) {
    if (!quizContent) return;
    var html = "";
    items.forEach(function (it, i) {
      if (it.type === "mcq") {
        html +=
          '<div class="mb-3 p-3 border rounded bg-light" data-q-idx="' +
          i +
          '">' +
          '<p class="font-weight-bold mb-2">' +
          esc(it.prompt || "Câu hỏi") +
          "</p>";
        (it.options || []).forEach(function (opt, j) {
          var id = "mcq-" + i + "-" + j;
          html +=
            '<div class="custom-control custom-radio">' +
            '<input type="radio" class="custom-control-input cw-mcq" name="mcq-' +
            i +
            '" id="' +
            id +
            '" data-qidx="' +
            i +
            '" data-opt="' +
            j +
            '" />' +
            '<label class="custom-control-label" for="' +
            id +
            '">' +
            esc(opt) +
            "</label></div>";
        });
        html += "</div>";
      } else if (it.type === "flashcard") {
        html +=
          '<div class="mb-3 p-3 border rounded" data-fc-idx="' +
          i +
          '">' +
          '<p class="text-muted small mb-1">Flashcard — bấm để lật</p>' +
          '<div class="cw-flip border rounded p-3 bg-white" style="cursor:pointer;min-height:80px;" data-open="0">' +
          '<div class="cw-flip-front font-weight-bold">' +
          esc(it.front || "") +
          "</div>" +
          '<div class="cw-flip-back text-muted" style="display:none">' +
          esc(it.back || "") +
          "</div></div></div>";
      }
    });
    quizContent.innerHTML = html;

    quizContent.querySelectorAll(".cw-flip").forEach(function (el) {
        el.addEventListener("click", function () {
        var f = el.querySelector(".cw-flip-front");
        var b = el.querySelector(".cw-flip-back");
        var showingBack = b && b.style.display === "block";
        if (showingBack) {
          if (f) f.style.display = "block";
          if (b) b.style.display = "none";
        } else {
          if (f) f.style.display = "none";
          if (b) b.style.display = "block";
        }
      });
    });
  }

  function collectAnswers() {
    if (!currentQuizItems) return [];
    var out = [];
    for (var i = 0; i < currentQuizItems.length; i++) {
      var it = currentQuizItems[i];
      if (it.type === "mcq") {
        var sel = quizContent.querySelector(
          'input.cw-mcq[name="mcq-' + i + '"]:checked'
        );
        if (sel) out.push(Number(sel.getAttribute("data-opt")));
        else out.push(null);
      } else {
        out.push(null);
      }
    }
    return out;
  }

  if (openQuizBtn) {
    openQuizBtn.addEventListener("click", function () {
      if (typeof jQuery !== "undefined") {
        jQuery("#cw-quiz-modal").modal("show");
      }
      loadQuizPanel();
    });
  }

  if (quizSubmit) {
    quizSubmit.addEventListener("click", function () {
      if (!courseIdGlobal || !currentLessonId || !currentQuizItems) return;
      if (!OLApi.getToken()) {
        show("warning", "Vui lòng đăng nhập để lưu điểm.");
        window.location.href = "login.html";
        return;
      }
      var answers = collectAnswers();
      var missing = false;
      currentQuizItems.forEach(function (it, i) {
        if (it.type === "mcq" && (answers[i] === null || answers[i] === undefined))
          missing = true;
      });
      if (missing) {
        show("warning", "Vui lòng trả lời hết các câu trắc nghiệm.");
        return;
      }
      OLApi.lessonQuizSubmit(courseIdGlobal, currentLessonId, answers)
        .then(function (res) {
          show(
            "success",
            "Điểm: " +
              res.percent +
              "% (" +
              res.correctCount +
              "/" +
              res.totalMcq +
              " câu đúng). Lần làm thứ " +
              res.attemptNumber +
              "."
          );
          var reviewHtml =
            '<div class="mt-3 p-3 border border-success rounded bg-white"><small class="text-muted">Đáp án chi tiết</small><ul class="mb-0 pl-3">';
          (res.review || []).forEach(function (r, i) {
            if (r.type === "mcq") {
              var ok =
                r.selectedIndex === r.correctIndex
                  ? '<span class="text-success">Đúng</span>'
                  : '<span class="text-danger">Sai</span>';
              reviewHtml +=
                "<li>" +
                esc(r.prompt) +
                " — " +
                ok +
                " (đáp án đúng: mục " +
                (r.correctIndex + 1) +
                ")</li>";
            }
          });
          reviewHtml += "</ul></div>";
          quizContent.innerHTML += reviewHtml;
          if (quizSubmit) quizSubmit.style.display = "none";
          if (OLApi.getToken()) {
            OLApi.lessonQuizStats(courseIdGlobal, currentLessonId).then(function (st) {
              if (!quizStats || !st) return;
              var parts = [];
              if (st.totalAttempts > 0) {
                parts.push(
                  "Đã làm: " +
                    st.totalAttempts +
                    " lần" +
                    (st.bestPercent != null ? " · Điểm cao nhất: " + st.bestPercent + "%" : "") +
                    (st.latest && st.latest.percent != null
                      ? " · Lần gần nhất: " + st.latest.percent + "%"
                      : "")
                );
                parts.push(" Bạn có thể chọn lại bài học và bấm (nếu còn nút) hoặc tải lại trang để làm lại.");
              }
              quizStats.innerHTML = esc(parts.join(""));
            });
          }
        })
        .catch(function (e) {
          show("danger", e.message || "Không nộp được bài.");
        });
    });
  }

  var params = new URLSearchParams(window.location.search);
  var id = params.get("id");
  if (!id) {
    show("danger", "Thiếu id khóa học.");
    return;
  }
  courseIdGlobal = id;

  OLApi.course(id)
    .then(function (course) {
      return Promise.all([course, userCanLearnCourse(course)]);
    })
    .then(function (arr) {
      var course = arr[0];
      var canLearn = !!arr[1];
      titleEl.textContent = course.title || "Khóa học";
      descEl.textContent = course.description || "";
      lessons.innerHTML = "";

      if (!canLearn) {
        lessons.innerHTML =
          '<div class="alert alert-warning mb-0">' +
          "Bạn chưa được mở khóa khóa học này. Vui lòng thanh toán và chờ admin xác nhận.<br>" +
          '<a href="cart.html">Giỏ hàng</a> · <a href="payment.html">Thanh toán</a> · <a href="my-courses.html">Khóa học đã mua</a>' +
          "</div>";
        hidePlayers();
        if (openQuizBtn) openQuizBtn.disabled = true;
        return;
      }

      var vids = course.videos || [];
      if (!vids.length) {
        lessons.innerHTML =
          '<div class="text-muted">Khóa học chưa có video bài học.</div>';
        hidePlayers();
        if (openQuizBtn) openQuizBtn.disabled = true;
        return;
      }

      if (openQuizBtn) openQuizBtn.disabled = false;

      function playVideo(v, idx) {
        var url = v && v.url ? String(v.url).trim() : "";
        var ytId = getYouTubeId(url);

        lessons.querySelectorAll(".list-group-item").forEach(function (el) {
          el.classList.remove("active");
        });
        var active = lessons.querySelector('[data-idx="' + idx + '"]');
        if (active) active.classList.add("active");

        currentLessonId = lessonKeyFromVideo(v, idx);
        if (typeof jQuery !== "undefined") {
          jQuery("#cw-quiz-modal").modal("hide");
        }

        if (!url) {
          hidePlayers();
          return;
        }

        if (ytId && youtubeFrame) {
          if (player) {
            try {
              player.pause();
            } catch (e) {}
            player.removeAttribute("src");
            player.load();
            player.style.display = "none";
          }
          youtubeFrame.style.display = "block";
          youtubeFrame.src =
            "https://www.youtube.com/embed/" +
            encodeURIComponent(ytId) +
            "?rel=0&modestbranding=1";
          return;
        }

        if (youtubeFrame) {
          youtubeFrame.removeAttribute("src");
          youtubeFrame.style.display = "none";
        }
        if (player) {
          player.style.display = "block";
          player.src = url;
          player.play().catch(function () {});
        }
      }

      vids.forEach(function (v, idx) {
        var item = document.createElement("button");
        item.type = "button";
        item.className = "list-group-item list-group-item-action cw-lesson-item";
        item.setAttribute("data-idx", String(idx));
        item.innerHTML =
          "<span class='d-block font-weight-bold'>" +
          esc(v.title || "Bài " + (idx + 1)) +
          "</span><span class='cw-lesson-meta'>Video " +
          (idx + 1) +
          "</span>";
        item.addEventListener("click", function () {
          playVideo(v, idx);
        });
        lessons.appendChild(item);
      });

      playVideo(vids[0], 0);
    })
    .catch(function (e) {
      show("danger", e.message || "Không tải được khóa học.");
    });
})();
