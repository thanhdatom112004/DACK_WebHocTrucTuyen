require("dotenv").config();

const { requireMongoUri } = require("../config/mongoUri");
const mongoose = require("mongoose");
const roleModel = require("../models/roles");
const userModel = require("../models/users");

async function main() {
  await mongoose.connect(requireMongoUri());
  console.log("MongoDB connected");

  const rolesToEnsure = [
    { name: "ADMIN", description: "Administrator" },
    { name: "USER", description: "Normal user" },
  ];

  for (const r of rolesToEnsure) {
    const exists = await roleModel.findOne({ name: r.name, isDeleted: false });
    if (!exists) {
      await roleModel.create({ name: r.name, description: r.description });
      console.log("Created role:", r.name);
    } else {
      console.log("Role exists:", r.name);
    }
  }

  if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD && process.env.ADMIN_EMAIL) {
    const adminRole = await roleModel.findOne({ name: "ADMIN", isDeleted: false });
    if (!adminRole) throw new Error("Role ADMIN not found after seeding");

    const existsUser = await userModel.findOne({
      username: process.env.ADMIN_USERNAME,
      isDeleted: false,
    });

    if (!existsUser) {
      await userModel.create({
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
        email: process.env.ADMIN_EMAIL,
        role: adminRole._id,
        fullName: "Admin",
      });
      console.log("Created ADMIN user:", process.env.ADMIN_USERNAME);
    } else {
      console.log("Admin user exists:", process.env.ADMIN_USERNAME);
    }
  }

  await mongoose.disconnect();
  console.log("Done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
