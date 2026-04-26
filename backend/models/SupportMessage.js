const mongoose = require("mongoose");

const supportMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // your user model
      required: false, // optional (guest bhi message bhej sake)
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "resolved"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SupportMessage", supportMessageSchema);