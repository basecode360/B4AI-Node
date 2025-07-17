import mongoose from "mongoose";

const performanceAnalyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
    unique: true // One analytics record per user
  },
  
  // Basic Quiz Stats
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
  
  // Time Stats per Mode (in seconds)
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
  
  // Time per question statistics
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
  
  // Last Quiz Session Details
  lastQuiz: {
    quizMode: {
      type: String,
      enum: ['TIMED', 'UNTIMED', 'TUTOR', 'ON-THE-GO']
    },
    questionsAttempted: {
      type: Number,
      default: 0
    },
    correctAnswers: {
      type: Number,
      default: 0
    },
    timeSpent: {
      type: Number,
      default: 0
    },
    bbPointsEarned: {
      type: Number,
      default: 0
    },
    completedAt: {
      type: Date,
      default: Date.now
    },
    accuracy: {
      type: Number,
      default: 0
    }
  },
  
  // Category-wise Performance (for future enhancement)
  categoryPerformance: {
    type: Map,
    of: {
      attempted: { type: Number, default: 0 },
      correct: { type: Number, default: 0 },
      accuracy: { type: Number, default: 0 }
    }
  },
  
  // Difficulty-wise Performance (for future enhancement)
  difficultyPerformance: {
    easy: {
      attempted: { type: Number, default: 0 },
      correct: { type: Number, default: 0 }
    },
    medium: {
      attempted: { type: Number, default: 0 },
      correct: { type: Number, default: 0 }
    },
    hard: {
      attempted: { type: Number, default: 0 },
      correct: { type: Number, default: 0 }
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

// Indexes for better query performance
performanceAnalyticsSchema.index({ 'lastUpdated': -1 });
performanceAnalyticsSchema.index({ 'totalQuizzesTaken': -1 });
performanceAnalyticsSchema.index({ 'accuracyPercentage': -1 });

// Pre-save middleware to calculate accuracy percentage
performanceAnalyticsSchema.pre('save', function(next) {
  if (this.totalQuestionsAttempted > 0) {
    this.accuracyPercentage = Math.round(
      (this.totalCorrectQuestions / this.totalQuestionsAttempted) * 100
    );
  }
  this.lastUpdated = new Date();
  next();
});

// Virtual for total time spent
performanceAnalyticsSchema.virtual('totalTimeSpent').get(function() {
  return Object.values(this.timeStats).reduce((sum, time) => sum + time, 0);
});

// Method to update analytics after quiz completion
performanceAnalyticsSchema.methods.updateAfterQuiz = async function(quizData) {
  const {
    quizMode,
    totalQuestions,
    correctAnswers,
    timeSpent,
    questionTimes,
    bbPointsEarned,
    category,
    difficulty
  } = quizData;
  
  // Update basic stats
  this.totalQuizzesTaken += 1;
  this.totalQuestionsAttempted += totalQuestions;
  this.totalCorrectQuestions += correctAnswers;
  this.cumulativeScore += Math.round((correctAnswers / totalQuestions) * 100);
  
  // Update time stats
  this.timeStats[quizMode] = (this.timeStats[quizMode] || 0) + timeSpent;
  
  // Update time per question stats
  if (questionTimes && questionTimes.length > 0) {
    const avgTime = questionTimes.reduce((sum, time) => sum + time, 0) / questionTimes.length;
    const fastest = Math.min(...questionTimes);
    const slowest = Math.max(...questionTimes);
    
    const totalQuizzes = this.totalQuizzesTaken;
    this.timePerQuestionStats.averageTime = 
      ((this.timePerQuestionStats.averageTime * (totalQuizzes - 1)) + avgTime) / totalQuizzes;
    
    this.timePerQuestionStats.fastestTime = 
      this.timePerQuestionStats.fastestTime === 0 ? 
        fastest : Math.min(this.timePerQuestionStats.fastestTime, fastest);
    
    this.timePerQuestionStats.slowestTime = 
      Math.max(this.timePerQuestionStats.slowestTime, slowest);
  }
  
  // Update last quiz details
  this.lastQuiz = {
    quizMode,
    questionsAttempted: totalQuestions,
    correctAnswers,
    timeSpent,
    bbPointsEarned: bbPointsEarned || 0,
    completedAt: new Date(),
    accuracy: Math.round((correctAnswers / totalQuestions) * 100)
  };
  
  // Update category performance if provided
  if (category) {
    if (!this.categoryPerformance.has(category)) {
      this.categoryPerformance.set(category, {
        attempted: 0,
        correct: 0,
        accuracy: 0
      });
    }
    
    const catPerf = this.categoryPerformance.get(category);
    catPerf.attempted += totalQuestions;
    catPerf.correct += correctAnswers;
    catPerf.accuracy = Math.round((catPerf.correct / catPerf.attempted) * 100);
  }
  
  // Update difficulty performance if provided
  if (difficulty && this.difficultyPerformance[difficulty]) {
    this.difficultyPerformance[difficulty].attempted += totalQuestions;
    this.difficultyPerformance[difficulty].correct += correctAnswers;
  }
  
  await this.save();
};

const PerformanceAnalytics = mongoose.model('PerformanceAnalytics', performanceAnalyticsSchema);

export default PerformanceAnalytics;