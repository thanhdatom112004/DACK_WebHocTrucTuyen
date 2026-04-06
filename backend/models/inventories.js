const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "course",
      required: true,
      unique: true,
    },
    stock: {
      type: Number,
      min: 0,
      default: 0,
    },
    reserved: {
      type: Number,
      min: 0,
      default: 0,
    },
    soldCount: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("inventory", inventorySchema);
