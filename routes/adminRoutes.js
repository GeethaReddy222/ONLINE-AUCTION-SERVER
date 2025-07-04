const express = require("express");
const bcrypt = require("bcrypt");
const Admin = require("../models/Admin");
const Product = require("../models/Product");
const router = express.Router();
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");
const verifyToken = require("../middleware/verifyToken");

// Admin registration
router.post("/register", async (req, res) => {
  const { email, name, password, contact } = req.body;
  try {
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res
        .status(400)
        .json({ message: "Admin with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({
      name,
      email,
      password: hashedPassword,
      contact,
    });

    await newAdmin.save();
    res.status(201).json({ success: true, message: "Admin registered successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "server error" });
  }
});


// Admin login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res
        .status(400)
        .json({ message: "Admin with this email does not exist." });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: admin._id, role: "admin" },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1h" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: admin._id,
        name: admin.name,
        role: "admin",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


//get profile
router.get("/profile", authMiddleware, async (req, res) => {
  if (req.userType !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }

  const admin = req.user;

  res.json({
    name: admin.name,
    email: admin.email,
    contact: admin.contact,
    role: admin.role,
  });
});


//update profile
router.put("/profile", verifyToken, async (req, res) => {
  try {
    const adminId = req.user.id; 

    const { name, email, contact } = req.body;

    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      { name, email, contact },
      { new: true }
    );

    if (!updatedAdmin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });
    }

    res.status(200).json(updatedAdmin);
  } catch (error) {
    console.error("Error updating admin profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


//Get all pending products
router.get("/pending-products", authMiddleware, async (req, res) => {
  try {
    const pendingProducts = await Product.find({ status: "pending" })
      .populate("seller", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json(pendingProducts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// router.patch("/products/:id/status", adminAuth, async (req, res) => {
//   const { action } = req.body;
//   const { id } = req.params;
//   try {
//     const updatedProduct = await Product.findByIdAndUpdate(
//       id,
//       {
//         status: action === 'approve' ? "approved" : "rejected",
//         approvedAt: action === "approve" ? new Date() : null,
//       },
//       { new: true }
//     );
//     res.status(200).json(updatedProduct);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// });


//Update the status(Approved or Rejected)
router.patch("/pending-approvals/:id", authMiddleware, async (req, res) => {
  const { action } = req.body;
  const { id } = req.params;
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        status: action === "approve" ? "approved" : "rejected",
        approvedAt: action === "approve" ? new Date() : null,
      },
      { new: true }
    );
    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});



//get sold products
router.get("/sold-products",async(req,res)=>{
  try{
    const soldProducts=await Product.find({status:'sold'})
        .populate("seller","name email")
        .populate('bids.bidder', 'name email');
    return res.status(200).json(soldProducts);

  }catch(error){
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});





// router.patch("/pending-approvals/:id", adminAuth, async (req, res) => {
//   const { action } = req.body;
//   const { id } = req.params;

//   try {
//     if (action === 'approve') {
//       const updatedProduct = await Product.findByIdAndUpdate(
//         id,
//         {
//           status: "approved",
//           approvedAt: new Date(),
//         },
//         { new: true }
//       );

//       return res.status(200).json(updatedProduct);
//     } else if (action === 'reject') {
//       const deletedProduct = await Product.findByIdAndDelete(id);

//       if (!deletedProduct) {
//         return res.status(404).json({ message: "Product not found" });
//       }

//       return res.status(200).json({ message: "Product rejected and deleted successfully" });
//     } else {
//       return res.status(400).json({ message: "Invalid action" });
//     }
//   } catch (error) {
//     console.error("Error in approval route:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

module.exports = router;
