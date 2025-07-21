import jwt from 'jsonwebtoken';

class JWTService {
  /**
   * Generate a short-lived access token
   */
  static generateAccessToken(payload) {
    const secret = process.env.ACCESS_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      throw new Error(
        'ACCESS_SECRET or JWT_SECRET environment variable is required'
      );
    }

    return jwt.sign(
      {
        ...payload,
        tokenType: 'access',
      },
      secret,
      {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
        issuer: 'boardbullets-auth',
        audience: 'boardbullets-api',
      }
    );
  }

  /**
   * Verify and decode an access token
   */
  static verifyAccessToken(token) {
    try {
      const secret = process.env.ACCESS_SECRET || process.env.JWT_SECRET;
      if (!secret) {
        throw new Error(
          'ACCESS_SECRET or JWT_SECRET environment variable is required'
        );
      }

      const decoded = jwt.verify(token, secret, {
        issuer: 'boardbullets-auth',
        audience: 'boardbullets-api',
      });

      // Ensure it's an access token (if tokenType is present)
      if (decoded.tokenType && decoded.tokenType !== 'access') {
        console.log('🔴 Invalid token type:', decoded.tokenType);
        return null;
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        console.log('🔴 JWT expired:', error.message);
      } else if (error.name === 'JsonWebTokenError') {
        console.log('🔴 JWT invalid:', error.message);
      } else {
        console.log('🔴 JWT verification failed:', error.message);
      }
      return null;
    }
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(token) {
    try {
      const decoded = jwt.decode(token);
      return decoded?.exp ? decoded.exp * 1000 : null; // Convert to milliseconds
    } catch (error) {
      return null;
    }
  }
}

export { JWTService };
