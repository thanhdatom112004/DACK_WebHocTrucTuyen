const mongoose = require("mongoose");

const lessonQuizAttemptSchema = new mongoose.Schema(
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
    lessonId: { type: String, required: true, trim: true },
    /** Số câu trắc nghiệm đúng */
    correctCount: { type: Number, required: true },
    /** Tổng câu trắc nghiệm (flashcard không tính) */
    totalMcq: { type: Number, required: true },
    /** Điểm % (0–100), chỉ tính trên MCQ */
    percent: { type: Number, required: true },
    /** Thứ tự lần làm (1, 2, 3...) trong cặp user+course+lesson */
    attemptNumber: { type: Number, required: true },
  },
  { timestamps: true }
);

lessonQuizAttemptSchema.index({ user: 1, course: 1, lessonId: 1, createdAt: -1 });

module.exports = mongoose.model("lessonQuizAttempt", lessonQuizAttemptSchema);
