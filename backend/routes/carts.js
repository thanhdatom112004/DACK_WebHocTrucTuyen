const express = require("express");
const router = express.Router();

const { checkLogin } = require("../middleware/authHandler");

const cartModel = require("../models/carts");
const inventoryModel = require("../models/inventories");
const courseModel = require("../models/courses");
const enrollmentModel = require("../models/enrollments");

async function getOrCreateCart(userId) {
  let cart = await cartModel.findOne({ user: userId });
  if (!cart) {
    cart = await cartModel.create({ user: userId, cartItems: [] });
  }
  return cart;
}

function unitPriceFromLine(item, course) {
  if (item.unitPriceVnd != null && Number.isFinite(Number(item.unitPriceVnd))) {
    return Math.max(0, Math.round(Number(item.unitPriceVnd)));
  }
  return Math.max(0, Math.round(Number(course && course.price) || 0));
}

// GET /api/carts/get-cart
router.get("/get-cart", checkLogin, async function (req, res, next) {
  const cart = await getOrCreateCart(req.userId);
  res.send(cart.cartItems);
});

// POST /api/carts/add-cart
router.post("/add-cart", checkLogin, async function (req, res, next) {
  const { product, quantity } = req.body;

  const courseExists = await inventoryModel.findOne({ course: product });
  if (!courseExists) return res.status(404).send({ message: "product khong ton tai" });

  const course = await courseModel.findOne({ _id: product, isDeleted: false });
  const unitSnap = course ? Math.max(0, Math.round(Number(course.price) || 0)) : 0;

  const cart = await getOrCreateCart(req.userId);

  const idx = cart.cartItems.findIndex(
    (e) => String(e.course) === String(product)
  );

  if (idx === -1) {
    cart.cartItems.push({
      course: product,
      quantity: Number(quantity) || 1,
      unitPriceVnd: unitSnap,
    });
  } else {
    cart.cartItems[idx].quantity += Number(quantity) || 1;
  }

  await cart.save();
  res.send(cart);
});

// POST /api/carts/add-one
router.post("/add-one", checkLogin, async function (req, res, next) {
  const { product } = req.body;

  const courseExists = await inventoryModel.findOne({ course: product });
  if (!courseExists) return res.status(404).send({ message: "product khong ton tai" });

  const course = await courseModel.findOne({ _id: product, isDeleted: false });
  const unitSnap = course ? Math.max(0, Math.round(Number(course.price) || 0)) : 0;

  const cart = await getOrCreateCart(req.userId);

  const idx = cart.cartItems.findIndex(
    (e) => String(e.course) === String(product)
  );

  if (idx === -1) {
    cart.cartItems.push({
      course: product,
      quantity: 1,
      unitPriceVnd: unitSnap,
    });
  } else {
    cart.cartItems[idx].quantity += 1;
  }

  await cart.save();
  res.send(cart);
});

// POST /api/carts/reduce
router.post("/reduce", checkLogin, async function (req, res, next) {
  const { product } = req.body;

  const cart = await getOrCreateCart(req.userId);
  const idx = cart.cartItems.findIndex(
    (e) => String(e.course) === String(product)
  );

  if (idx === -1) return res.status(404).send({ message: "product not in cart" });

  cart.cartItems[idx].quantity -= 1;
  if (cart.cartItems[idx].quantity <= 0) {
    cart.cartItems.splice(idx, 1);
  }

  await cart.save();
  res.send(cart);
});

// POST /api/carts/remove
router.post("/remove", checkLogin, async function (req, res, next) {
  const { product } = req.body;

  const cart = await getOrCreateCart(req.userId);
  const idx = cart.cartItems.findIndex(
    (e) => String(e.course) === String(product)
  );

  if (idx === -1) return res.status(404).send({ message: "product not in cart" });

  cart.cartItems.splice(idx, 1);
  await cart.save();
  res.send(cart);
});

/**
 * Thanh toán (demo: luôn thành công).
 * Ghi nhận vào enrollment, làm trống giỏ.
 */
router.post("/checkout", checkLogin, async function (req, res, next) {
  try {
    const cart = await getOrCreateCart(req.userId);
    if (!cart.cartItems || !cart.cartItems.length) {
      return res.status(400).send({ message: "Giỏ hàng trống" });
    }

    let paymentTotal = 0;
    const paymentRef = "PAY-" + Date.now();

    for (const item of cart.cartItems) {
      const course = await courseModel.findOne({ _id: item.course, isDeleted: false });
      if (!course) {
        return res.status(400).send({ message: "Khóa học không tồn tại hoặc đã gỡ" });
      }

      const qty = Math.max(1, Number(item.quantity) || 1);
      const unit = unitPriceFromLine(item, course);
      const subtotal = unit * qty;
      paymentTotal += subtotal;

      const existing = await enrollmentModel.findOne({
        user: req.userId,
        course: item.course,
      });

      if (existing) {
        existing.quantity = (existing.quantity || 0) + qty;
        existing.totalPaid = (existing.totalPaid || 0) + subtotal;
        await existing.save();
      } else {
        await enrollmentModel.create({
          user: req.userId,
          course: item.course,
          quantity: qty,
          totalPaid: subtotal,
          purchasedAt: new Date(),
        });
      }

      await inventoryModel.updateOne({ course: item.course }, { $inc: { soldCount: qty } });
    }

    cart.cartItems = [];
    await cart.save();

    res.send({
      ok: true,
      message: "Thanh toán thành công",
      paymentRef,
      total: paymentTotal,
    });
  } catch (e) {
    res.status(400).send({ message: String(e.message || e) });
  }
});

module.exports = router;
