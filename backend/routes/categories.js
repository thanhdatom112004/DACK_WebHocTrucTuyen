const express = require("express");
const router = express.Router();

const categoryModel = require("../models/categories");
const courseModel = require("../models/courses");
const { checkLogin, checkRole } = require("../middleware/authHandler");

router.get("/", async function (req, res, next) {
  const items = await categoryModel.find({ isDeleted: false }).sort({ name: 1 });
  res.send(items);
});

router.post("/", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    const { name, description = "", image = "" } = req.body;
    const item = await categoryModel.create({ name, description, image });
    res.send(item);
  } catch (e) {
    res.status(400).send({ message: String(e.message || e) });
  }
});

router.put("/:id", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    const updated = await categoryModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).send({ message: "id not found" });
    res.send(updated);
  } catch (e) {
    res.status(400).send({ message: String(e.message || e) });
  }
});

router.delete("/:id", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    const id = req.params.id;
    const updated = await categoryModel.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    if (!updated) return res.status(404).send({ message: "id not found" });
    await courseModel.updateMany({ category: id }, { $set: { category: null } });
    res.send(updated);
  } catch (e) {
    res.status(400).send({ message: String(e.message || e) });
  }
});

module.exports = router;
