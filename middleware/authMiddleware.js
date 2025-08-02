// middleware/authenticateToken.js - Enhanced version of your existing middleware

import jwt from 'jsonwebtoken';
import { JWTService } from '../services/jwtService.js';
import { SessionService } from '../services/sessionService.js';
import { userModel } from '../models/userModel.js';

/**
 * Enhanced middleware to verify JWT access tokens on protected routes
 * Now supports session fallback when JWT expires
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    // Get session ID from cookies
    const sessionId = req.cookies?.session_id;

    console.log('🔍 Auth attempt:', { 
      hasToken: !!token, 
      hasSession: !!sessionId 
    });

    // STRATEGY 1: Try JWT Authentication First
    if (token) {
      // Try new JWT service first
      let decoded = JWTService.verifyAccessToken(token);

      // Fallback to old verification method for backward compatibility
      if (!decoded) {
        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET);
          console.log('🔄 Using legacy token verification');
        } catch (legacyError) {
          console.log('🔴 Both JWT methods failed, trying session fallback...');
          // Don't return error yet, try session fallback
        }
      }

      // If JWT is valid, proceed normally
      if (decoded) {
        // Optional: Verify user still exists and is active
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

        console.log('✅ JWT authentication successful for:', decoded.userId);
        return next();
      }
    }

    // STRATEGY 2: JWT Failed or Missing - Try Session Fallback
    if (sessionId) {
      console.log('🔄 Attempting session fallback for session:', sessionId);
      
      const session = await SessionService.findValidSession(sessionId);
      
      if (session && session.userId) {
        console.log('✅ Valid session found, generating new JWT...');
        
        // Generate new JWT using session data
        const newTokenPayload = {
          userId: session.userId._id,
          email: session.userId.email,
          role: session.userId.role,
          sessionId: session.sessionId,
        };
        
        const newAccessToken = JWTService.generateAccessToken(newTokenPayload);
        
        // Refresh the session (sliding window)
        await SessionService.refreshSession(sessionId);
        
        // Set user data for the request
        req.user = {
          userId: session.userId._id,
          email: session.userId.email,
          role: session.userId.role,
          isVerified: session.userId.isVerified,
          profile: session.userId.profile,
        };
        
        req.sessionId = sessionId;
        req.newToken = newAccessToken; // Flag that we generated a new token
        
        // Send the new token in response headers for frontend to catch
        res.setHeader('X-New-Access-Token', newAccessToken);
        res.setHeader('X-Token-Refreshed', 'true');
        res.setHeader('X-Token-Expiration', JWTService.getTokenExpiration(newAccessToken));
        res.setHeader('X-Auth-Method', 'session-renewal'); // ✅ ADDED: Track auth method
        
        console.log('🔄 New JWT generated via session for user:', session.userId.email);
        
        return next();
      } else {
        console.log('🔴 Session invalid or expired');
      }
    }

    // STRATEGY 3: Both JWT and Session Failed
    if (!authHeader && !sessionId) {
      return res.status(401).json({
        success: false,
        message: 'Authorization header or session required',
        code: 'AUTH_REQUIRED',
      });
    }

    // Either token was provided but invalid, or session was invalid
    console.log('❌ Authentication failed - no valid JWT or session');
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication. Please login again.',
      code: 'AUTH_INVALID',
    });

  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication service error',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Middleware specifically for session-only authentication (e.g., refresh token endpoint)
 * This is your existing extractSessionId but enhanced
 */
const sessionOnlyAuth = async (req, res, next) => {
  try {
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

    // Validate the session
    const session = await SessionService.findValidSession(sessionId);
    
    if (!session || !session.userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session',
        code: 'SESSION_INVALID',
      });
    }

    req.sessionId = sessionId;
    req.session = session;
    req.user = { 
      userId: session.userId._id,
      email: session.userId.email,
      role: session.userId.role,
    };
    
    console.log('✅ Session-only auth successful for:', session.userId.email);
    next();
  } catch (error) {
    console.error('❌ Session auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Session validation error',
      code: 'SESSION_ERROR',
    });
  }
};

/**
 * Your original extractSessionId function - kept for backward compatibility
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

export { authenticateToken, sessionOnlyAuth, extractSessionId };