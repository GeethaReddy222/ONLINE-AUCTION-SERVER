const jwt=require('jsonwebtoken');
const verifyToken = (req, res, next) => {
  // Check for Authorization header
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ 
      success: false,
      message: 'Authorization header missing' 
    });
  }

  // Extract token (handle both "Bearer token" and just "token")
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : authHeader;

  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Token not found in header' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ 
      success: false,
      message: 'Invalid or expired token',
      error: err.message 
    });
  }
};

module.exports = verifyToken;