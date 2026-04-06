const express = require("express");
const router = express.Router();

const courseModel = require("../models/courses");
const lessonQuizModel = require("../models/lessonQuizzes");
const lessonQuizAttemptModel = require("../models/lessonQuizAttempts");
const { checkLogin, checkRole } = require("../middleware/authHandler");
const { requireCourseEnrollment } = require("../middleware/enrollmentHandler");

function findLessonInCourse(course, lessonIdParam) {
  const id = String(lessonIdParam || "").trim();
  if (!course.videos || !course.videos.length) return null;
  try {
    const byId = course.videos.id(id);
    if (byId) return { lessonKey: String(byId._id), video: byId };
  } catch (e) {
    /* invalid ObjectId for .id() */
  }
  const m = /^idx-(\d+)$/.exec(id);
  if (m) {
    const idx = parseInt(m[1], 10);
    if (idx >= 0 && idx < course.videos.length) {
      const v = course.videos[idx];
      const lessonKey = v._id ? String(v._id) : `idx-${idx}`;
      return { lessonKey, video: v, index: idx };
    }
  }
  return null;
}

function sanitizeItemsForStudent(items) {
  return (items || []).map((it) => {
    if (it.type === "mcq") {
      return {
        type: "mcq",
        prompt: it.prompt || "",
        options: Array.isArray(it.options) ? it.options : [],
      };
    }
    if (it.type === "flashcard") {
      return {
        type: "flashcard",
        front: it.front || "",
        back: it.back || "",
      };
    }
    return {};
  });
}

function gradeQuiz(items, answers) {
  let correctCount = 0;
  let totalMcq = 0;
  const arr = Array.isArray(answers) ? answers : [];
  for (let i = 0; i < (items || []).length; i++) {
    const it = items[i];
    if (!it || it.type !== "mcq") continue;
    totalMcq++;
    const sel = arr[i];
    if (typeof sel === "number" && sel === it.correctIndex) correctCount++;
  }
  const percent =
    totalMcq === 0 ? 100 : Math.round((correctCount / totalMcq) * 10000) / 100;
  return { correctCount, totalMcq, percent };
}

/** Admin: lấy đầy đủ quiz (có đáp án) */
router.get(
  "/:courseId/:lessonId/full",
  checkLogin,
  checkRole("ADMIN"),
  async function (req, res, next) {
    try {
      const course = await courseModel.findOne({
        _id: req.params.courseId,
        isDeleted: false,
      });
      if (!course) return res.status(404).send({ message: "Không tìm thấy khóa học" });

      const found = findLessonInCourse(course, req.params.lessonId);
      if (!found) return res.status(404).send({ message: "Không tìm thấy bài học" });

      const quiz = await lessonQuizModel.findOne({
        course: course._id,
        lessonId: found.lessonKey,
        isDeleted: false,
      });
      if (!quiz) return res.send({ exists: false, items: [] });
      res.send({ exists: true, lessonKey: found.lessonKey, items: quiz.items });
    } catch (e) {
      res.status(400).send({ message: String(e.message || e) });
    }
  }
);

/** Thống kê điểm của user hiện tại — cần đăng nhập + đã mua khóa (ADMIN bỏ qua) */
router.get(
  "/:courseId/:lessonId/my-stats",
  checkLogin,
  requireCourseEnrollment,
  async function (req, res, next) {
    try {
      const course = await courseModel.findOne({
        _id: req.params.courseId,
        isDeleted: false,
      });
      if (!course) return res.status(404).send({ message: "Không tìm thấy khóa học" });

      const found = findLessonInCourse(course, req.params.lessonId);
      if (!found) return res.status(404).send({ message: "Không tìm thấy bài học" });

      const attempts = await lessonQuizAttemptModel
        .find({
          user: req.userId,
          course: course._id,
          lessonId: found.lessonKey,
        })
        .sort({ createdAt: -1 })
        .lean();

      const totalAttempts = attempts.length;
      const latest = attempts[0] || null;
      let bestPercent = null;
      for (const a of attempts) {
        if (bestPercent === null || a.percent > bestPercent) bestPercent = a.percent;
      }

      res.send({
        lessonKey: found.lessonKey,
        totalAttempts,
        latest: latest
          ? {
              percent: latest.percent,
              correctCount: latest.correctCount,
              totalMcq: latest.totalMcq,
              attemptNumber: latest.attemptNumber,
              createdAt: latest.createdAt,
            }
          : null,
        bestPercent,
      });
    } catch (e) {
      res.status(400).send({ message: String(e.message || e) });
    }
  }
);

/** Nộp bài — lưu mỗi lần làm (làm lại = thêm bản ghi mới) */
router.post(
  "/:courseId/:lessonId/submit",
  checkLogin,
  requireCourseEnrollment,
  async function (req, res, next) {
    try {
      const course = await courseModel.findOne({
        _id: req.params.courseId,
        isDeleted: false,
      });
      if (!course) return res.status(404).send({ message: "Không tìm thấy khóa học" });

      const found = findLessonInCourse(course, req.params.lessonId);
      if (!found) return res.status(404).send({ message: "Không tìm thấy bài học" });

      const quiz = await lessonQuizModel.findOne({
        course: course._id,
        lessonId: found.lessonKey,
        isDeleted: false,
      });
      if (!quiz || !quiz.items || !quiz.items.length) {
        return res.status(404).send({ message: "Chưa có bài kiểm tra cho bài học này" });
      }

      const answers = req.body && Array.isArray(req.body.answers) ? req.body.answers : [];
      if (answers.length !== quiz.items.length) {
        return res.status(400).send({
          message: "Số lượng đáp án không khớp số câu hỏi",
        });
      }

      const { correctCount, totalMcq, percent } = gradeQuiz(quiz.items, answers);

      const prevCount = await lessonQuizAttemptModel.countDocuments({
        user: req.userId,
        course: course._id,
        lessonId: found.lessonKey,
      });

      const attempt = await lessonQuizAttemptModel.create({
        user: req.userId,
        course: course._id,
        lessonId: found.lessonKey,
        correctCount,
        totalMcq,
        percent,
        attemptNumber: prevCount + 1,
      });

      res.send({
        correctCount,
        totalMcq,
        percent,
        attemptNumber: attempt.attemptNumber,
        /** Trả đáp án đúng để học viên đối chiếu (chỉ sau khi nộp) */
        review: quiz.items.map((it, i) => {
          if (it.type === "mcq") {
            return {
              type: "mcq",
              prompt: it.prompt,
              options: it.options,
              correctIndex: it.correctIndex,
              selectedIndex: answers[i],
            };
          }
          return { type: "flashcard", front: it.front, back: it.back };
        }),
      });
    } catch (e) {
      res.status(400).send({ message: String(e.message || e) });
    }
  }
);

/** GET quiz để làm bài — cần đăng nhập + đã mua khóa (ADMIN xem thử được) */
router.get(
  "/:courseId/:lessonId",
  checkLogin,
  requireCourseEnrollment,
  async function (req, res, next) {
    try {
      const course = await courseModel.findOne({
        _id: req.params.courseId,
        isDeleted: false,
      });
      if (!course) return res.status(404).send({ message: "Không tìm thấy khóa học" });

      const found = findLessonInCourse(course, req.params.lessonId);
      if (!found) return res.status(404).send({ message: "Không tìm thấy bài học" });

      const quiz = await lessonQuizModel.findOne({
        course: course._id,
        lessonId: found.lessonKey,
        isDeleted: false,
      });
      if (!quiz) {
        return res.send({
          exists: false,
          lessonKey: found.lessonKey,
          items: [],
        });
      }

      res.send({
        exists: true,
        lessonKey: found.lessonKey,
        items: sanitizeItemsForStudent(quiz.items),
      });
    } catch (e) {
      res.status(400).send({ message: String(e.message || e) });
    }
  }
);

/** Admin: tạo/cập nhật toàn bộ bài quiz cho một bài học */
router.put("/:courseId/:lessonId", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    const course = await courseModel.findOne({
      _id: req.params.courseId,
      isDeleted: false,
    });
    if (!course) return res.status(404).send({ message: "Không tìm thấy khóa học" });

    const found = findLessonInCourse(course, req.params.lessonId);
    if (!found) return res.status(404).send({ message: "Không tìm thấy bài học" });

    const items = req.body && Array.isArray(req.body.items) ? req.body.items : [];
    for (const it of items) {
      if (it.type === "mcq") {
        if (!Array.isArray(it.options) || it.options.length < 2) {
          return res.status(400).send({ message: "MCQ cần ít nhất 2 lựa chọn" });
        }
        if (
          typeof it.correctIndex !== "number" ||
          it.correctIndex < 0 ||
          it.correctIndex >= it.options.length
        ) {
          return res.status(400).send({ message: "correctIndex MCQ không hợp lệ" });
        }
      } else if (it.type === "flashcard") {
        if (!String(it.front || "").trim() && !String(it.back || "").trim()) {
          return res.status(400).send({ message: "Flashcard cần nội dung" });
        }
      } else {
        return res.status(400).send({ message: "Loại câu hỏi không hợp lệ" });
      }
    }

    const quiz = await lessonQuizModel.findOneAndUpdate(
      { course: course._id, lessonId: found.lessonKey },
      {
        $set: {
          items,
          isDeleted: false,
        },
        $setOnInsert: {
          course: course._id,
          lessonId: found.lessonKey,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.send(quiz);
  } catch (e) {
    res.status(400).send({ message: String(e.message || e) });
  }
});

/** Admin: xóa mềm quiz */
router.delete("/:courseId/:lessonId", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    const course = await courseModel.findOne({
      _id: req.params.courseId,
      isDeleted: false,
    });
    if (!course) return res.status(404).send({ message: "Không tìm thấy khóa học" });

    const found = findLessonInCourse(course, req.params.lessonId);
    if (!found) return res.status(404).send({ message: "Không tìm thấy bài học" });

    await lessonQuizModel.findOneAndUpdate(
      { course: course._id, lessonId: found.lessonKey },
      { isDeleted: true }
    );
    res.send({ ok: true });
  } catch (e) {
    res.status(400).send({ message: String(e.message || e) });
  }
});

module.exports = router;
