const mongoose = require("mongoose");
const categoryModel = require("../models/categories");

/**
 * Một lần khi khởi động: chuyển course.category (string tên / id cũ) → ObjectId ref.
 * Dùng collection thô để tránh lỗi cast Mongoose trước khi migrate.
 */
module.exports = async function migrateCourseCategories() {
  const db = mongoose.connection.db;
  if (!db) return;

  const coll = db.collection("courses");
  const all = await coll.find({}).toArray();

  function asObjectId(val) {
    if (val == null) return null;
    if (val instanceof mongoose.Types.ObjectId) return val;
    const s = String(val);
    if (/^[a-fA-F0-9]{24}$/.test(s)) {
      try {
        return new mongoose.Types.ObjectId(s);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  for (const doc of all) {
    const val = doc.category;
    if (val === undefined || val === null || val === "") {
      continue;
    }

    const oid = asObjectId(val);
    if (oid) {
      const exists = await categoryModel.findOne({ _id: oid, isDeleted: false }).lean();
      if (exists) {
        await coll.updateOne({ _id: doc._id }, { $set: { category: oid } });
      } else {
        await coll.updateOne({ _id: doc._id }, { $set: { category: null } });
      }
      continue;
    }

    const name = String(val).trim();
    const found = await categoryModel.findOne({ name, isDeleted: false }).lean();
    if (found) {
      await coll.updateOne({ _id: doc._id }, { $set: { category: found._id } });
    } else {
      await coll.updateOne({ _id: doc._id }, { $set: { category: null } });
    }
  }
};
