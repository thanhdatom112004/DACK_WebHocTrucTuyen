/**
 * Gọi API cùng origin (Express phục vụ static + /api).
 * Dùng credentials để gửi cookie httpOnly (token).
 */
(function (window) {
  var TOKEN_KEY = "ol_token";

  function getApiBase() {
    return "";
  }

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
  }

  /** Giới hạn trên cho giá khóa học (VND, số nguyên). */
  var MAX_PRICE_VND = 999999999999;

  /**
   * Định dạng số tiền VND (đơn giản: 0 → "0đ", >0 → "1.000.000đ").
   */
  function formatPriceVnd(n) {
    var p = typeof n === "number" && !isNaN(n) ? n : Number(n) || 0;
    if (p <= 0) return "0đ";
    return p.toLocaleString("vi-VN") + "đ";
  }

  /**
   * Giá hiển thị trên thẻ khóa học: miễn phí vs có phí.
   */
  function formatCoursePriceDisplay(n) {
    var p = typeof n === "number" && !isNaN(n) ? n : Number(n) || 0;
    if (p <= 0) return "Miễn phí";
    return p.toLocaleString("vi-VN") + "đ";
  }

  /**
   * Kiểm tra giá nhập (admin): số nguyên VND, không âm, không vượt trần.
   * @returns {{ ok: true, value: number } | { ok: false, message: string }}
   */
  function validatePriceVnd(raw) {
    var n = Number(raw);
    if (!Number.isFinite(n)) {
      return { ok: false, message: "Giá phải là số hợp lệ (VND)." };
    }
    var r = Math.round(n);
    if (r < 0) {
      return { ok: false, message: "Giá không được âm." };
    }
    if (r > MAX_PRICE_VND) {
      return { ok: false, message: "Giá vượt quá giới hạn cho phép (VND)." };
    }
    return { ok: true, value: r };
  }

  function apiFetch(path, options) {
    options = options || {};
    var headers = options.headers || {};
    var token = getToken();
    if (token && !headers.Authorization) {
      headers.Authorization = "Bearer " + token;
    }
    var method = options.method || "GET";
    var isFormData =
      typeof FormData !== "undefined" && options.body && options.body instanceof FormData;
    if (!isFormData && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    var body;
    if (!options.body) {
      body = undefined;
    } else if (isFormData) {
      body = options.body;
    } else if (typeof options.body === "string") {
      body = options.body;
    } else {
      body = JSON.stringify(options.body);
    }
    return fetch(getApiBase() + path, {
      credentials: "include",
      // Tránh cache GET (dữ liệu khóa học/video sau khi admin cập nhật)
      cache: method === "GET" ? "no-store" : "default",
      headers: headers,
      body: body,
      method: method,
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (txt) {
          try {
            var j = JSON.parse(txt);
            var msg = j.message;
            if (Array.isArray(msg)) msg = msg.map(function (x) { return x.msg || x; }).join("; ");
            throw new Error(msg || txt || res.statusText);
          } catch (e) {
            if (e instanceof SyntaxError) throw new Error(txt || res.statusText);
            throw e;
          }
        });
      }
      var ct = res.headers.get("content-type");
      if (ct && ct.indexOf("application/json") !== -1) return res.json();
      return res.text();
    });
  }

  window.OLApi = {
    getToken: getToken,
    setToken: setToken,
    fetch: apiFetch,
    MAX_PRICE_VND: MAX_PRICE_VND,
    formatPriceVnd: formatPriceVnd,
    formatCoursePriceDisplay: formatCoursePriceDisplay,
    validatePriceVnd: validatePriceVnd,
    /** Đăng nhập: tham số đầu là tên đăng nhập hoặc email */
    login: function (usernameOrEmail, password) {
      return apiFetch("/api/auth/login", {
        method: "POST",
        body: { username: usernameOrEmail, password: password },
      }).then(function (data) {
        if (data && data.token) setToken(data.token);
        return data;
      });
    },
    logout: function () {
      return apiFetch("/api/auth/logout", { method: "POST" }).finally(function () {
        setToken("");
      });
    },
    register: function (body) {
      return apiFetch("/api/auth/register", { method: "POST", body: body });
    },
    me: function () {
      return apiFetch("/api/auth/me");
    },
    profileUpdate: function (body) {
      return apiFetch("/api/auth/profile", { method: "PUT", body: body });
    },
    /** Upload avatar (FormData với field tên `file`) */
    profileAvatarUpload: function (formData) {
      return apiFetch("/api/auth/profile/avatar", { method: "POST", body: formData });
    },
    changePassword: function (oldPassword, newPassword) {
      return apiFetch("/api/auth/changepassword", {
        method: "POST",
        body: { oldPassword: oldPassword, newPassword: newPassword },
      });
    },
    /** Gửi OTP quên mật khẩu — body.email có thể là email hoặc tên đăng nhập */
    forgotPassword: function (emailOrUsername) {
      return apiFetch("/api/auth/forgotpassword", {
        method: "POST",
        body: { email: emailOrUsername },
      });
    },
    /** Đặt lại mật khẩu — tham số đầu: email hoặc username (trùng bước gửi OTP) */
    resetPassword: function (emailOrUsername, otp, newPassword) {
      return apiFetch("/api/auth/resetpassword", {
        method: "POST",
        body: { email: emailOrUsername, otp: String(otp), newPassword: newPassword },
      });
    },
    /** Đã đăng nhập: gửi OTP xác thực email */
    verifyEmailSendOtp: function () {
      return apiFetch("/api/auth/verify-email/send-otp", { method: "POST", body: {} });
    },
    /** Đã đăng nhập: xác nhận OTP email */
    verifyEmailConfirm: function (otp) {
      return apiFetch("/api/auth/verify-email/confirm", {
        method: "POST",
        body: { otp: String(otp) },
      });
    },
    courses: function () {
      return apiFetch("/api/courses");
    },
    courseCreate: function (body) {
      return apiFetch("/api/courses", { method: "POST", body: body });
    },
    courseImageUpload: function (formData) {
      return apiFetch("/api/courses/upload-image", { method: "POST", body: formData });
    },
    courseUpdate: function (id, body) {
      return apiFetch("/api/courses/" + encodeURIComponent(id), {
        method: "PUT",
        body: body,
      });
    },
    courseDelete: function (id) {
      return apiFetch("/api/courses/" + encodeURIComponent(id), {
        method: "DELETE",
      });
    },
    course: function (id) {
      return apiFetch("/api/courses/" + encodeURIComponent(id));
    },
    users: function () {
      return apiFetch("/api/users");
    },
    categories: function () {
      return apiFetch("/api/categories");
    },
    categoryCreate: function (body) {
      return apiFetch("/api/categories", { method: "POST", body: body });
    },
    categoryUpdate: function (id, body) {
      return apiFetch("/api/categories/" + encodeURIComponent(id), {
        method: "PUT",
        body: body,
      });
    },
    categoryDelete: function (id) {
      return apiFetch("/api/categories/" + encodeURIComponent(id), {
        method: "DELETE",
      });
    },
    userDelete: function (id) {
      return apiFetch("/api/users/" + encodeURIComponent(id), {
        method: "DELETE",
      });
    },
    cartGet: function () {
      return apiFetch("/api/carts/get-cart");
    },
    cartAdd: function (courseId, quantity) {
      return apiFetch("/api/carts/add-cart", {
        method: "POST",
        body: { product: courseId, quantity: quantity || 1 },
      });
    },
    cartRemove: function (courseId) {
      return apiFetch("/api/carts/remove", {
        method: "POST",
        body: { product: courseId },
      });
    },
    cartReduce: function (courseId) {
      return apiFetch("/api/carts/reduce", {
        method: "POST",
        body: { product: courseId },
      });
    },
    /** Thanh toán demo — chuyển giỏ sang khóa học đã mua */
    cartCheckout: function () {
      return apiFetch("/api/carts/checkout", { method: "POST", body: {} });
    },
    /** Khóa học đã thanh toán / đăng ký */
    enrollmentsMine: function () {
      return apiFetch("/api/enrollments/mine");
    },
    /** Quiz theo bài học (lessonId = _id của video hoặc idx-0, idx-1...) */
    lessonQuizGet: function (courseId, lessonId) {
      return apiFetch(
        "/api/lesson-quizzes/" +
          encodeURIComponent(courseId) +
          "/" +
          encodeURIComponent(lessonId)
      );
    },
    /** Admin: quiz đầy đủ kèm đáp án */
    lessonQuizGetFull: function (courseId, lessonId) {
      return apiFetch(
        "/api/lesson-quizzes/" +
          encodeURIComponent(courseId) +
          "/" +
          encodeURIComponent(lessonId) +
          "/full"
      );
    },
    lessonQuizStats: function (courseId, lessonId) {
      return apiFetch(
        "/api/lesson-quizzes/" +
          encodeURIComponent(courseId) +
          "/" +
          encodeURIComponent(lessonId) +
          "/my-stats"
      );
    },
    lessonQuizSubmit: function (courseId, lessonId, answers) {
      return apiFetch(
        "/api/lesson-quizzes/" +
          encodeURIComponent(courseId) +
          "/" +
          encodeURIComponent(lessonId) +
          "/submit",
        { method: "POST", body: { answers: answers } }
      );
    },
    /** Admin: lưu toàn bộ items */
    lessonQuizUpsert: function (courseId, lessonId, items) {
      return apiFetch(
        "/api/lesson-quizzes/" +
          encodeURIComponent(courseId) +
          "/" +
          encodeURIComponent(lessonId),
        { method: "PUT", body: { items: items } }
      );
    },
    lessonQuizDelete: function (courseId, lessonId) {
      return apiFetch(
        "/api/lesson-quizzes/" +
          encodeURIComponent(courseId) +
          "/" +
          encodeURIComponent(lessonId),
        { method: "DELETE" }
      );
    },
    /** Tạo đơn thanh toán (bank transfer) từ giỏ hàng hiện tại */
    paymentOrderCreate: function (transferCode, method) {
      return apiFetch("/api/payment-orders", {
        method: "POST",
        body: { transferCode: transferCode, method: method || "bank-transfer" },
      });
    },
    /** Admin: danh sách đơn thanh toán */
    paymentOrdersList: function (status) {
      var path = "/api/payment-orders";
      if (status) path += "?status=" + encodeURIComponent(status);
      return apiFetch(path);
    },
    /** Admin: xác nhận đơn thanh toán */
    paymentOrderConfirm: function (id) {
      return apiFetch("/api/payment-orders/" + encodeURIComponent(id) + "/confirm", {
        method: "POST",
      });
    },
    /** Tin nhắn: danh sách hội thoại (mỗi người một dòng gần nhất) */
    messagesConversations: function () {
      return apiFetch("/api/messages/conversations");
    },
    /** Tin nhắn với một user */
    messagesWith: function (userId) {
      return apiFetch("/api/messages/with/" + encodeURIComponent(userId));
    },
    /** Gửi tin (JSON) */
    messagesSend: function (to, messageText) {
      return apiFetch("/api/messages", {
        method: "POST",
        body: { to: to, message: messageText },
      });
    },
    /** Gửi tin kèm file ảnh (multipart) */
    messagesSendWithFile: function (formData) {
      return apiFetch("/api/messages", {
        method: "POST",
        body: formData,
      });
    },
    /** Danh sách tài khoản admin (để user chọn chat) */
    messagesAdmins: function () {
      return apiFetch("/api/messages/admins");
    },
    /** ID tài khoản hộ trợ chung (một inbox cho mọi admin) */
    messagesSupportConfig: function () {
      return apiFetch("/api/messages/support/config");
    },
    /** Hội thoại hỗ trợ: học viên không tham số; admin truyền userId học viên */
    messagesSupportThread: function (otherUserId) {
      var q = otherUserId ? "?userId=" + encodeURIComponent(otherUserId) : "";
      return apiFetch("/api/messages/support/thread" + q);
    },
    /** Admin: danh sách học viên đã nhắn hỗ trợ */
    messagesSupportInbox: function () {
      return apiFetch("/api/messages/support/inbox");
    },
    /** Thu hồi tin nhắn của bản thân (trong ~3 giờ) */
    messagesRecall: function (messageId) {
      return apiFetch("/api/messages/" + encodeURIComponent(messageId) + "/recall", {
        method: "POST",
      });
    },
  };
})(window);
