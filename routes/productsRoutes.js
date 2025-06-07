const express = require("express");
const Product = require("../models/Product");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const mongoose = require("mongoose");


//Add a product
router.post("/add-product", authMiddleware, async (req, res) => {
  const {
    title,
    description,
    category,
    startingPrice,
    quantity,
    startTime,
    endTime,
    images,
    status,
    quanity = 1,
  } = req.body;

  try {
    
    if (!title ||!description ||!category ||!startingPrice ||!startTime ||!endTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    const currentDate = new Date();

    if (startDate >= endDate) {
      return res
        .status(400)
        .json({ message: "End time must be after start time" });
    }
    if (startDate <= currentDate) {
      return res
        .status(400)
        .json({ message: "Start time must be after current time" });
    }

    const newProduct = new Product({
      title,
      description,
      category,
      startingPrice,
      currentPrice: startingPrice,
      quantity: quantity || 1, // Default to 1
      startTime: startDate,
      endTime: endDate,
      images,
      seller: req.user._id,
      status: "pending",
    });

    await newProduct.save();
    return res.status(201).json(newProduct);
  } catch (error) {
    console.error("Add product error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


//Get all products
router.get("/all", async (req, res) => {
  try {
    const products = await Product.find({ status: "approved" });
    if (products.length === 0) {
      return res.status(400).json({ message: "No products" });
    }
    return res.status(200).json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});


//Get the auction products by category
router.get("/category", async (req, res) => {
  const { category } = req.query;
  const validCategories = [
    "books",
    "electronics",
    "jewelry",
    "vehicles",
    "other",
  ];
  const isValidCategory = validCategories.includes(category);
  try {
    if (!isValidCategory) {
      return res.status(400).json({ message: "Invalid Product Category" });
    }
    const products = await Product.find({ category, status: "approved" });
    if (products.length === 0) {
      return res.status(404).json({ message: "No products in this category" });
    }
    return res.status(200).json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});


//Get a specific product by product id
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  let isValid = mongoose.Types.ObjectId.isValid(id);
  try {
    if (!isValid) {
      return res.status(400).json({ message: "Invalid product ID" });
    }
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    return res.status(200).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});


//Get all auction products of a seller by seller id
router.get("/seller/:sellerId", async (req, res) => {
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


//bid a product
router.post("/bid/:id", authMiddleware, async (req, res) => {
  const { amount, quantity } = req.body;
  const { id } = req.params;
  try {
    const isValid = mongoose.Types.ObjectId.isValid(id);
    if (!isValid) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.seller.equals(req.user._id)) {
      return res
        .status(403)
        .json({ message: "Sellers cannot bid on their own products" });
    }

    if (product.quantity < quantity) {
      return res
        .status(400)
        .json({ message: "Requested quantity not available" });
    }

    if (amount <= product.currentPrice) {
      return res
        .status(400)
        .json({ message: `Bid must be higher than ${product.currentPrice}` });
    }

    // Deduct the quantity
    product.quantity -= quantity;

    // If no quantity left, mark as sold
    if (product.quantity === 0) {
      product.status = "sold";
    }
    product.bids.push({ amount: amount, bidder: req.user._id });
    product.currentPrice = amount;
    await product.save();
    return res
      .status(201)
      .json({ success: true, message: "Bid placed successfully", product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});


module.exports = router;
