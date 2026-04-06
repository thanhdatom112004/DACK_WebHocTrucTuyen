const mongoose = require("mongoose");
const { DEFAULT_COURSE_IMAGE } = require("../utils/courseImageUrl");

const videoItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: true }
);

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    price: {
      type: Number,
      default: 0,
      min: [0, "Giá không được âm"],
      max: [999999999999, "Giá vượt quá giới hạn (VND)"],
    },
    description: {
      type: String,
      default: "",
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "category",
      default: null,
    },
    images: {
      type: String,
      default: DEFAULT_COURSE_IMAGE,
      maxlength: 2048,
    },
    videos: {
      type: [videoItemSchema],
      default: [],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("course", courseSchema);
