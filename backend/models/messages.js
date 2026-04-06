const mongoose = require("mongoose");

const messageContentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["text", "file"],
      required: true,
    },
    text: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    message: {
      type: messageContentSchema,
      required: true,
    },
    threadKey: {
      type: String,
      default: "",
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

messageSchema.index({ from: 1, to: 1, createdAt: -1 });

module.exports = mongoose.model("message", messageSchema);
