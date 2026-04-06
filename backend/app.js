const path = require("path");
const fs = require("fs");
const express = require("express");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const createError = require("http-errors");
const mongoose = require("mongoose");

require("dotenv").config();
const { requireMongoUri } = require("./config/mongoUri");

const app = express();

app.use(morgan("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));
app.use(cookieParser());

const mongoUri = requireMongoUri();

mongoose
  .connect(mongoUri)
  .then(async () => {
    console.log("MongoDB connected");
    try {
      await require("./utils/migrateCourseCategories")();
      console.log("Course category migration OK");
    } catch (err) {
      console.error("migrateCourseCategories:", err);
    }
  })
  .catch((err) => {
    console.error("MongoDB connect failed:", err);
    process.exit(1);
  });

app.use("/api/auth", require("./routes/auth"));

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use(express.static(path.join(__dirname, "..", "OnlineLearningWeb")));

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.status(err.status || 500).send({
    message: err.message,
  });
});

module.exports = app;
