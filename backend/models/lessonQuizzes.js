const mongoose = require("mongoose");

const quizItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["mcq", "flashcard"],
      required: true,
    },
    prompt: { type: String, default: "" },
    options: [{ type: String }],
    correctIndex: { type: Number, min: 0 },
    front: { type: String, default: "" },
    back: { type: String, default: "" },
  },
  { _id: false }
);

const lessonQuizSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "course",
      required: true,
      index: true,
    },
    /** _id của subdocument video hoặc "idx-0", "idx-1"... */
    lessonId: { type: String, required: true, trim: true },
    items: {
      type: [quizItemSchema],
      default: [],
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

lessonQuizSchema.index({ course: 1, lessonId: 1 }, { unique: true });

module.exports = mongoose.model("lessonQuiz", lessonQuizSchema);
