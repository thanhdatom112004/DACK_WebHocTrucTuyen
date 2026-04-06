const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    fullName: {
      type: String,
      default: "",
    },
    avatarUrl: {
      type: String,
      default: "https://i.sstatic.net/l60Hf.png",
    },
    status: {
      type: Boolean,
      default: false,
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "role",
      required: true,
    },
    loginCount: {
      type: Number,
      default: 0,
      min: [0, "Login count cannot be negative"],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    forgotPasswordToken: {
      type: String,
    },
    forgotPasswordTokenExp: {
      type: Date,
    },
    passwordResetOtpHash: {
      type: String,
    },
    passwordResetOtpExp: {
      type: Date,
    },
    emailVerified: {
      type: Boolean,
    },
    emailVerifyOtpHash: {
      type: String,
    },
    emailVerifyOtpExp: {
      type: Date,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const genSalt = await bcrypt.genSalt(10);
  const newPass = await bcrypt.hash(this.password, genSalt);
  this.password = newPass;
});

module.exports = mongoose.model("user", userSchema);
