const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === "admin") {
      const admin = await Admin.findById(decoded.id);
      if (!admin) return res.status(401).json({ message: "Admin not found" });
      req.user = admin;
      req.userType = "admin"; // ✅ Add this line
    } else if (decoded.role === "customer") {
      const user = await User.findById(decoded.id);
      if (!user) return res.status(401).json({ message: "User not found" });
      req.user = user;
      req.userType = "customer"; // ✅ Add this line
    } else {
      return res.status(403).json({ message: "Invalid role in token" });
    }

    next();
  } catch (error) {
    console.error("Auth error:", error.message);
    return res.status(400).json({ message: "Token invalid or expired" });
  }
};

module.exports = authMiddleware;
