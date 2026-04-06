const express = require("express");
const router = express.Router();

const roleModel = require("../models/roles");
const { checkLogin, checkRole } = require("../middleware/authHandler");

// ADMIN only
router.get("/", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  const roles = await roleModel.find({ isDeleted: false });
  res.send(roles);
});

router.get("/:id", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    const result = await roleModel.find({ _id: req.params.id, isDeleted: false });
    if (result.length > 0) return res.send(result);
    return res.status(404).send({ message: "id not found" });
  } catch (error) {
    return res.status(404).send({ message: "id not found" });
  }
});

router.post("/", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    const newItem = new roleModel({
      name: req.body.name,
      description: req.body.description,
    });
    await newItem.save();
    res.send(newItem);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

router.put("/:id", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    const id = req.params.id;
    const updated = await roleModel.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return res.status(404).send({ message: "id not found" });
    res.send(updated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// Soft delete role (ADMIN)
router.delete("/:id", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    const id = req.params.id;
    const updated = await roleModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );
    if (!updated) return res.status(404).send({ message: "id not found" });
    res.send(updated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

module.exports = router;
