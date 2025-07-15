import mongoose from "mongoose";

const performanceAnalyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Basic Stats - 7 points jo DB mein save karne hain
  totalQuizzesTaken: {
    type: Number,
    default: 0
  },
  
  totalQuestionsAttempted: {
    type: Number,
    default: 0
  },
  
  totalCorrectQuestions: {
    type: Number,
    default: 0
  },
  
  // Calculated Fields
  accuracyPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  cumulativeScore: {
    type: Number,
    default: 0
  },
  
  // Time Stats per Mode (seconds mein)
  timeStats: {
    TIMED: {
      type: Number,
      default: 0
    },
    UNTIMED: {
      type: Number,
      default: 0
    },
    TUTOR: {
      type: Number,
      default: 0
    },
    'ON-THE-GO': {
      type: Number,
      default: 0
    }
  },
  
  // Time per question stats (7th point)
  timePerQuestionStats: {
    averageTime: {
      type: Number,
      default: 0
    },
    fastestTime: {
      type: Number,
      default: 0
    },
    slowestTime: {
      type: Number,
      default: 0
    }
  },
  
  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Accuracy percentage automatically calculate karo
performanceAnalyticsSchema.pre('save', function(next) {
  if (this.totalQuestionsAttempted > 0) {
    this.accuracyPercentage = Math.round(
      (this.totalCorrectQuestions / this.totalQuestionsAttempted) * 100
    );
  }
  this.lastUpdated = new Date();
  next();
});

const PerformanceAnalytics = mongoose.model('PerformanceAnalytics', performanceAnalyticsSchema);

export default PerformanceAnalytics;