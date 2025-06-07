const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const User = require("../models/User"); 

const authMiddleware = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === "admin") {
      const admin = await Admin.findById(decoded.id);
      if (!admin) {
        return res.status(401).json({ message: "Admin not found" });
      }
      req.user = admin;
      req.userType = "admin";
    } else if (decoded.role === "customer") {
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      req.user = user;
      req.userType = "customer";
    } else {
      return res.status(403).json({ message: "Invalid role in token" });
    }

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(403).json({ message: "Authentication failed", error: err.message });
  }
};

module.exports = authMiddleware;
