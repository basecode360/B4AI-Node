import { v4 as uuidv4 } from 'uuid';
import { Session } from '../models/sessionModel.js';

class SessionService {
  /**
   * Create a new session for a user
   */
  static async createSession(userId, userAgent = '', ipAddress = '') {
    const sessionId = uuidv4();
    const sessionTTLDays = parseInt(process.env.SESSION_TTL_DAYS || '7');
    const expireAt = new Date(
      Date.now() + sessionTTLDays * 24 * 60 * 60 * 1000
    );

    try {
      const session = await Session.create({
        sessionId,
        userId,
        expireAt,
        userAgent,
        ipAddress,
        deviceInfo: SessionService.parseUserAgent(userAgent),
      });

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
   * Refresh a session (sliding window)
   */
  static async refreshSession(sessionId) {
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

    if (userAgent.includes('Mobile')) platform = 'Mobile';
    else if (userAgent.includes('Tablet')) platform = 'Tablet';
    else platform = 'Desktop';

    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    return { platform, browser, userAgent };
  }
}

export { SessionService };
