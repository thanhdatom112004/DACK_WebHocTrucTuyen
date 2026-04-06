const express = require("express");
const router = express.Router();

const { checkLogin } = require("../middleware/authHandler");
const enrollmentModel = require("../models/enrollments");

/** Danh sách khóa học đã mua / đã thanh toán */
router.get("/mine", checkLogin, async function (req, res, next) {
  try {
    const list = await enrollmentModel
      .find({ user: req.userId })
      .populate({
        path: "course",
        select: "title price category images slug description",
        populate: { path: "category", select: "name image" },
      })
      .sort({ updatedAt: -1 });
    res.send(list);
  } catch (e) {
    res.status(400).send({ message: String(e.message || e) });
  }
});

module.exports = router;
