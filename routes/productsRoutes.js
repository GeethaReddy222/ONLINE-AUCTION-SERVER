const express = require("express");
const Product = require("../models/Product");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const mongoose = require("mongoose");

router.post("/add-product", authMiddleware, async (req, res) => {
  const {
    title,
    description,
    category,
    startingPrice,
    startTime,
    endTime,
    images
  } = req.body;

  try {
    // Validate required fields
    if (!title || !description || !category || !startingPrice || !startTime || !endTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate category
    const validCategories = ['books', 'electronics', 'jewelry', 'vehicles', 'other', 
                            'home', 'fitness', 'clothing', 'food', 'accessories'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    // Validate dates
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    const currentDate = new Date();

    if (startDate >= endDate) {
      return res.status(400).json({ message: "End time must be after start time" });
    }
    if (startDate <= currentDate) {
      return res.status(400).json({ message: "Start time must be in the future" });
    }

    // Create new product
    const newProduct = new Product({
      title,
      description,
      category,
      startingPrice,
      currentPrice: startingPrice,
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

// Update approved products to active
router.patch('/update-active', async (req, res) => {
  try {
    const now = new Date();
    const updatedProducts = await Product.updateMany(
      {
        status: 'approved',
        startTime: { $lte: now },
        endTime: { $gt: now }
      },
      {
        $set: { status: 'active' }
      }
    );

    res.status(200).json({ message: 'Products updated', result: updatedProducts });
  } catch (error) {
    console.error('Error updating active products:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get all active products
router.get('/active-products', async (req, res) => {
  try {
    const activeProducts = await Product.find({ status: 'active' });

    if (!activeProducts.length) {
      return res.status(400).json({ message: 'No active products found' });
    }

    res.status(200).json(activeProducts);
  } catch (error) {
    console.error('Error fetching active products:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});


//get all bids placed by the logged in user
router.get("/bids", authMiddleware, async (req, res) => {
  const userId = req.user._id;

  try {
    // Find products where the user has placed a bid
    const products = await Product.find({ "bids.bidder": userId })
      .populate("seller", "name email")
      .lean(); // lean for better performance

    const userBids = [];

    for (const product of products) {
      const userBid = product.bids.find(
        (bid) => bid.bidder.toString() === userId.toString()
      );

      if (userBid) {
        userBids.push({
          productId: product._id,
          productTitle: product.title,
          productImage: product.images?.[0]?.url || null,
          category: product.category,
          status: product.status,
          startingPrice:product.startingPrice,
          currentPrice: product.currentPrice,
          startTime: product.startTime,
          endTime: product.endTime,
          seller: product.seller?.name || "Unknown",
          bidAmount: userBid.amount,
          bidTime: userBid.time,
        });
      }
    }

    if (userBids.length === 0) {
      return res
        .status(404)
        .json({ message: "You haven’t placed any bids yet." });
    }

    res.status(200).json(userBids);
  } catch (error) {
    console.error("Error fetching user bids:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// Get a specific product by ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(id)
      .populate("seller", "name")
      .populate("winner", "name")
      .populate({
        path: "bids.bidder",
        select: "name"
      });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if auction has ended and update status
    const now = new Date();
    if (product.status === 'active' && now > product.endTime) {
      if (product.bids.length > 0) {
        // Sort bids to find highest bidder
        product.bids.sort((a, b) => b.amount - a.amount);
        product.winner = product.bids[0].bidder;
        product.status = 'sold';
      } else {
        product.status = 'unsold';
      }
      await product.save();
      
      // Repopulate winner if needed
      if (product.status === 'sold') {
        await product.populate('winner', 'name');
      }
    }

    return res.status(200).json({ 
      product, 
      bids: product.bids 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});


// Place a bid on a product
router.post("/:id/bid", authMiddleware, async (req, res) => {
  const { amount } = req.body;
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if auction is active
    if (product.status !== 'active') {
      return res.status(400).json({ message: "Auction is not active" });
    }

    // Check if user is seller
    if (product.seller.equals(req.user._id)) {
      return res.status(403).json({ message: "Sellers cannot bid on their own products" });
    }

    // Check if bid is valid
    if (amount <= (product.currentPrice || product.startingPrice)) {
      return res.status(400).json({ 
        message: `Bid must be higher than current price of $${product.currentPrice || product.startingPrice}` 
      });
    }

    // Add new bid
    product.bids.push({ 
      amount, 
      bidder: req.user._id,
      time: new Date()  
    });
    product.currentPrice = amount;
    
    await product.save();

    return res.status(201).json({ 
      success: true, 
      message: "Bid placed successfully", 
      product 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});



// Mark product as sold
router.patch("/:id/mark-sold", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if auction has ended
    const now = new Date();
    if (now < product.endTime) {
      return res.status(400).json({ message: "Auction has not ended yet" });
    }

    // Update status and set winner
    if (product.bids.length > 0) {
      // Sort bids to find highest bidder
      product.bids.sort((a, b) => b.amount - a.amount);
      product.winner = product.bids[0].bidder;
      product.status = 'sold';
    } else {
      product.status = 'unsold';
    }

    await product.save();

    return res.status(200).json({ 
      success: true, 
      message: "Product status updated", 
      product 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});


module.exports = router;
