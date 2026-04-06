const express = require("express");
const router = express.Router();

const { checkLogin, checkRole } = require("../middleware/authHandler");
const userController = require("../controllers/users");

// ADMIN only
router.get(
  "/",
  checkLogin,
  checkRole("ADMIN"),
  async function (req, res, next) {
    const result = await userController.getAllUser();
    res.send(result);
  }
);

router.get(
  "/:id",
  checkLogin,
  checkRole("ADMIN"),
  async function (req, res, next) {
    const result = await userController.FindByID(req.params.id);
    if (!result) return res.status(404).send({ message: "id not found" });
    res.send(result);
  }
);

// Soft delete user (ADMIN)
router.delete(
  "/:id",
  checkLogin,
  checkRole("ADMIN"),
  async function (req, res, next) {
    const userModel = require("../models/users");
    try {
      const updated = await userModel.findByIdAndUpdate(
        req.params.id,
        { isDeleted: true },
        { new: true }
      );
      if (!updated) return res.status(404).send({ message: "id not found" });
      res.send(updated);
    } catch (e) {
      res.status(400).send({ message: String(e.message || e) });
    }
  }
);

module.exports = router;
