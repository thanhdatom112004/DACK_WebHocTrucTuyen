const multer = require("multer");
const path = require("path");
const fs = require("fs");

const chatUploadRoot = path.join(__dirname, "..", "uploads", "chat");
const courseUploadRoot = path.join(__dirname, "..", "uploads", "courses");
if (!fs.existsSync(chatUploadRoot)) {
  fs.mkdirSync(chatUploadRoot, { recursive: true });
}
if (!fs.existsSync(courseUploadRoot)) {
  fs.mkdirSync(courseUploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, chatUploadRoot);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || ".bin";
    const fileName = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, fileName);
  },
});

const courseImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, courseUploadRoot);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || ".bin";
    const fileName = "course-" + Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, fileName);
  },
});

function imageFileFilter(req, file, cb) {
  if (file.mimetype && file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new Error("Chi chap nhan file anh"));
  }
}

module.exports = {
  uploadChatImage: multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter,
  }),
  uploadCourseImage: multer({
    storage: courseImageStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter,
  }),
  getChatUploadRelativeUrl(filename) {
    if (!filename) return "";
    return "/uploads/chat/" + filename;
  },
  getCourseUploadRelativeUrl(filename) {
    if (!filename) return "";
    return "/uploads/courses/" + filename;
  },
};
