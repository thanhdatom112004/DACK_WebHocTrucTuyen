const mongoose = require("mongoose");

/**
 * Khóa học đã thanh toán / đăng ký (sau checkout).
 * Mỗi user + course một bản ghi; quantity tích lũy nếu mua thêm.
 */
const enrollmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "course",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      min: 1,
      default: 1,
    },
    /** Tổng tiền đã thanh toán (demo, cộng dồn theo các lần checkout) */
    totalPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    purchasedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

module.exports = mongoose.model("enrollment", enrollmentSchema);
