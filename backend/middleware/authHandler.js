const jwt = require("jsonwebtoken");
const userController = require("../controllers/users");

function getJwtSecret() {
  return process.env.JWT_SECRET || "HUTECH";
}

module.exports = {
  checkLogin: async function (req, res, next) {
    try {
      let token;

      if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
      } else {
        let authorizationToken = req.headers.authorization;
        if (!authorizationToken || !authorizationToken.startsWith("Bearer")) {
          return res.status(403).send({ message: "ban chua dang nhap" });
        }
        token = authorizationToken.split(" ")[1];
      }

      const result = jwt.verify(token, getJwtSecret());
      if (result.exp > Date.now()) {
        req.userId = result.id;
        return next();
      }

      return res.status(403).send({ message: "ban khong du thuc thi" });
    } catch (error) {
      return res.status(403).send({ message: "ban chua dang nhap" });
    }
  },

  checkRole: function (...requiredRole) {
    return async function (req, res, next) {
      let userId = req.userId;
      let getUser = await userController.FindByID(userId);
      if (!getUser || !getUser.role || !getUser.role.name) {
        return res.status(403).send({ message: "ban khong co quyen" });
      }
      let roleName = getUser.role.name;
      if (requiredRole.includes(roleName)) return next();

      return res.status(403).send({ message: "ban khong co quyen" });
    };
  },
};
