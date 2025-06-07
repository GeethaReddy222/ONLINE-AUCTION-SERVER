// routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const User = require("../models/User");

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  let UserModel;
  switch (role) {
    case "admin":
      UserModel = Admin;
      break;
    case "customer":
      UserModel = User;
      break;
    default:
      return res.status(400).json({ message: "Invalid role" });
  }

  try {
    const user = await UserModel.findOne({ email });
    if (!user) return res.status(404).json({ message: `${role} not found` });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Incorrect password" });

    const token = jwt.sign(
      { id: user._id, role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      token,
      message: `${role} login successful`,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role,
        contact: user.contact 
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;