import mongoose from 'mongoose';

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
      version: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient lookups
sessionSchema.index({ sessionId: 1, expireAt: 1 });
sessionSchema.index({ userId: 1, expireAt: 1 });

export const Session =
  mongoose.models.Session || mongoose.model('Session', sessionSchema);
