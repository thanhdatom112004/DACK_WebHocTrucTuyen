const mongoose = require("mongoose");

const paymentOrderItemSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "course",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    /** Số lượng (snapshot từ giỏ) — bản cũ có thể thiếu → coi như 1 */
    quantity: {
      type: Number,
      min: 1,
      default: 1,
    },
  },
  { _id: false }
);

const paymentOrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    items: {
      type: [paymentOrderItemSchema],
      default: [],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    // Giữ thêm field paymentRef để tương thích index cũ (duy nhất)
    paymentRef: {
      type: String,
      index: true,
      unique: false,
    },
    transferCode: {
      type: String,
      required: true,
      index: true,
    },
    method: {
      type: String,
      default: "bank-transfer",
    },
    status: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("paymentOrder", paymentOrderSchema);
