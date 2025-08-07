import mongoose from 'mongoose';
import crypto from 'crypto';

const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    expireAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // TTL index - MongoDB will auto-delete expired sessions
    },
    userAgent: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '',
    },
    lastAccessed: {
      type: Date,
      default: Date.now,
    },
    deviceInfo: {
      platform: String,
      browser: String,
      os: String, // Added OS field
      userAgent: String, // Store full UA string
    },
    // NEW: Store encrypted user credentials for auto re-authentication
    encryptedCredentials: {
      type: String,
      default: null,
    },
    // NEW: Track authentication method
    authMethod: {
      type: String,
      enum: ['password', 'social', 'refresh'],
      default: 'password',
    },
    // NEW: Track if this session supports auto-renewal
    autoRenewEnabled: {
      type: Boolean,
      default: true,
    }
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient lookups
sessionSchema.index({ sessionId: 1, expireAt: 1 });
sessionSchema.index({ userId: 1, expireAt: 1 });
sessionSchema.index({ expireAt: 1 }); // For cleanup queries

// Method to encrypt user data
sessionSchema.methods.setEncryptedCredentials = function (userData) {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(process.env.SESSION_ENCRYPTION_KEY || 'fallback-key', 'salt', 32);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipher(algorithm, key);
  cipher.setAAD(Buffer.from(this.sessionId));

  let encrypted = cipher.update(JSON.stringify(userData), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  this.encryptedCredentials = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

// Method to decrypt user data
sessionSchema.methods.getDecryptedCredentials = function () {
  if (!this.encryptedCredentials) return null;

  try {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.SESSION_ENCRYPTION_KEY || 'fallback-key', 'salt', 32);

    const [ivHex, authTagHex, encrypted] = this.encryptedCredentials.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAAD(Buffer.from(this.sessionId));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (error) {
    console.error('❌ Failed to decrypt credentials:', error);
    return null;
  }
};

export const Session =
  mongoose.models.Session || mongoose.model('Session', sessionSchema);