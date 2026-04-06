const mongoose = require("mongoose");
const userModel = require("../models/users");
const roleModel = require("../models/roles");

let cachedSupportId = null;

async function getSupportUserId() {
  if (cachedSupportId) return cachedSupportId;
  const envId = process.env.SUPPORT_USER_ID;
  if (envId && mongoose.Types.ObjectId.isValid(envId)) {
    cachedSupportId = String(envId);
    return cachedSupportId;
  }
  let u = await userModel.findOne({ username: "support_studylab_inbox" });
  if (!u) {
    const adminRole = await roleModel.findOne({ name: "ADMIN" });
    if (!adminRole) {
      throw new Error("Thieu role ADMIN de tao tai khoan ho tro");
    }
    u = await userModel.create({
      username: "support_studylab_inbox",
      password: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
      email: "support@studylab.local",
      role: adminRole._id,
      fullName: "Hỗ trợ StudyLab",
      status: true,
    });
  }
  cachedSupportId = u._id.toString();
  return cachedSupportId;
}

module.exports = { getSupportUserId };
