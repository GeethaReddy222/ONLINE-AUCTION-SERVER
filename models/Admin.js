const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Admin name is required"],
  },

  email: {
    type: String,
    required: [true, "Admin email is required"],
    unique: true,
    lowercase: true,
    match: /^\S+@\S+\.\S+$/,
  },

  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: 6,
  },

  contact: {
    type: String,
    required: true,
    match: /^[6-9]\d{9}$/, // Indian mobile number validation
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Admin", adminSchema);
