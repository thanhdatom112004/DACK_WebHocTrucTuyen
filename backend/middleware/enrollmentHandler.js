const userController = require("../controllers/users");
const enrollmentModel = require("../models/enrollments");

/**
 * Sau checkLogin: chỉ ADMIN hoặc user đã có enrollment (đã thanh toán) mới được truy cập.
 */
module.exports.requireCourseEnrollment = async function (req, res, next) {
  try {
    const courseId = req.params.courseId;
    const user = await userController.FindByID(req.userId);
    if (user && user.role && String(user.role.name).toUpperCase() === "ADMIN") {
      return next();
    }
    const en = await enrollmentModel.findOne({
      user: req.userId,
      course: courseId,
    });
    if (!en) {
      return res.status(403).send({
        message:
          "Bạn cần mua khóa học (thanh toán trong giỏ hàng) để làm quiz, xem điểm và nộp bài.",
      });
    }
    next();
  } catch (e) {
    res.status(400).send({ message: String(e.message || e) });
  }
};
