const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Product=require("../models/Product");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const verifyToken = require("../middleware/verifyToken");

//Customer Registration
router.post("/register", async (req, res) => {
  const { name, email, password, contact, address } = req.body;

  try {
    // Validate required fields
    if (!name || !email || !password || !contact || !address) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      contact,
      address,
    });

    await newUser.save();
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      message: "Server error during registration",
      error: error.message,
    });
  }
});

//Customer login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate required fields
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user._id, role: "customer" },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1h" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: "customer",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Server error during login",
      error: error.message,
    });
  }
});


//Get Customer Profile
router.get("/profile",authMiddleware, async (req, res) => {
  if (req.userType !== "customer") {
    return res.status(403).json({ message: "Customer access required" });
  }
  const customer = req.user;
  res.json({
    name: customer.name,
    email: customer.email,
    contact: customer.contact,
    role: customer.role,
    address:customer.address
  });
});


//update profile
router.put("/profile", verifyToken, async (req, res) => {
  try {
    const customerId = req.user.id; 

    const { name, email, contact,address } = req.body;

    const updatedCustomer = await User.findByIdAndUpdate(
      customerId,
      { name, email, contact,address },
      { new: true }
    );

    if (!updatedCustomer) {
      return res
        .status(404)
        .json({ success: false, message: "Customernot found" });
    }

    res.status(200).json(updatedCustomer);
  } catch (error) {
    console.error("Error updating admin profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



//Get all active products excluding those created by the current user
router.get('/browse-products',authMiddleware, async (req, res) => {
  try {
    // Validate user authentication
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const activeProducts = await Product.find({
      status: 'active', 
    });

    res.status(200).json(activeProducts);
  } catch (error) {
    console.error('Error fetching active products:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});



//Get all auction products of a seller by seller id
router.get("/my-products/:sellerId",authMiddleware, async (req, res) => {
  const { sellerId } = req.params;
  let isValid = mongoose.Types.ObjectId.isValid(sellerId);
  try {
    if (!isValid) {
      return res.status(400).json({ message: "Invalid seller ID" });
    }
    const sellerProducts = await Product.find({ seller: sellerId }).sort({
      createdAt: -1,
    });
    return res.status(200).json(sellerProducts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});





module.exports = router;
