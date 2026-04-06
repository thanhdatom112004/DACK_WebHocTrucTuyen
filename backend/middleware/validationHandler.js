const { body, validationResult } = require("express-validator");
const util = require("util");

const passwordRules = {
  password: {
    minLength: 8,
    minLowercase: 1,
    minSymbols: 1,
    minUppercase: 1,
    minNumbers: 1,
  },
};

module.exports = {
  userPostValidation: [
    body("username")
      .notEmpty()
      .withMessage("username khong duoc de trong")
      .bail()
      .trim()
      .isLength({ min: 2 })
      .withMessage("username qua ngan"),
    body("email")
      .notEmpty()
      .withMessage("email khong duoc de trong")
      .bail()
      .isEmail()
      .withMessage("khong phai email"),
    body("password")
      .notEmpty()
      .withMessage("password khong duoc de trong")
      .bail()
      .isStrongPassword(passwordRules.password)
      .withMessage(
        util.format(
          "password phai co it nhat %d ki tu, trong do it nhat %d ki tu so",
          passwordRules.password.minLength,
          passwordRules.password.minNumbers
        )
      ),
    body("avatarUrl").optional().isURL().withMessage("avatarUrl phai la URL"),
  ],

  validateResult: function (req, res, next) {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(400).send({ message: result.errors });
    }
    next();
  },
};
