import { v4 as uuidv4 } from 'uuid';
import { Session } from '../models/sessionModel.js';
import bcrypt from 'bcryptjs';

class SessionService {
  /**
   * Create a new session for a user
   * Now supports storing encrypted credentials for auto-renewal
   */
  static async createSession(userId, userAgent = '', ipAddress = '', options = {}) {
    const sessionTTLDays = parseInt(process.env.SESSION_TTL_DAYS || '7');
    const expireAt = new Date(
      Date.now() + sessionTTLDays * 24 * 60 * 60 * 1000
    );

    try {
      // Try to find an active session for this user and device
      let session = await Session.findOne({
        userId,
        userAgent,
        ipAddress,
        expireAt: { $gt: new Date() },
      });

      if (session) {
        // If found, update expiry and return
        session.expireAt = expireAt;
        session.lastAccessed = new Date();
        
        // Update credentials if provided
        if (options.userCredentials && options.storeCredentials) {
          session.setEncryptedCredentials(options.userCredentials);
        }
        
        await session.save();
        console.log(
          `🔄 Reusing active session for user ${userId}: ${session.sessionId} (new expiry: ${expireAt})`
        );
        return session;
      }

      // Otherwise, create a new session
      const sessionId = uuidv4();
      session = new Session({
        sessionId,
        userId,
        expireAt,
        userAgent,
        ipAddress,
        deviceInfo: SessionService.parseUserAgent(userAgent),
        authMethod: options.authMethod || 'password',
        autoRenewEnabled: options.autoRenewEnabled !== false,
      });

      // Store encrypted credentials if provided
      if (options.userCredentials && options.storeCredentials) {
        session.setEncryptedCredentials(options.userCredentials);
      }

      await session.save();

      console.log(
        `📝 Session created for user ${userId}: ${sessionId} (expires: ${expireAt})`
      );
      return session;
    } catch (error) {
      console.error('❌ Session creation failed:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Find and validate a session
   */
  static async findValidSession(sessionId) {
    try {
      const session = await Session.findOne({
        sessionId,
        expireAt: { $gt: new Date() }, // Only non-expired sessions
      }).populate('userId', '-password');

      return session;
    } catch (error) {
      console.error('❌ Session lookup failed:', error);
      return null;
    }
  }

  /**
   * Enhanced refresh session with auto-authentication capability
   */
  static async refreshSession(sessionId, options = {}) {
    const sessionTTLDays = parseInt(process.env.SESSION_TTL_DAYS || '7');
    const newExpireAt = new Date(
      Date.now() + sessionTTLDays * 24 * 60 * 60 * 1000
    );

    try {
      const session = await Session.findOneAndUpdate(
        {
          sessionId,
          expireAt: { $gt: new Date() }, // Only update if not expired
        },
        {
          expireAt: newExpireAt,
          lastAccessed: new Date(),
        },
        { new: true }
      ).populate('userId', '-password');

      if (session) {
        console.log(
          `🔄 Session refreshed: ${sessionId} (new expiry: ${newExpireAt})`
        );
      }

      return session;
    } catch (error) {
      console.error('❌ Session refresh failed:', error);
      return null;
    }
  }

  /**
   * NEW: Attempt auto-authentication using stored credentials
   */
  static async attemptAutoAuth(sessionId) {
    try {
      const session = await Session.findOne({
        sessionId,
        autoRenewEnabled: true,
        expireAt: { $gt: new Date() },
      }).populate('userId', '-password');

      if (!session || !session.encryptedCredentials) {
        console.log('🔴 No auto-auth data available for session:', sessionId);
        return null;
      }

      // Decrypt stored credentials
      const credentials = session.getDecryptedCredentials();
      if (!credentials || !credentials.email || !credentials.hashedPassword) {
        console.log('🔴 Invalid credentials in session:', sessionId);
        return null;
      }

      // Verify user still exists and is active
      const user = session.userId;
      if (!user || !user.isVerified) {
        console.log('🔴 User not found or not verified for auto-auth');
        return null;
      }

      // Verify the stored password hash matches current user password
      if (user.password !== credentials.hashedPassword) {
        console.log('🔴 Stored password hash mismatch - password was changed');
        // Clear invalid credentials
        session.encryptedCredentials = null;
        await session.save();
        return null;
      }

      console.log('✅ Auto-authentication successful for user:', user.email);
      
      // Refresh session
      await SessionService.refreshSession(sessionId);
      
      return {
        user,
        session,
        method: 'auto-auth'
      };
    } catch (error) {
      console.error('❌ Auto-authentication failed:', error);
      return null;
    }
  }

  /**
   * Delete a specific session
   */
  static async deleteSession(sessionId) {
    try {
      const result = await Session.deleteOne({ sessionId });

      if (result.deletedCount > 0) {
        console.log(`🗑️ Session deleted: ${sessionId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Session deletion failed:', error);
      return false;
    }
  }

  /**
   * Revoke all sessions for a user (force logout from all devices)
   */
  static async revokeAllUserSessions(userId) {
    try {
      const result = await Session.deleteMany({ userId });
      console.log(
        `🚫 Revoked ${result.deletedCount} sessions for user ${userId}`
      );
      return result.deletedCount;
    } catch (error) {
      console.error('❌ Session revocation failed:', error);
      return 0;
    }
  }

  /**
   * Get all active sessions for a user
   */
  static async getUserSessions(userId) {
    try {
      return await Session.find({
        userId,
        expireAt: { $gt: new Date() },
      }).sort({ lastAccessed: -1 });
    } catch (error) {
      console.error('❌ Get user sessions failed:', error);
      return [];
    }
  }

  /**
   * Parse user agent string for device info
   */
  static parseUserAgent(userAgent) {
    if (!userAgent) return {};

    let platform = 'Unknown';
    let browser = 'Unknown';
    let os = 'Unknown';

    if (/android/i.test(userAgent)) {
      os = 'Android';
    } else if (/iphone|ipad|ipod/i.test(userAgent)) {
      os = 'iOS';
    } else if (/windows/i.test(userAgent)) {
      os = 'Windows';
    } else if (/mac os/i.test(userAgent)) {
      os = 'macOS';
    } else if (/linux/i.test(userAgent)) {
      os = 'Linux';
    }

    // Improved platform detection for mobile apps (Expo, React Native, etc.)
    if (userAgent.includes('Mobile')) {
      platform = 'Mobile';
    } else if (userAgent.includes('Tablet')) {
      platform = 'Tablet';
    } else if (os === 'Android' || os === 'iOS') {
      // If OS is Android/iOS but no Mobile/Tablet keyword, assume Mobile
      platform = 'Mobile';
    } else if (
      userAgent.toLowerCase().includes('okhttp') ||
      userAgent.toLowerCase().includes('expo')
    ) {
      // If userAgent contains okhttp or expo, assume Mobile
      platform = 'Mobile';
    } else {
      platform = 'Desktop';
    }

    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (os === 'Android' || os === 'iOS') {
      // If mobile OS but no browser detected, mark as NativeApp or Expo
      if (
        userAgent.toLowerCase().includes('expo') ||
        userAgent.toLowerCase().includes('okhttp')
      ) {
        browser = 'Expo';
      } else {
        browser = 'NativeApp';
      }
    }

    // Log if mobile and Android or iOS
    if (platform === 'Mobile' && (os === 'Android' || os === 'iOS')) {
      console.log(
        `📱 Mobile session detected: OS=${os}, Browser=${browser}, UA=${userAgent}`
      );
    }

    return { platform, browser, os, userAgent };
  }
}

export { SessionService };