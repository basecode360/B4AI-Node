// ============ BACKEND MIDDLEWARE UPDATE ============

import jwt from "jsonwebtoken";

// Auth middleware to verify JWT token from Authorization header
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    console.log("Authorization header:", authHeader);

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header required",
      });
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    console.log("Token from header:", token);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    console.log("Decoded token:", decoded);

    // Attach user to request object
    req.user = {
      userId: decoded.userId,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }
    
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export { authenticateToken };