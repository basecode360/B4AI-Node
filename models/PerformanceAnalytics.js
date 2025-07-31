// ✅ ENHANCED PerformanceAnalytics Schema - Merged with all functionality
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
  
  // ✅ BB Points (SIRF TIMED MODE SE)
  cumulativeScore: {
    type: Number,
    default: 0,
    comment: "BB Points earned only from TIMED mode quizzes"
  },
  
  // 🆕 MISSING DASHBOARD FIELDS (From requirements)
  lastQuizScore: { 
    type: Number, 
    default: 0,
    comment: "Last Quiz Score (%) - REQUIRED for dashboard"
  },
  
  totalBBPoints: { 
    type: Number, 
    default: 0,
    comment: "Total BB Points - REQUIRED for dashboard (same as cumulativeScore)"
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
    TUTOR: {
      type: Number,
      default: 0
    },
    'ON-THE-GO': {
      type: Number,
      default: 0
    }
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
  
  // Last Quiz Data (Enhanced)
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
    },
    category: { 
      type: String,
      comment: "For category analytics"
    },
    difficulty: { 
      type: String,
      comment: "For difficulty analytics"
    },
    markedQuestions: { 
      type: Number, 
      default: 0 
    }
  },
  
  // 🆕 ENHANCED Category-wise Performance (Premium feature)
  categoryPerformance: {
    type: Map,
    of: {
      attempted: { type: Number, default: 0 },
      correct: { type: Number, default: 0 },
      accuracy: { type: Number, default: 0 },
      totalQuizzes: { type: Number, default: 0 },
      averageTime: { type: Number, default: 0 },
      totalTime: { type: Number, default: 0 },
      bestScore: { type: Number, default: 0 },
      lastAttempted: { type: Date }
    },
    default: new Map()
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
  
  // 🆕 PERFORMANCE TRENDS (Premium feature for tracking over time)
  performanceTrends: [{
    date: { type: Date },
    quizMode: { type: String },
    score: { type: Number },
    accuracy: { type: Number },
    timeSpent: { type: Number },
    category: { type: String },
    bbPointsEarned: { type: Number, default: 0 }
  }],
  
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
  
  // Keep totalBBPoints in sync with cumulativeScore
  this.totalBBPoints = this.cumulativeScore;
  
  this.lastUpdated = new Date();
  next();
});

// Virtual for total time spent
performanceAnalyticsSchema.virtual('totalTimeSpent').get(function() {
  return Object.values(this.timeStats).reduce((sum, time) => sum + time, 0);
});

// ✅ ORIGINAL Method to update analytics after quiz completion (PRESERVED)
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
  
  // ✅ FIXED: Use proper BB points calculation for TIMED mode only
  if (quizMode === 'TIMED' && bbPointsEarned) {
    this.cumulativeScore += bbPointsEarned;
  }
  
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
    accuracy: Math.round((correctAnswers / totalQuestions) * 100),
    category,
    difficulty
  };
  
  // Update category performance if provided
  if (category) {
    if (!this.categoryPerformance.has(category)) {
      this.categoryPerformance.set(category, {
        attempted: 0,
        correct: 0,
        accuracy: 0,
        totalQuizzes: 0,
        averageTime: 0,
        totalTime: 0,
        bestScore: 0
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
}

// 🔥 ENHANCED updateWithLastQuiz STATIC METHOD (New Enhanced Version)
performanceAnalyticsSchema.statics.updateWithLastQuiz = async function(userId, quizData) {
  const {
    quizMode,
    totalQuestions,
    correctAnswers,
    timeSpent,
    questionTimes,
    category,
    difficulty,
    markedQuestions = 0
  } = quizData;
  
  console.log(`\n🔄 ============ ANALYTICS UPDATE START ============`);
  console.log(`👤 User: ${userId}`);
  console.log(`📝 Quiz Mode: ${quizMode}`);
  console.log(`🎯 Questions: ${correctAnswers}/${totalQuestions}`);
  console.log(`⏱️ Time: ${timeSpent}s`);
  console.log(`📂 Category: ${category || 'None'}`);
  
  // Find existing analytics or create new
  const existingAnalytics = await this.findOne({ userId });
  
  if (existingAnalytics) {
    console.log('📈 Updating existing analytics...');
    console.log('🔍 Before update - cumulativeScore:', existingAnalytics.cumulativeScore);
    console.log('🔍 Before update - TIMED quiz count:', existingAnalytics.quizCountByMode?.TIMED || 0);
    
    // 🔥 CALCULATE BB POINTS (ONLY FOR TIMED MODE) - Enhanced Formula
    let bbPointsEarned = 0;
    if (quizMode === 'TIMED' && questionTimes && questionTimes.length > 0) {
      console.log('💰 Calculating BB Points for TIMED mode...');
      questionTimes.slice(0, correctAnswers).forEach((time, index) => {
        let points = 0;
        if (time < 5) points = 1;
        else if (time < 10) points = 0.75;
        else if (time < 12) points = 0.5;
        else points = 0.25;
        
        bbPointsEarned += points;
        console.log(`   Question ${index + 1}: ${time}s = ${points} points`);
      });
      console.log(`💰 Total BB Points earned: ${bbPointsEarned}`);
    } else if (quizMode === 'TIMED') {
      // Fallback calculation if questionTimes not available
      const accuracyBonus = (correctAnswers / totalQuestions) * 100;
      const speedBonus = Math.max(0, 100 - (timeSpent / totalQuestions));
      bbPointsEarned = Math.round((accuracyBonus + speedBonus) / 10);
      console.log('💰 BB Points calculation (fallback):', {
        accuracyBonus: accuracyBonus.toFixed(2),
        speedBonus: speedBonus.toFixed(2),
        bbPointsEarned
      });
    } else {
      console.log(`❌ No BB Points for ${quizMode} mode`);
    }
    
    // Calculate current quiz score percentage
    const currentQuizScore = Math.round((correctAnswers / totalQuestions) * 100);
    console.log(`📊 Current quiz score: ${currentQuizScore}%`);
    
    // Update general stats
    existingAnalytics.totalQuizzesTaken += 1;
    existingAnalytics.totalQuestionsAttempted += totalQuestions;
    existingAnalytics.totalCorrectQuestions += correctAnswers;
    existingAnalytics.lastQuizScore = currentQuizScore; // 🆕 REQUIREMENTS
    
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
      
      console.log(`⏱️ Updated time stats - Avg: ${existingAnalytics.timePerQuestionStats.averageTime.toFixed(2)}s, Fastest: ${existingAnalytics.timePerQuestionStats.fastestTime}s, Slowest: ${existingAnalytics.timePerQuestionStats.slowestTime}s`);
    }
    
    // 🆕 UPDATE CATEGORY PERFORMANCE (REQUIREMENTS: Premium feature)
    if (category) {
      const categoryKey = category.toLowerCase();
      const categoryData = existingAnalytics.categoryPerformance.get(categoryKey) || {
        attempted: 0, correct: 0, accuracy: 0, totalQuizzes: 0,
        averageTime: 0, totalTime: 0, bestScore: 0, lastAttempted: new Date()
      };
      
      categoryData.attempted += totalQuestions;
      categoryData.correct += correctAnswers;
      categoryData.totalQuizzes += 1;
      categoryData.totalTime += timeSpent;
      categoryData.averageTime = Math.round(categoryData.totalTime / categoryData.totalQuizzes);
      categoryData.accuracy = Math.round((categoryData.correct / categoryData.attempted) * 100);
      categoryData.bestScore = Math.max(categoryData.bestScore, currentQuizScore);
      categoryData.lastAttempted = new Date();
      
      existingAnalytics.categoryPerformance.set(categoryKey, categoryData);
      console.log(`📂 Updated category "${category}": ${categoryData.accuracy}% accuracy, ${categoryData.totalQuizzes} quizzes`);
    }
    
    // 🆕 ADD TO PERFORMANCE TRENDS (Premium feature)
    if (!existingAnalytics.performanceTrends) existingAnalytics.performanceTrends = [];
    
    const trendEntry = {
      date: new Date(),
      quizMode,
      score: currentQuizScore,
      accuracy: currentQuizScore,
      timeSpent,
      category: category || 'general',
      bbPointsEarned
    };
    
    existingAnalytics.performanceTrends.push(trendEntry);
    
    // Keep only last 100 trends for performance
    if (existingAnalytics.performanceTrends.length > 100) {
      existingAnalytics.performanceTrends = existingAnalytics.performanceTrends.slice(-100);
    }
    
    console.log(`📈 Added trend entry: ${currentQuizScore}% in ${quizMode} mode`);
    
    // Update last quiz data (Enhanced)
    existingAnalytics.lastQuiz = {
      quizMode,
      questionsAttempted: totalQuestions,
      correctAnswers,
      timeSpent,
      bbPointsEarned,
      completedAt: new Date(),
      accuracy: currentQuizScore,
      category: category || null,
      difficulty: difficulty || null,
      markedQuestions
    };
    
    await existingAnalytics.save();
    
    console.log('✅ Analytics updated successfully');
    console.log('📊 Final analytics summary:');
    console.log('   - Total Quizzes:', existingAnalytics.totalQuizzesTaken);
    console.log('   - TIMED Quiz Count:', existingAnalytics.quizCountByMode.TIMED);
    console.log('   - Total BB Points (cumulativeScore):', existingAnalytics.cumulativeScore);
    console.log('   - Last Quiz Score:', existingAnalytics.lastQuizScore, '%');
    console.log('   - Last Quiz Mode:', existingAnalytics.lastQuiz.quizMode);
    console.log('   - Last Quiz BB Points:', existingAnalytics.lastQuiz.bbPointsEarned);
    console.log('   - Categories Attempted:', existingAnalytics.categoryPerformance.size);
    console.log(`====================================================\n`);
    
    return existingAnalytics;
    
  } else {
    console.log('🆕 Creating new analytics...');
    
    // 🔥 CALCULATE BB POINTS for new user (ONLY FOR TIMED MODE)
    let bbPointsEarned = 0;
    if (quizMode === 'TIMED' && questionTimes && questionTimes.length > 0) {
      questionTimes.slice(0, correctAnswers).forEach((time) => {
        if (time < 5) bbPointsEarned += 1;
        else if (time < 10) bbPointsEarned += 0.75;
        else if (time < 12) bbPointsEarned += 0.5;
        else bbPointsEarned += 0.25;
      });
    } else if (quizMode === 'TIMED') {
      const accuracyBonus = (correctAnswers / totalQuestions) * 100;
      const speedBonus = Math.max(0, 100 - (timeSpent / totalQuestions));
      bbPointsEarned = Math.round((accuracyBonus + speedBonus) / 10);
    }
    
    const currentQuizScore = Math.round((correctAnswers / totalQuestions) * 100);
    
    // Create new analytics
    const newAnalytics = new this({
      userId,
      totalQuizzesTaken: 1,
      totalQuestionsAttempted: totalQuestions,
      totalCorrectQuestions: correctAnswers,
      lastQuizScore: currentQuizScore, // 🆕 REQUIREMENTS
      cumulativeScore: quizMode === 'TIMED' ? bbPointsEarned : 0,
      // 🆕 NEW: Initialize quiz count by mode
      quizCountByMode: {
        TIMED: quizMode === 'TIMED' ? 1 : 0,
        UNTIMED: quizMode === 'UNTIMED' ? 1 : 0,
        TUTOR: quizMode === 'TUTOR' ? 1 : 0,
        'ON-THE-GO': quizMode === 'ON-THE-GO' ? 1 : 0
      },
      timeStats: {
        TIMED: quizMode === 'TIMED' ? timeSpent : 0,
        UNTIMED: quizMode === 'UNTIMED' ? timeSpent : 0,
        TUTOR: quizMode === 'TUTOR' ? timeSpent : 0,
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
        accuracy: currentQuizScore,
        category: category || null,
        difficulty: difficulty || null,
        markedQuestions
      },
      performanceTrends: [{
        date: new Date(),
        quizMode,
        score: currentQuizScore,
        accuracy: currentQuizScore,
        timeSpent,
        category: category || 'general',
        bbPointsEarned
      }]
    });
    
    // Add category performance if provided
    if (category) {
      const categoryKey = category.toLowerCase();
      newAnalytics.categoryPerformance.set(categoryKey, {
        attempted: totalQuestions,
        correct: correctAnswers,
        accuracy: currentQuizScore,
        totalQuizzes: 1,
        averageTime: timeSpent,
        totalTime: timeSpent,
        bestScore: currentQuizScore,
        lastAttempted: new Date()
      });
    }
    
    await newAnalytics.save();
    
    console.log('✅ New analytics created successfully');
    console.log('📊 New analytics summary:');
    console.log('   - Initial cumulativeScore:', newAnalytics.cumulativeScore);
    console.log('   - TIMED Quiz Count:', newAnalytics.quizCountByMode.TIMED);
    console.log('   - Last Quiz Score:', newAnalytics.lastQuizScore, '%');
    console.log('   - Quiz Mode:', newAnalytics.lastQuiz.quizMode);
    console.log('   - BB Points earned:', newAnalytics.lastQuiz.bbPointsEarned);
    console.log(`====================================================\n`);
    
    return newAnalytics;
  }
};

// ✅ ENHANCED: Get user analytics with all new fields
performanceAnalyticsSchema.statics.getUserAnalytics = async function(userId) {
  const analytics = await this.findOne({ userId });
  
  if (!analytics) {
    return {
      totalQuizzesTaken: 0,
      totalQuestionsAttempted: 0,
      totalCorrectQuestions: 0,
      accuracyPercentage: 0,
      cumulativeScore: 0,
      lastQuizScore: 0, // 🆕
      totalBBPoints: 0, // 🆕
      quizCountByMode: {
        TIMED: 0,
        UNTIMED: 0,
        TUTOR: 0,
        'ON-THE-GO': 0
      },
      timeStats: {
        TIMED: 0,
        UNTIMED: 0,
        TUTOR: 0,
        'ON-THE-GO': 0
      },
      timePerQuestionStats: {
        averageTime: 0,
        fastestTime: 0,
        slowestTime: 0
      },
      lastQuiz: null,
      categoryPerformance: {},
      performanceTrends: []
    };
  }
  
  console.log('📊 Returning user analytics:');
  console.log('   - Total BB Points (cumulativeScore):', analytics.cumulativeScore);
  console.log('   - Last Quiz Score:', analytics.lastQuizScore, '%');
  console.log('   - TIMED Quiz Count:', analytics.quizCountByMode?.TIMED || 0);
  console.log('   - Last Quiz BB Points:', analytics.lastQuiz?.bbPointsEarned || 0);
  console.log('   - Last Quiz Mode:', analytics.lastQuiz?.quizMode || 'None');
  console.log('   - Categories Attempted:', analytics.categoryPerformance.size);
  
  return {
    totalQuizzesTaken: analytics.totalQuizzesTaken,
    totalQuestionsAttempted: analytics.totalQuestionsAttempted,
    totalCorrectQuestions: analytics.totalCorrectQuestions,
    accuracyPercentage: analytics.accuracyPercentage,
    cumulativeScore: analytics.cumulativeScore,
    lastQuizScore: analytics.lastQuizScore, // 🆕
    totalBBPoints: analytics.totalBBPoints, // 🆕
    quizCountByMode: analytics.quizCountByMode || {
      TIMED: 0,
      UNTIMED: 0,
      TUTOR: 0,
      'ON-THE-GO': 0
    },
    timeStats: analytics.timeStats,
    timePerQuestionStats: analytics.timePerQuestionStats,
    lastQuiz: analytics.lastQuiz,
    categoryPerformance: analytics.getCategoryStats ? analytics.getCategoryStats() : {},
    performanceTrends: analytics.performanceTrends || []
  };
};

// 🆕 GET CATEGORY STATS METHOD (For easy category retrieval)
performanceAnalyticsSchema.methods.getCategoryStats = function() {
  const stats = {};
  for (let [category, data] of this.categoryPerformance) {
    stats[category] = {
      attempted: data.attempted,
      correct: data.correct,
      accuracy: data.accuracy,
      totalQuizzes: data.totalQuizzes,
      averageTime: data.averageTime,
      bestScore: data.bestScore,
      lastAttempted: data.lastAttempted
    };
  }
  return stats;
};

// 🆕 GET PERFORMANCE INSIGHTS METHOD
performanceAnalyticsSchema.methods.getPerformanceInsights = function() {
  const totalTime = this.timeStats.TIMED + this.timeStats.UNTIMED + this.timeStats['ON-THE-GO'];
  const timedPercentage = totalTime > 0 ? (this.timeStats.TIMED / totalTime) * 100 : 0;
  
  return {
    totalBBPoints: this.cumulativeScore,
    bbPointsSource: 'TIMED mode only',
    timedModeUsage: Math.round(timedPercentage),
    strongestCategory: this.getStrongestCategory(),
    weakestCategory: this.getWeakestCategory(),
    recentTrend: this.getRecentTrend(),
    recommendations: this.getRecommendations()
  };
};

// Helper methods for insights
performanceAnalyticsSchema.methods.getStrongestCategory = function() {
  let strongest = null;
  let highestAccuracy = 0;
  
  for (let [category, data] of this.categoryPerformance) {
    if (data.accuracy > highestAccuracy && data.totalQuizzes >= 2) {
      highestAccuracy = data.accuracy;
      strongest = { category, accuracy: data.accuracy };
    }
  }
  
  return strongest;
};

performanceAnalyticsSchema.methods.getWeakestCategory = function() {
  let weakest = null;
  let lowestAccuracy = 100;
  
  for (let [category, data] of this.categoryPerformance) {
    if (data.accuracy < lowestAccuracy && data.totalQuizzes >= 2) {
      lowestAccuracy = data.accuracy;
      weakest = { category, accuracy: data.accuracy };
    }
  }
  
  return weakest;
};

performanceAnalyticsSchema.methods.getRecentTrend = function() {
  if (!this.performanceTrends || this.performanceTrends.length < 5) return null;
  
  const recent = this.performanceTrends.slice(-5);
  const oldAvg = recent.slice(0, 2).reduce((sum, t) => sum + t.score, 0) / 2;
  const newAvg = recent.slice(-2).reduce((sum, t) => sum + t.score, 0) / 2;
  
  const trend = newAvg > oldAvg ? 'improving' : newAvg < oldAvg ? 'declining' : 'stable';
  return { trend, change: Math.round(newAvg - oldAvg) };
};

performanceAnalyticsSchema.methods.getRecommendations = function() {
  const recommendations = [];
  
  // BB Points recommendation
  if (this.cumulativeScore === 0) {
    recommendations.push('Try TIMED mode quizzes to earn BB Points!');
  }
  
  // Accuracy recommendation
  if (this.accuracyPercentage < 60) {
    recommendations.push('Focus on accuracy - try UNTIMED mode to practice');
  }
  
  // Category recommendation
  const weakest = this.getWeakestCategory();
  if (weakest) {
    recommendations.push(`Practice more ${weakest.category} questions to improve`);
  }
  
  // Time recommendation
  if (this.timePerQuestionStats.averageTime > 15) {
    recommendations.push('Work on answering questions faster');
  }
  
  return recommendations;
};

const PerformanceAnalytics = mongoose.model('PerformanceAnalytics', performanceAnalyticsSchema);

export default PerformanceAnalytics;
//models/PerformanceAnalytics.js