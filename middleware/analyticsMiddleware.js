import PerformanceAnalytics from "../models/PerformanceAnalytics.js";

// Middleware to track quiz start time
export const trackQuizStart = async (req, res, next) => {
  try {
    // Store quiz start time in request
    req.quizStartTime = Date.now();
    
    // You can also store this in a temporary collection or Redis
    // for more robust tracking across multiple servers
    
    next();
  } catch (error) {
    console.error("❌ Quiz tracking error:", error);
    next(); // Continue even if tracking fails
  }
};

// Middleware to ensure user has analytics record
export const ensureAnalyticsRecord = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return next();
    }
    
    // Check if analytics record exists
    const analytics = await PerformanceAnalytics.findOne({ userId });
    
    if (!analytics) {
      // Create a new analytics record
      await PerformanceAnalytics.create({ userId });
      console.log("✅ Created analytics record for user:", userId);
    }
    
    next();
  } catch (error) {
    console.error("❌ Analytics middleware error:", error);
    next(); // Continue even if this fails
  }
};

// Helper function to calculate BB Points
export const calculateBBPoints = (correctAnswers, totalQuestions, timeSpent, quizMode) => {
  // Base points for correct answers
  const basePoints = correctAnswers * 10;
  
  // Accuracy bonus
  const accuracy = (correctAnswers / totalQuestions) * 100;
  let accuracyBonus = 0;
  if (accuracy >= 90) accuracyBonus = 50;
  else if (accuracy >= 80) accuracyBonus = 30;
  else if (accuracy >= 70) accuracyBonus = 20;
  else if (accuracy >= 60) accuracyBonus = 10;
  
  // Speed bonus for TIMED mode
  let speedBonus = 0;
  if (quizMode === 'TIMED') {
    const avgTimePerQuestion = timeSpent / totalQuestions;
    if (avgTimePerQuestion < 10) speedBonus = 30;
    else if (avgTimePerQuestion < 15) speedBonus = 20;
    else if (avgTimePerQuestion < 20) speedBonus = 10;
  }
  
  // Difficulty bonus (can be added later based on quiz difficulty)
  const difficultyBonus = 0;
  
  // Total points
  const totalPoints = basePoints + accuracyBonus + speedBonus + difficultyBonus;
  
  return {
    basePoints,
    accuracyBonus,
    speedBonus,
    difficultyBonus,
    totalPoints
  };
};

// Helper function to get performance badge
export const getPerformanceBadge = (accuracy) => {
  if (accuracy >= 90) return { badge: 'EXPERT', color: 'gold' };
  if (accuracy >= 80) return { badge: 'ADVANCED', color: 'silver' };
  if (accuracy >= 70) return { badge: 'INTERMEDIATE', color: 'bronze' };
  if (accuracy >= 60) return { badge: 'BEGINNER', color: 'blue' };
  return { badge: 'NOVICE', color: 'gray' };
};

// utils/analyticsHelpers.js
// Helper functions for analytics calculations

export const formatTimeForDisplay = (seconds) => {
  if (seconds < 60) return `${seconds}s`;
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  return `${minutes}m ${secs}s`;
};

export const calculateStreaks = async (userId) => {
  // This would require storing daily activity
  // For now, return placeholder data
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: new Date()
  };
};

export const getLeaderboardPosition = async (userId) => {
  try {
    // Get user's accuracy
    const userAnalytics = await PerformanceAnalytics.findOne({ userId });
    if (!userAnalytics) return null;
    
    // Count users with higher accuracy
    const higherCount = await PerformanceAnalytics.countDocuments({
      accuracyPercentage: { $gt: userAnalytics.accuracyPercentage }
    });
    
    // Total users
    const totalUsers = await PerformanceAnalytics.countDocuments();
    
    return {
      position: higherCount + 1,
      totalUsers,
      percentile: Math.round(((totalUsers - higherCount) / totalUsers) * 100)
    };
  } catch (error) {
    console.error("❌ Leaderboard calculation error:", error);
    return null;
  }
};

// Batch update analytics (for admin use)
export const batchUpdateAnalytics = async (updates) => {
  const bulkOps = updates.map(update => ({
    updateOne: {
      filter: { userId: update.userId },
      update: { $set: update.data },
      upsert: true
    }
  }));
  
  try {
    const result = await PerformanceAnalytics.bulkWrite(bulkOps);
    return {
      success: true,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount
    };
  } catch (error) {
    console.error("❌ Batch update error:", error);
    throw error;
  }
};