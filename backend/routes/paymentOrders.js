const express = require("express");
const router = express.Router();

const { checkLogin, checkRole } = require("../middleware/authHandler");
const paymentOrderModel = require("../models/paymentOrders");
const cartModel = require("../models/carts");
const courseModel = require("../models/courses");
const inventoryModel = require("../models/inventories");
const enrollmentModel = require("../models/enrollments");

function unitPriceFromCartLine(line, course) {
  if (line.unitPriceVnd != null && Number.isFinite(Number(line.unitPriceVnd))) {
    return Math.max(0, Math.round(Number(line.unitPriceVnd)));
  }
  return Math.max(0, Math.round(Number(course.price) || 0));
}

async function buildSnapshotFromCart(userId) {
  const cart = await cartModel.findOne({ user: userId });
  if (!cart || !cart.cartItems || !cart.cartItems.length) {
    throw new Error("Giỏ hàng trống");
  }
  const items = [];
  let total = 0;
  for (const line of cart.cartItems) {
    const course = await courseModel.findOne({ _id: line.course, isDeleted: false });
    if (!course) {
      throw new Error("Khóa học không tồn tại hoặc đã gỡ");
    }
    const qty = Math.max(1, Number(line.quantity) || 1);
    const unit = unitPriceFromCartLine(line, course);
    const lineTotal = unit * qty;
    items.push({
      course: course._id,
      title: course.title,
      price: unit,
      quantity: qty,
    });
    total += lineTotal;
  }
  return { items, total };
}

// POST /api/payment-orders
router.post("/", checkLogin, async function (req, res, next) {
  try {
    const { transferCode, method } = req.body || {};
    if (!transferCode) {
      return res.status(400).send({ message: "Thiếu mã nội dung chuyển khoản" });
    }

    const snapshot = await buildSnapshotFromCart(req.userId);

    const order = await paymentOrderModel.create({
      user: req.userId,
      items: snapshot.items,
      totalAmount: snapshot.total,
      paymentRef: transferCode,
      transferCode,
      method: method || "bank-transfer",
      status: "PENDING",
    });

    res.send(order);
  } catch (e) {
    res.status(400).send({ message: String(e.message || e) });
  }
});

// GET /api/payment-orders (ADMIN)
router.get("/", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    const status = req.query.status;
    const filter = {};
    if (status) filter.status = status.toUpperCase();

    const list = await paymentOrderModel
      .find(filter)
      .populate("user", "username email")
      .populate("items.course", "title")
      .sort({ createdAt: -1 });

    res.send(list);
  } catch (e) {
    res.status(400).send({ message: String(e.message || e) });
  }
});

// POST /api/payment-orders/:id/confirm (ADMIN)
router.post("/:id/confirm", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    const id = req.params.id;
    const order = await paymentOrderModel.findById(id);
    if (!order) return res.status(404).send({ message: "Không tìm thấy đơn thanh toán" });
    if (order.status === "PAID") {
      return res.status(400).send({ message: "Đơn này đã được xác nhận trước đó" });
    }

    // Ghi nhận enrollments + cập nhật inventory
    for (const item of order.items) {
      const course = await courseModel.findOne({ _id: item.course, isDeleted: false });
      if (!course) {
        continue;
      }
      const qty = Math.max(1, Number(item.quantity) || 1);
      const unit = Number(item.price) || Number(course.price) || 0;
      const subtotal = unit * qty;

      const existing = await enrollmentModel.findOne({
        user: order.user,
        course: item.course,
      });

      if (existing) {
        existing.quantity = (existing.quantity || 0) + qty;
        existing.totalPaid = (existing.totalPaid || 0) + subtotal;
        await existing.save();
      } else {
        await enrollmentModel.create({
          user: order.user,
          course: item.course,
          quantity: qty,
          totalPaid: subtotal,
          purchasedAt: new Date(),
        });
      }

      await inventoryModel.updateOne({ course: item.course }, { $inc: { soldCount: qty } });
    }

    // Clear cart của user
    await cartModel.updateOne({ user: order.user }, { $set: { cartItems: [] } });

    order.status = "PAID";
    await order.save();

    res.send({ ok: true, message: "Đã xác nhận thanh toán và mở khóa học cho người dùng." });
  } catch (e) {
    res.status(400).send({ message: String(e.message || e) });
  }
});

module.exports = router;
