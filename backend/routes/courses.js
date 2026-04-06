const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const courseModel = require("../models/courses");
const categoryModel = require("../models/categories");
const inventoryModel = require("../models/inventories");
const { checkLogin, checkRole } = require("../middleware/authHandler");
const { convertTitleToSlug } = require("../utils/titleHandler");
const { normalizeCourseImageInput } = require("../utils/courseImageUrl");
const { uploadCourseImage, getCourseUploadRelativeUrl } = require("../utils/uploadHandler");

const POPULATE_CATEGORY = { path: "category", select: "name image" };

async function resolveCategoryId(raw) {
  if (raw === undefined || raw === null || raw === "") return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (!mongoose.Types.ObjectId.isValid(s) || String(s).length !== 24) {
    throw new Error("category phải là ID danh mục (24 ký tự hex). Chọn danh mục từ admin.");
  }
  const cat = await categoryModel.findOne({ _id: s, isDeleted: false });
  if (!cat) {
    throw new Error("Danh mục không tồn tại hoặc đã bị xóa.");
  }
  return cat._id;
}

const MAX_PRICE_VND = 999999999999;

function normalizePriceVnd(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new Error("Giá phải là số hợp lệ (VND).");
  }
  const r = Math.round(n);
  if (r < 0) throw new Error("Giá không được âm.");
  if (r > MAX_PRICE_VND) throw new Error("Giá vượt quá giới hạn cho phép (VND).");
  return r;
}

router.get("/", async function (req, res, next) {
  try {
    const courses = await courseModel.find({ isDeleted: false }).populate(POPULATE_CATEGORY).lean();
    res.send(courses);
  } catch (e) {
    res.status(400).send({ message: String(e.message || e) });
  }
});

router.post(
  "/upload-image",
  checkLogin,
  checkRole("ADMIN"),
  uploadCourseImage.single("file"),
  async function (req, res) {
    try {
      if (!req.file) {
        return res.status(400).send({ message: "Vui lòng chọn file ảnh." });
      }
      res.send({
        ok: true,
        imageUrl: getCourseUploadRelativeUrl(req.file.filename),
      });
    } catch (e) {
      res.status(400).send({ message: String(e.message || e) });
    }
  }
);

router.get("/:id", async function (req, res, next) {
  try {
    const result = await courseModel
      .findOne({ _id: req.params.id, isDeleted: false })
      .populate(POPULATE_CATEGORY)
      .lean();
    if (!result) return res.status(404).send({ message: "id not found" });
    res.send(result);
  } catch (error) {
    res.status(404).send({ message: "id not found" });
  }
});

router.post("/", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { title, price: rawPrice = 0, description = "", category: rawCategory, images, videos = [] } =
      req.body;
    if (!title || !String(title).trim()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).send({ message: "Tiêu đề khóa học là bắt buộc." });
    }
    let price;
    try {
      price = normalizePriceVnd(rawPrice);
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).send({ message: String(e.message || e) });
    }

    let categoryId;
    try {
      categoryId = await resolveCategoryId(rawCategory);
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).send({ message: String(e.message || e) });
    }

    let imagesNorm;
    try {
      imagesNorm = normalizeCourseImageInput(images);
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).send({ message: String(e.message || e) });
    }

    const videosNormalized = Array.isArray(videos)
      ? videos
          .map(function (v) {
            const o = {
              title: (v && v.title ? String(v.title) : "").trim() || "Bài học",
              url: (v && v.url ? String(v.url) : "").trim(),
            };
            if (v && v._id && mongoose.Types.ObjectId.isValid(String(v._id))) {
              o._id = v._id;
            }
            return o;
          })
          .filter(function (v) {
            return v.url.length > 0;
          })
      : [];

    const course = await courseModel.create(
      [
        {
          title,
          slug: convertTitleToSlug(title),
          price,
          description,
          category: categoryId,
          images: imagesNorm,
          videos: videosNormalized,
        },
      ],
      { session }
    );

    const createdCourse = course[0];

    const newInventory = await inventoryModel.create(
      [
        {
          course: createdCourse._id,
          stock: 1,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    const populated = await courseModel.findById(createdCourse._id).populate(POPULATE_CATEGORY).lean();
    res.send({ course: populated, inventory: newInventory[0] });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).send({ message: String(error.message || error) });
  }
});

router.put("/:id", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    const existing = await courseModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!existing) return res.status(404).send({ message: "id not found" });

    const { title, price, description, category: rawCategory, images, videos } = req.body;
    const $set = {};

    if (title !== undefined) {
      $set.title = title;
      $set.slug = convertTitleToSlug(String(title));
    }
    if (price !== undefined) {
      try {
        $set.price = normalizePriceVnd(price);
      } catch (e) {
        return res.status(400).send({ message: String(e.message || e) });
      }
    }
    if (description !== undefined) $set.description = description;
    if (rawCategory !== undefined) {
      try {
        if (rawCategory === "" || rawCategory === null) {
          $set.category = null;
        } else {
          $set.category = await resolveCategoryId(rawCategory);
        }
      } catch (e) {
        return res.status(400).send({ message: String(e.message || e) });
      }
    }
    if (images !== undefined) {
      try {
        $set.images = normalizeCourseImageInput(images);
      } catch (e) {
        return res.status(400).send({ message: String(e.message || e) });
      }
    }

    if (Array.isArray(videos)) {
      $set.videos = videos
        .map(function (v) {
          const o = {
            title: (v && v.title ? String(v.title) : "").trim() || "Bài học",
            url: (v && v.url ? String(v.url) : "").trim(),
          };
          if (v && v._id && mongoose.Types.ObjectId.isValid(String(v._id))) {
            o._id = v._id;
          }
          return o;
        })
        .filter(function (v) {
          return v.url.length > 0;
        });
    }

    const doc = await courseModel.findByIdAndUpdate(req.params.id, { $set }, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).send({ message: "id not found" });
    const updated = await courseModel.findById(doc._id).populate(POPULATE_CATEGORY).lean();
    res.send(updated);
  } catch (e) {
    res.status(400).send({ message: String(e.message || e) });
  }
});

router.delete("/:id", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  try {
    const updated = await courseModel.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );
    if (!updated) return res.status(404).send({ message: "id not found" });
    res.send(updated);
  } catch (e) {
    res.status(400).send({ message: String(e.message || e) });
  }
});

module.exports = router;
