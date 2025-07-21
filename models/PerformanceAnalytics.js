// ✅ FIXED: Enhanced PerformanceAnalytics Schema
import mongoose from "mongoose";

const performanceAnalyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Basic Stats
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
  
  // ✅ BB Points (SIRF TIMED MODE SE)
  cumulativeScore: {
    type: Number,
    default: 0,
    comment: "BB Points earned only from TIMED mode quizzes"
  },
  
  // 🆕 NEW: Quiz Count by Mode (EXACT COUNT)
  quizCountByMode: {
    TIMED: {
      type: Number,
      default: 0
    },
    UNTIMED: {
      type: Number,
      default: 0
    },
    'ON-THE-GO': {
      type: Number,
      default: 0
    }
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
  
  // Time per question stats
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
  
  // Last Quiz Data
  lastQuiz: {
    quizMode: {
      type: String,
      enum: ['TIMED', 'UNTIMED', 'TUTOR', 'ON-THE-GO'],
      default: null
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
      default: 0,
      comment: "BB Points earned in this quiz (0 for non-TIMED modes)"
    },
    completedAt: {
      type: Date,
      default: null
    },
    accuracy: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
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

// Pre-save middleware
performanceAnalyticsSchema.pre('save', function(next) {
  if (this.totalQuestionsAttempted > 0) {
    this.accuracyPercentage = Math.round(
      (this.totalCorrectQuestions / this.totalQuestionsAttempted) * 100
    );
  }
  this.lastUpdated = new Date();
  next();
});

// ✅ FIXED: Updated static method with TIMED quiz count tracking
performanceAnalyticsSchema.statics.updateWithLastQuiz = async function(userId, quizData) {
  const { quizMode, totalQuestions, correctAnswers, timeSpent, questionTimes } = quizData;
  
  console.log('📊 Updating analytics with last quiz data:', {
    userId,
    quizMode,
    totalQuestions,
    correctAnswers,
    timeSpent
  });
  
  // ✅ BB points calculation SIRF TIMED mode ke liye
  let bbPointsEarned = 0;
  if (quizMode === 'TIMED') {
    const accuracyBonus = (correctAnswers / totalQuestions) * 100;
    const speedBonus = Math.max(0, 100 - (timeSpent / totalQuestions));
    bbPointsEarned = Math.round((accuracyBonus + speedBonus) / 10);
    
    console.log('💰 BB Points calculation for TIMED mode:', {
      accuracyBonus: accuracyBonus.toFixed(2),
      speedBonus: speedBonus.toFixed(2),
      bbPointsEarned
    });
  } else {
    console.log('❌ No BB Points for', quizMode, 'mode');
  }
  
  // Find existing analytics or create new
  const existingAnalytics = await this.findOne({ userId });
  
  if (existingAnalytics) {
    console.log('📈 Updating existing analytics...');
    console.log('🔍 Before update - cumulativeScore:', existingAnalytics.cumulativeScore);
    console.log('🔍 Before update - TIMED quiz count:', existingAnalytics.quizCountByMode?.TIMED || 0);
    
    // Update general stats
    existingAnalytics.totalQuizzesTaken += 1;
    existingAnalytics.totalQuestionsAttempted += totalQuestions;
    existingAnalytics.totalCorrectQuestions += correctAnswers;
    
    // 🆕 FIXED: Update quiz count by mode (EXACT COUNT)
    if (!existingAnalytics.quizCountByMode) {
      existingAnalytics.quizCountByMode = {
        TIMED: 0,
        UNTIMED: 0,
        TUTOR: 0,
        'ON-THE-GO': 0
      };
    }
    existingAnalytics.quizCountByMode[quizMode] += 1;
    
    // Update time stats
    existingAnalytics.timeStats[quizMode] += timeSpent;
    
    // ✅ CRITICAL FIX: cumulativeScore SIRF TIMED mode se update ho
    if (quizMode === 'TIMED') {
      existingAnalytics.cumulativeScore += bbPointsEarned;
      console.log('✅ BB Points added to cumulativeScore:', bbPointsEarned);
      console.log('✅ New cumulativeScore:', existingAnalytics.cumulativeScore);
      console.log('✅ New TIMED quiz count:', existingAnalytics.quizCountByMode.TIMED);
    } else {
      console.log('❌ No BB Points added - Mode:', quizMode);
      console.log('❌ cumulativeScore remains:', existingAnalytics.cumulativeScore);
    }
    
    // Update time per question stats
    if (questionTimes && questionTimes.length > 0) {
      const avgTime = questionTimes.reduce((sum, time) => sum + time, 0) / questionTimes.length;
      const fastestTime = Math.min(...questionTimes);
      const slowestTime = Math.max(...questionTimes);
      
      const totalQuizzesSoFar = existingAnalytics.totalQuizzesTaken;
      existingAnalytics.timePerQuestionStats.averageTime = 
        ((existingAnalytics.timePerQuestionStats.averageTime * (totalQuizzesSoFar - 1)) + avgTime) / totalQuizzesSoFar;
      
      if (existingAnalytics.timePerQuestionStats.fastestTime === 0 || fastestTime < existingAnalytics.timePerQuestionStats.fastestTime) {
        existingAnalytics.timePerQuestionStats.fastestTime = fastestTime;
      }
      if (slowestTime > existingAnalytics.timePerQuestionStats.slowestTime) {
        existingAnalytics.timePerQuestionStats.slowestTime = slowestTime;
      }
    }
    
    // Update last quiz data
    existingAnalytics.lastQuiz = {
      quizMode,
      questionsAttempted: totalQuestions,
      correctAnswers,
      timeSpent,
      bbPointsEarned,
      completedAt: new Date(),
      accuracy: Math.round((correctAnswers / totalQuestions) * 100)
    };
    
    await existingAnalytics.save();
    
    console.log('✅ Analytics updated successfully');
    console.log('📊 Final analytics summary:');
    console.log('   - Total Quizzes:', existingAnalytics.totalQuizzesTaken);
    console.log('   - TIMED Quiz Count:', existingAnalytics.quizCountByMode.TIMED);
    console.log('   - Total BB Points (cumulativeScore):', existingAnalytics.cumulativeScore);
    console.log('   - Last Quiz Mode:', existingAnalytics.lastQuiz.quizMode);
    console.log('   - Last Quiz BB Points:', existingAnalytics.lastQuiz.bbPointsEarned);
    
    return existingAnalytics;
    
  } else {
    console.log('🆕 Creating new analytics...');
    
    // Create new analytics
    const newAnalytics = new this({
      userId,
      totalQuizzesTaken: 1,
      totalQuestionsAttempted: totalQuestions,
      totalCorrectQuestions: correctAnswers,
      cumulativeScore: quizMode === 'TIMED' ? bbPointsEarned : 0,
      // 🆕 NEW: Initialize quiz count by mode
      quizCountByMode: {
        TIMED: quizMode === 'TIMED' ? 1 : 0,
        UNTIMED: quizMode === 'UNTIMED' ? 1 : 0,
        'ON-THE-GO': quizMode === 'ON-THE-GO' ? 1 : 0
      },
      timeStats: {
        TIMED: quizMode === 'TIMED' ? timeSpent : 0,
        UNTIMED: quizMode === 'UNTIMED' ? timeSpent : 0,
        'ON-THE-GO': quizMode === 'ON-THE-GO' ? timeSpent : 0
      },
      timePerQuestionStats: {
        averageTime: questionTimes ? questionTimes.reduce((sum, time) => sum + time, 0) / questionTimes.length : 0,
        fastestTime: questionTimes ? Math.min(...questionTimes) : 0,
        slowestTime: questionTimes ? Math.max(...questionTimes) : 0
      },
      lastQuiz: {
        quizMode,
        questionsAttempted: totalQuestions,
        correctAnswers,
        timeSpent,
        bbPointsEarned,
        completedAt: new Date(),
        accuracy: Math.round((correctAnswers / totalQuestions) * 100)
      }
    });
    
    await newAnalytics.save();
    
    console.log('✅ New analytics created successfully');
    console.log('📊 New analytics summary:');
    console.log('   - Initial cumulativeScore:', newAnalytics.cumulativeScore);
    console.log('   - TIMED Quiz Count:', newAnalytics.quizCountByMode.TIMED);
    console.log('   - Quiz Mode:', newAnalytics.lastQuiz.quizMode);
    console.log('   - BB Points earned:', newAnalytics.lastQuiz.bbPointsEarned);
    
    return newAnalytics;
  }
};

// ✅ FIXED: Get user analytics with exact TIMED quiz count
performanceAnalyticsSchema.statics.getUserAnalytics = async function(userId) {
  const analytics = await this.findOne({ userId });
  
  if (!analytics) {
    return {
      totalQuizzesTaken: 0,
      totalQuestionsAttempted: 0,
      totalCorrectQuestions: 0,
      accuracyPercentage: 0,
      cumulativeScore: 0,
      quizCountByMode: {
        TIMED: 0,
        UNTIMED: 0,
        'ON-THE-GO': 0
      },
      timeStats: {
        TIMED: 0,
        UNTIMED: 0,
        'ON-THE-GO': 0
      },
      timePerQuestionStats: {
        averageTime: 0,
        fastestTime: 0,
        slowestTime: 0
      },
      lastQuiz: null
    };
  }
  
  console.log('📊 Returning user analytics:');
  console.log('   - Total BB Points (cumulativeScore):', analytics.cumulativeScore);
  console.log('   - TIMED Quiz Count:', analytics.quizCountByMode?.TIMED || 0);
  console.log('   - Last Quiz BB Points:', analytics.lastQuiz?.bbPointsEarned || 0);
  console.log('   - Last Quiz Mode:', analytics.lastQuiz?.quizMode || 'None');
  
  return {
    totalQuizzesTaken: analytics.totalQuizzesTaken,
    totalQuestionsAttempted: analytics.totalQuestionsAttempted,
    totalCorrectQuestions: analytics.totalCorrectQuestions,
    accuracyPercentage: analytics.accuracyPercentage,
    cumulativeScore: analytics.cumulativeScore,
    quizCountByMode: analytics.quizCountByMode || {
      TIMED: 0,
      UNTIMED: 0,
      'ON-THE-GO': 0
    },
    timeStats: analytics.timeStats,
    timePerQuestionStats: analytics.timePerQuestionStats,
    lastQuiz: analytics.lastQuiz
  };
};

const PerformanceAnalytics = mongoose.model('PerformanceAnalytics', performanceAnalyticsSchema);

export default PerformanceAnalytics;