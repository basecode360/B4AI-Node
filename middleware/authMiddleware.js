// ============ BACKEND MIDDLEWARE UPDATE ============

import jwt from 'jsonwebtoken';
import { JWTService } from '../services/jwtService.js';
import { userModel } from '../models/userModel.js';

/**
 * Enhanced middleware to verify JWT access tokens on protected routes
 * Now supports the new dual-token architecture
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Authorization header required',
        code: 'TOKEN_REQUIRED',
      });
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'TOKEN_REQUIRED',
      });
    }

    // Try new JWT service first, fallback to old method for backward compatibility
    let decoded = JWTService.verifyAccessToken(token);

    // Fallback to old verification method if new service fails
    if (!decoded) {
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('🔄 Using legacy token verification');
      } catch (legacyError) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired access token',
          code: 'TOKEN_INVALID',
        });
      }
    }

    // Optional: Verify user still exists and is active (for enhanced security)
    if (process.env.VERIFY_USER_ON_REQUEST === 'true') {
      const user = await userModel.findById(decoded.userId).select('-password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      req.user = {
        userId: user._id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        profile: user.profile,
      };
    } else {
      // Use token data directly for better performance
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * NEW: Middleware to extract session ID from cookies or request body
 * Used for refresh token endpoints
 */
const extractSessionId = (req, res, next) => {
  // Try to get session ID from cookie (web clients)
  let sessionId = req.cookies?.session_id;

  // If not in cookies, try request body (mobile clients)
  if (!sessionId && req.body?.sessionId) {
    sessionId = req.body.sessionId;
  }

  if (!sessionId) {
    return res.status(401).json({
      success: false,
      message: 'Session ID required',
      code: 'SESSION_REQUIRED',
    });
  }

  req.sessionId = sessionId;
  next();
};

export { authenticateToken, extractSessionId };
