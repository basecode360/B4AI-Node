import mongoose from "mongoose";
import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import PerformanceAnalytics from "../models/PerformanceAnalytics.js";
import { userModel } from "../models/userModel.js";

const router = express.Router();

// 📊 ENHANCED: Update analytics after quiz completion (Merged functionality)
router.post('/update-analytics', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Analytics update request:', req.body);
    console.log('👤 User ID:', req.user?.userId);
    
    const {
      quizMode,
      totalQuestions,
      correctAnswers,
      timeSpent,
      questionTimes,
      bbPointsEarned,
      category,
      difficulty,
      markedQuestions = 0
    } = req.body;
    
    const userId = req.user.userId;

    console.log("\n📊 ============ ANALYTICS UPDATE REQUEST ============");
    console.log("👤 User:", userId);
    console.log("📝 Quiz Data:", { quizMode, totalQuestions, correctAnswers, timeSpent, category });
    
    //  CRITICAL CHECK: BB Points logic
    if (quizMode === 'TIMED') {
      console.log("💰 TIMED MODE: BB Points will be calculated and added to cumulativeScore");
    } else {
      console.log("❌ NON-TIMED MODE:", quizMode, "- NO BB Points will be added to cumulativeScore");
    }

    // Validation
    if (!quizMode || !totalQuestions || correctAnswers === undefined || !timeSpent) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: quizMode, totalQuestions, correctAnswers, timeSpent"
      });
    }
    
    // Validate quiz mode
    const validModes = ['TIMED', 'UNTIMED', 'ON-THE-GO'];
    if (!validModes.includes(quizMode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quiz mode. Must be one of: " + validModes.join(', ')
      });
    }
    
    // Find or create analytics record
    let analytics = await PerformanceAnalytics.findOne({ userId });
    
    if (!analytics) {
      console.log('🆕 Creating new analytics record for user:', userId);
      analytics = new PerformanceAnalytics({ userId });
    }

    // Validate numbers
    if (totalQuestions <= 0 || correctAnswers < 0 || correctAnswers > totalQuestions || timeSpent < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid numeric values in quiz data"
      });
    }

    // PRESERVED: Original time stats update
    analytics.timeStats[quizMode] = (analytics.timeStats[quizMode] || 0) + timeSpent;

    //  PRESERVED: Time per question stats update
    if (questionTimes && questionTimes.length > 0) {
      const avgTime = questionTimes.reduce((sum, time) => sum + time, 0) / questionTimes.length;
      const fastest = Math.min(...questionTimes);
      const slowest = Math.max(...questionTimes);
      
      if (!analytics.timePerQuestionStats) {
        analytics.timePerQuestionStats = {
          averageTime: 0,
          fastestTime: 0,
          slowestTime: 0
        };
      }
      
      const totalQuizzes = analytics.totalQuizzesTaken;
      analytics.timePerQuestionStats.averageTime = 
        ((analytics.timePerQuestionStats.averageTime * (totalQuizzes - 1)) + avgTime) / totalQuizzes;
      
      analytics.timePerQuestionStats.fastestTime = 
        analytics.timePerQuestionStats.fastestTime === 0 ? 
        fastest : Math.min(analytics.timePerQuestionStats.fastestTime, fastest);
    
      analytics.timePerQuestionStats.slowestTime = 
        Math.max(analytics.timePerQuestionStats.slowestTime, slowest);
    }

    //  ENHANCED: Use updated static method with proper BB Points logic
    const updatedAnalytics = await PerformanceAnalytics.updateWithLastQuiz(userId, {
      quizMode,
      totalQuestions,
      correctAnswers,
      timeSpent,
      questionTimes,
      bbPointsEarned,
      category,
      difficulty,
      markedQuestions
    });

    console.log('Analytics successfully updated');

    console.log(" ============ ANALYTICS UPDATE SUCCESSFUL ============");
    console.log("📈 Final Results:");
    console.log("   - Quiz Mode:", quizMode);
    console.log("   - Total BB Points (cumulativeScore):", updatedAnalytics.cumulativeScore);
    console.log("   - Last Quiz BB Points:", updatedAnalytics.lastQuiz.bbPointsEarned);
    console.log("   - Total Quizzes:", updatedAnalytics.totalQuizzesTaken);
    console.log("   - Accuracy:", updatedAnalytics.accuracyPercentage + "%");
    console.log("   - Last Quiz Score:", updatedAnalytics.lastQuizScore + "%");
    console.log("============================================\n");
    
    //  ENHANCED: Return comprehensive response
    return res.status(200).json({
      success: true,
      message: 'Analytics updated successfully!',
      analytics: {
        totalQuizzesTaken: updatedAnalytics.totalQuizzesTaken,
        totalQuestionsAttempted: updatedAnalytics.totalQuestionsAttempted,
        totalCorrectQuestions: updatedAnalytics.totalCorrectQuestions,
        accuracyPercentage: updatedAnalytics.accuracyPercentage,
        cumulativeScore: updatedAnalytics.cumulativeScore, // BB Points (sirf TIMED se)
        lastQuizScore: updatedAnalytics.lastQuizScore || 0, // 🆕 MISSING FIELD
        totalBBPoints: updatedAnalytics.totalBBPoints || updatedAnalytics.cumulativeScore, // 🆕 MISSING FIELD
        quizCountByMode: updatedAnalytics.quizCountByMode || { TIMED: 0, UNTIMED: 0, 'ON-THE-GO': 0 }, // 🆕 MISSING FIELD
        timeStats: updatedAnalytics.timeStats,
        timePerQuestionStats: updatedAnalytics.timePerQuestionStats,
        categoryPerformance: updatedAnalytics.getCategoryStats ? updatedAnalytics.getCategoryStats() : {}, // 🆕 PREMIUM FEATURE
        lastQuiz: updatedAnalytics.lastQuiz, // Last quiz data (har mode save hoti hai)
        performanceInsights: updatedAnalytics.getPerformanceInsights ? updatedAnalytics.getPerformanceInsights() : null, // 🆕 INSIGHTS
        questionTimes: questionTimes || []
      }
    });

  } catch (error) {
    console.error("❌ Analytics update error:", error);
    res.status(500).json({
      success: false,
      message: 'Failed to update analytics',
      error: error.message
    });
  }
});

// 📱 ENHANCED: Get user stats (for mobile app) - All dashboard requirements
router.get('/user-stats', authenticateToken, async (req, res) => {
  try {
    console.log('📈 Enhanced user stats request for user:', req.user.userId);
    
    const userId = req.user.userId;

    console.log("📊 GET USER STATS REQUEST for user:", userId);

    // Find user analytics
    const analytics = await PerformanceAnalytics.findOne({ userId });

    if (!analytics) {
      console.log('📊 No analytics data found, returning default values');
      return res.status(200).json({
        success: true,
        message: "No analytics data found",
        analytics: {
          //  ALL DASHBOARD REQUIREMENTS (6 main points)
          totalQuizzesTaken: 0,
          totalQuestionsAttempted: 0, 
          totalCorrectQuestions: 0, 
          accuracyPercentage: 0, 
          cumulativeScore: 0, 
          lastQuizScore: 0, 
          totalBBPoints: 0, 
          
          // Enhanced data
          quizCountByMode: { TIMED: 0, UNTIMED: 0, 'ON-THE-GO': 0 },
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
          categoryPerformance: {}, // Premium feature
          performanceTrends: [], // Premium feature
          lastQuiz: null
        }
      });
    }
    
    console.log(' Enhanced user stats retrieved');
    
    return res.status(200).json({
      success: true,
      message: "User stats retrieved successfully",
      analytics: {
        //  ALL DASHBOARD REQUIREMENTS COMPLIANCE
        totalQuizzesTaken: analytics.totalQuizzesTaken,
        totalQuestionsAttempted: analytics.totalQuestionsAttempted, // 1. 
        totalCorrectQuestions: analytics.totalCorrectQuestions, // 2. 
        accuracyPercentage: analytics.accuracyPercentage, // 3. 
        cumulativeScore: analytics.cumulativeScore, // 4. 
        lastQuizScore: analytics.lastQuizScore || 0, // 5. 
        totalBBPoints: analytics.totalBBPoints || analytics.cumulativeScore, // 6. 
        
        // Enhanced analytics data
        quizCountByMode: analytics.quizCountByMode || { TIMED: 0, UNTIMED: 0, 'ON-THE-GO': 0 },
        timeStats: {
          TIMED: analytics.timeStats.TIMED || 0,
          UNTIMED: analytics.timeStats.UNTIMED || 0,
          'ON-THE-GO': analytics.timeStats['ON-THE-GO'] || 0
        },
        timePerQuestionStats: analytics.timePerQuestionStats,
        
        //  PREMIUM FEATURES (For paid users)
        categoryPerformance: analytics.getCategoryStats ? analytics.getCategoryStats() : {},
        performanceTrends: analytics.performanceTrends || [],
        
        // Last quiz data
        lastQuiz: analytics.lastQuiz // Last quiz data
      }
    });

  } catch (error) {
    console.error("❌ Get user stats error:", error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve stats',
      error: error.message
    });
  }
});

// NEW: Get category-wise performance (Premium feature)
router.get('/category-performance', authenticateToken, async (req, res) => {
  try {
    console.log('📂 Category performance request for user:', req.user.userId);
    
    const userId = req.user.userId;
    const analytics = await PerformanceAnalytics.findOne({ userId });

    if (!analytics) {
      return res.status(200).json({
        success: true,
        message: "No analytics data found",
        categoryPerformance: {},
        totalCategories: 0
      });
    }
    
    const categoryStats = analytics.getCategoryStats ? analytics.getCategoryStats() : {};
    
    console.log(' Category performance retrieved:', Object.keys(categoryStats).length, 'categories');
    
    return res.status(200).json({
      success: true,
      message: "Category performance retrieved successfully",
      categoryPerformance: categoryStats,
      totalCategories: Object.keys(categoryStats).length,
      overallStats: {
        totalQuizzes: analytics.totalQuizzesTaken,
        totalAccuracy: analytics.accuracyPercentage,
        strongestCategory: analytics.getStrongestCategory ? analytics.getStrongestCategory() : null,
        weakestCategory: analytics.getWeakestCategory ? analytics.getWeakestCategory() : null
      }
    });

  } catch (error) {
    console.error("❌ Get category performance error:", error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve category performance',
      error: error.message
    });
  }
});

// NEW: Get performance trends (Premium feature)
router.get('/performance-trends', authenticateToken, async (req, res) => {
  try {
    console.log('📈 Performance trends request for user:', req.user.userId);
    
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 20;
    
    const analytics = await PerformanceAnalytics.findOne({ userId });

    if (!analytics || !analytics.performanceTrends) {
      return res.status(200).json({
        success: true,
        message: "No trends data found",
        trends: [],
        totalEntries: 0
      });
    }
    
    // Get recent trends
    const recentTrends = analytics.performanceTrends.slice(-limit).reverse();
    
    // Calculate trend analysis
    const trendAnalysis = analytics.getRecentTrend ? analytics.getRecentTrend() : null;
    
    console.log(' Performance trends retrieved:', recentTrends.length, 'entries');
    
    return res.status(200).json({
      success: true,
      message: "Performance trends retrieved successfully",
      trends: recentTrends,
      totalEntries: analytics.performanceTrends.length,
      analysis: trendAnalysis,
      summary: {
        averageScore: Math.round(recentTrends.reduce((sum, t) => sum + t.score, 0) / recentTrends.length) || 0,
        bestScore: Math.max(...recentTrends.map(t => t.score)) || 0,
        mostPlayedMode: getMostPlayedMode(recentTrends),
        totalBBPointsInTrends: recentTrends.reduce((sum, t) => sum + (t.bbPointsEarned || 0), 0)
      }
    });

  } catch (error) {
    console.error("❌ Get performance trends error:", error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve performance trends',
      error: error.message
    });
  }
});

// Helper function for most played mode
function getMostPlayedMode(trends) {
  const modeCounts = {};
  trends.forEach(t => {
    modeCounts[t.quizMode] = (modeCounts[t.quizMode] || 0) + 1;
  });
  
  return Object.keys(modeCounts).reduce((a, b) => modeCounts[a] > modeCounts[b] ? a : b, 'TIMED');
}

// NEW: Get performance insights (Premium feature)
router.get('/performance-insights', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Performance insights request for user:', req.user.userId);
    
    const userId = req.user.userId;
    const analytics = await PerformanceAnalytics.findOne({ userId });

    if (!analytics) {
      return res.status(200).json({
        success: true,
        message: "No analytics data found",
        insights: {
          totalBBPoints: 0,
          recommendations: ['Take your first quiz to get insights!'],
          strongestCategory: null,
          weakestCategory: null,
          recentTrend: null
        }
      });
    }
    
    const insights = analytics.getPerformanceInsights ? analytics.getPerformanceInsights() : {
      totalBBPoints: analytics.cumulativeScore,
      bbPointsSource: 'TIMED mode only',
      timedModeUsage: 0,
      recommendations: ['Take more quizzes to get better insights']
    };
    
    console.log(' Performance insights generated');
    
    return res.status(200).json({
      success: true,
      message: "Performance insights retrieved successfully",
      insights: insights,
      metadata: {
        totalQuizzes: analytics.totalQuizzesTaken,
        totalCategories: analytics.categoryPerformance ? analytics.categoryPerformance.size : 0,
        dataCompleteness: calculateDataCompleteness(analytics)
      }
    });

  } catch (error) {
    console.error("❌ Get performance insights error:", error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve performance insights',
      error: error.message
    });
  }
});

// Helper function for data completeness
function calculateDataCompleteness(analytics) {
  let score = 0;
  if (analytics.totalQuizzesTaken > 0) score += 25;
  if (analytics.categoryPerformance && analytics.categoryPerformance.size > 0) score += 25;
  if (analytics.performanceTrends && analytics.performanceTrends.length > 5) score += 25;
  if (analytics.cumulativeScore > 0) score += 25;
  return score;
}

// 🔧 ENHANCED: Admin get all users' analytics with detailed info
router.get('/admin/all-stats', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 Admin all stats request');
    console.log('👤 Requested by user:', req.user?.userId);
    
    // TODO: Add admin role check here
    // const requestingUser = await userModel.findById(req.user.userId);
    // if (requestingUser.role !== 'admin') {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Access denied. Admin only.'
    //   });
    // }
    
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Sorting parameters
    const sortBy = req.query.sortBy || 'lastUpdated';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    
    // Build sort object
    const sortObject = {};
    sortObject[sortBy] = sortOrder;
    
    // Get total count
    const totalCount = await PerformanceAnalytics.countDocuments();
    
    // Get analytics with user details
    const analytics = await PerformanceAnalytics.find({})
      .populate('userId', 'email profile.firstName profile.lastName role isVerified createdAt')
      .sort(sortObject)
      .skip(skip)
      .limit(limit)
      .lean();
    
    console.log(` Found ${analytics.length} analytics records`);
    
    // Transform data for admin dashboard
    const transformedAnalytics = analytics.map(analytic => ({
      _id: analytic._id,
      user: analytic.userId ? {
        _id: analytic.userId._id,
        email: analytic.userId.email,
        name: `${analytic.userId.profile?.firstName || ''} ${analytic.userId.profile?.lastName || ''}`.trim() || 'No Name',
        role: analytic.userId.role,
        isVerified: analytic.userId.isVerified,
        joinedAt: analytic.userId.createdAt
      } : null,
      
      //  ALL DASHBOARD REQUIREMENTS FOR ADMIN (7 points)
      totalQuizzesTaken: analytic.totalQuizzesTaken,
      totalQuestionsAttempted: analytic.totalQuestionsAttempted,
      totalCorrectQuestions: analytic.totalCorrectQuestions,
      accuracyPercentage: analytic.accuracyPercentage,
      cumulativeScore: analytic.cumulativeScore,
      lastQuizScore: analytic.lastQuizScore || 0, // 🆕
      totalBBPoints: analytic.totalBBPoints || analytic.cumulativeScore, // 🆕
      
      // Enhanced admin data
      quizCountByMode: analytic.quizCountByMode,
      timeStats: analytic.timeStats,
      timePerQuestionStats: analytic.timePerQuestionStats,
      categoryPerformance: analytic.categoryPerformance ? 
        Object.fromEntries(analytic.categoryPerformance) : {},
      performanceTrendsCount: analytic.performanceTrends ? analytic.performanceTrends.length : 0,
      difficultyPerformance: analytic.difficultyPerformance,
      lastQuiz: analytic.lastQuiz,
      lastUpdated: analytic.lastUpdated,
      createdAt: analytic.createdAt
    }));
    
    return res.status(200).json({
      success: true,
      analytics: transformedAnalytics,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasMore: skip + analytics.length < totalCount
      },
      count: transformedAnalytics.length
    });
    
  } catch (error) {
    console.error('❌ Get all stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve analytics',
      error: error.message
    });
  }
});

// 📊 ENHANCED: Admin summary statistics
router.get('/admin/summary', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Admin summary stats request');
    
    // TODO: Add admin role check
    
    // Use aggregation pipeline for efficient calculation
    const summaryPipeline = [
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalQuizzesTaken: { $sum: "$totalQuizzesTaken" },
          totalQuestionsAttempted: { $sum: "$totalQuestionsAttempted" },
          totalCorrectQuestions: { $sum: "$totalCorrectQuestions" },
          totalBBPoints: { $sum: "$cumulativeScore" }, // 🆕 BB Points total
          avgAccuracy: { $avg: "$accuracyPercentage" },
          avgCumulativeScore: { $avg: "$cumulativeScore" },
          avgLastQuizScore: { $avg: "$lastQuizScore" }, // 🆕
          totalTimedTime: { $sum: "$timeStats.TIMED" },
          totalUntimedTime: { $sum: "$timeStats.UNTIMED" },
          totalTutorTime: { $sum: "$timeStats.TUTOR" },
          totalOnTheGoTime: { $sum: "$timeStats.ON-THE-GO" },
          totalTimedQuizzes: { $sum: "$quizCountByMode.TIMED" }, // 🆕
          totalUntimedQuizzes: { $sum: "$quizCountByMode.UNTIMED" }, // 🆕
          totalOnTheGoQuizzes: { $sum: "$quizCountByMode.ON-THE-GO" } // 🆕
        }
      }
    ];

    // Run the summary pipeline and assign result to summary
    const [summary] = await PerformanceAnalytics.aggregate(summaryPipeline);
    
    // Total quizzes taken across all users
    const totalQuizzesTaken = await PerformanceAnalytics.aggregate([
      { $group: { _id: null, total: { $sum: "$totalQuizzesTaken" } } }
    ]);
    
    // Total questions attempted across all users
    const totalQuestionsAttempted = await PerformanceAnalytics.aggregate([
      { $group: { _id: null, total: { $sum: "$totalQuestionsAttempted" } } }
    ]);
    
    // Average accuracy across all users
    const averageAccuracy = await PerformanceAnalytics.aggregate([
      { $group: { _id: null, avgAccuracy: { $avg: "$accuracyPercentage" } } }
    ]);
    
    // Mode-wise time distribution
    const modeTimeStats = await PerformanceAnalytics.aggregate([
      {
        $group: {
          _id: null,
          totalTimedTime: { $sum: "$timeStats.TIMED" },
          totalUntimedTime: { $sum: "$timeStats.UNTIMED" },
          totalTutorTime: { $sum: "$timeStats.TUTOR" },
          totalOnTheGoTime: { $sum: "$timeStats.ON-THE-GO" }
        }
      }
    ]);
    
    // Top performers
    const topPerformers = await PerformanceAnalytics.find({})
      .populate('userId', 'email profile.firstName profile.lastName')
      .sort({ accuracyPercentage: -1 })
      .limit(5)
      .lean();
    
    // Most active users
    const mostActiveUsers = await PerformanceAnalytics.find({})
      .populate('userId', 'email profile.firstName profile.lastName')
      .sort({ totalQuizzesTaken: -1 })
      .limit(5)
      .lean();
    
    // Category statistics
    const categoryStats = await PerformanceAnalytics.aggregate([
      { $unwind: { path: "$categoryPerformance", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$categoryPerformance.k",
          totalAttempted: { $sum: "$categoryPerformance.v.attempted" },
          totalCorrect: { $sum: "$categoryPerformance.v.correct" },
          avgAccuracy: { $avg: "$categoryPerformance.v.accuracy" },
          totalQuizzes: { $sum: "$categoryPerformance.v.totalQuizzes" }
        }
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { totalAttempted: -1 } },
      { $limit: 10 }
    ]);
    
    // Top performers by BB Points
    const topBBPointsEarners = await PerformanceAnalytics.find({})
      .populate('userId', 'email profile.firstName profile.lastName')
      .sort({ cumulativeScore: -1 })
      .limit(5)
      .select('userId cumulativeScore totalQuizzesTaken accuracyPercentage')
      .lean();
    
    return res.status(200).json({
      success: true,
      summary: {
        // Basic totals
        totalUsersWithAnalytics: summary?.totalUsers || 0,
        totalQuizzesTaken: summary?.totalQuizzesTaken || totalQuizzesTaken[0]?.total || 0,
        totalQuestionsAttempted: summary?.totalQuestionsAttempted || totalQuestionsAttempted[0]?.total || 0,
        totalCorrectQuestions: summary?.totalCorrectQuestions || 0,
        totalBBPointsEarned: summary?.totalBBPoints || 0, // 🆕
        
        // Averages
        averageAccuracy: Math.round(averageAccuracy[0]?.avgAccuracy || 0),
        averageCumulativeScore: Math.round(summary?.avgCumulativeScore || 0),
        averageLastQuizScore: Math.round(summary?.avgLastQuizScore || 0), // 🆕
        
        // Mode distribution
        modeDistribution: {
          totalTimedQuizzes: summary?.totalTimedQuizzes || 0, // 🆕 ACCURATE
          totalUntimedQuizzes: summary?.totalUntimedQuizzes || 0, // 🆕 ACCURATE  
          totalOnTheGoQuizzes: summary?.totalOnTheGoQuizzes || 0, // 🆕 ACCURATE
          totalTimedTime: summary?.totalTimedTime || 0,
          totalUntimedTime: summary?.totalUntimedTime || 0,
          totalTutorTime: summary?.totalTutorTime || 0,
          totalOnTheGoTime: summary?.totalOnTheGoTime || 0
        },
        
        // Enhanced insights
        categoryStats: categoryStats,
        totalCategoriesPlayed: categoryStats.length,
        
        topPerformers: topPerformers.map(p => ({
          userId: p.userId?._id,
          name: `${p.userId?.profile?.firstName || ''} ${p.userId?.profile?.lastName || ''}`.trim() || 'No Name',
          email: p.userId?.email,
          accuracy: p.accuracyPercentage,
          totalQuizzes: p.totalQuizzesTaken
        })),
        
        mostActiveUsers: mostActiveUsers.map(u => ({
          userId: u.userId?._id,
          name: `${u.userId?.profile?.firstName || ''} ${u.userId?.profile?.lastName || ''}`.trim() || 'No Name',
          email: u.userId?.email,
          totalQuizzes: u.totalQuizzesTaken,
          totalQuestions: u.totalQuestionsAttempted
        })),
        
        // Top performers by BB Points
        topBBPointsEarners: topBBPointsEarners.map(p => ({
          userId: p.userId?._id,
          name: `${p.userId?.profile?.firstName || ''} ${p.userId?.profile?.lastName || ''}`.trim() || 'No Name',
          email: p.userId?.email,
          bbPoints: p.cumulativeScore,
          accuracy: p.accuracyPercentage,
          totalQuizzes: p.totalQuizzesTaken
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ Get summary stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve summary statistics',
      error: error.message
    });
  }
});

//  SAME: Get last quiz details route
router.get("/last-quiz", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log("📊 GET LAST QUIZ REQUEST for user:", userId);

    const analytics = await PerformanceAnalytics.findOne({ userId }).select('lastQuiz');

    if (!analytics || !analytics.lastQuiz) {
      return res.json({
        success: true,
        message: "No last quiz data found",
        data: {
          lastQuiz: null
        }
      });
    }

    console.log(" Last quiz data retrieved:");
    console.log("   - Mode:", analytics.lastQuiz.quizMode);
    console.log("   - BB Points:", analytics.lastQuiz.bbPointsEarned);
    console.log("   - Accuracy:", analytics.lastQuiz.accuracy + "%");
    console.log("   - Category:", analytics.lastQuiz.category || 'None');

    res.json({
      success: true,
      message: "Last quiz data retrieved successfully",
      data: {
        lastQuiz: analytics.lastQuiz
      }
    });

  } catch (error) {
    console.error("❌ Get last quiz error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve last quiz data",
      error: error.message
    });
  }
});

//  ENHANCED: BB Points summary route with better calculations
router.get("/bb-points-summary", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log("🏆 GET BB POINTS SUMMARY REQUEST for user:", userId);

    const analytics = await PerformanceAnalytics.findOne({ userId });

    if (!analytics) {
      return res.json({
        success: true,
        message: "No analytics data found",
        bbPointsSummary: {
          totalBBPoints: 0,
          lastQuizBBPoints: 0,
          timedQuizCount: 0,
          averageBBPointsPerQuiz: 0
        }
      });
    }

    //  BETTER: Use exact TIMED quiz count from quizCountByMode
    const timedQuizCount = analytics.quizCountByMode?.TIMED || 0;
    
    //  BACKUP: Calculate timed quiz count from total time and average time if needed
    const totalTime = analytics.timeStats.TIMED + 
                     analytics.timeStats.UNTIMED + 
                     analytics.timeStats['ON-THE-GO'];
    
    const timedRatio = totalTime > 0 ? analytics.timeStats.TIMED / totalTime : 0;
    const estimatedTimedQuizzes = timedQuizCount > 0 ? timedQuizCount : Math.round(analytics.totalQuizzesTaken * timedRatio);

    const bbPointsSummary = {
      totalBBPoints: analytics.cumulativeScore, // Total BB Points (sirf TIMED se)
      lastQuizBBPoints: analytics.lastQuiz?.bbPointsEarned || 0,
      timedQuizCount: estimatedTimedQuizzes,
      averageBBPointsPerQuiz: estimatedTimedQuizzes > 0 ? 
        Math.round(analytics.cumulativeScore / estimatedTimedQuizzes) : 0,
      //  BONUS: Additional insights
      timedTimePercentage: Math.round(timedRatio * 100),
      lastQuizMode: analytics.lastQuiz?.quizMode || null,
      //  Enhanced metrics
      exactTimedQuizCount: timedQuizCount,
      lastQuizScore: analytics.lastQuizScore || 0
    };

    console.log(" BB Points summary retrieved:");
    console.log("   - Total BB Points:", bbPointsSummary.totalBBPoints);
    console.log("   - Last Quiz BB Points:", bbPointsSummary.lastQuizBBPoints);
    console.log("   - Exact TIMED Quizzes:", bbPointsSummary.exactTimedQuizCount);
    console.log("   - TIMED Time %:", bbPointsSummary.timedTimePercentage + "%");

    res.json({
      success: true,
      message: "BB Points summary retrieved successfully",
      bbPointsSummary
    });

  } catch (error) {
    console.error("❌ Get BB Points summary error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve BB Points summary",
      error: error.message
    });
  }
});

// NEW: BB Points leaderboard
router.get('/leaderboard/bb-points', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    console.log('🏆 BB Points leaderboard request, limit:', limit);
    
    const leaderboard = await PerformanceAnalytics.find({ cumulativeScore: { $gt: 0 } })
      .populate('userId', 'email profile.firstName profile.lastName')
      .sort({ cumulativeScore: -1 })
      .limit(limit)
      .select('userId cumulativeScore totalQuizzesTaken accuracyPercentage quizCountByMode lastQuiz')
      .lean();
    
    const transformedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      user: {
        _id: entry.userId._id,
        name: `${entry.userId.profile?.firstName || ''} ${entry.userId.profile?.lastName || ''}`.trim() || 'Anonymous',
        email: entry.userId.email.substring(0, 3) + '***' // Partial privacy
      },
      bbPoints: entry.cumulativeScore,
      accuracy: entry.accuracyPercentage,
      totalQuizzes: entry.totalQuizzesTaken,
      timedQuizzes: entry.quizCountByMode?.TIMED || 0,
      lastQuizMode: entry.lastQuiz?.quizMode || 'Unknown'
    }));
    
    console.log('✅ BB Points leaderboard retrieved:', transformedLeaderboard.length, 'entries');
    
    return res.status(200).json({
      success: true,
      message: "BB Points leaderboard retrieved successfully",
      leaderboard: transformedLeaderboard,
      totalEntries: transformedLeaderboard.length,
      note: "BB Points are earned only from TIMED mode quizzes"
    });
    
  } catch (error) {
    console.error('❌ BB Points leaderboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve BB Points leaderboard',
      error: error.message
    });
  }
});

// 📈 Admin: Get analytics by user ID
router.get('/admin/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('📈 Admin requesting analytics for user:', userId);
    
    // TODO: Add admin role check
    
    const analytics = await PerformanceAnalytics.findOne({ userId })
      .populate('userId', 'email profile role isVerified createdAt');
    
    if (!analytics) {
      return res.status(404).json({
        success: false,
        message: 'No analytics found for this user'
      });
    }
    
    // Get user's quiz history (last 10 quizzes)
    // This would require storing individual quiz records
    // For now, we return the last quiz details
    
    return res.status(200).json({
      success: true,
      analytics: {
        user: analytics.userId,
        stats: {
          totalQuizzesTaken: analytics.totalQuizzesTaken,
          totalQuestionsAttempted: analytics.totalQuestionsAttempted,
          totalCorrectQuestions: analytics.totalCorrectQuestions,
          accuracyPercentage: analytics.accuracyPercentage,
          cumulativeScore: analytics.cumulativeScore,
          lastQuizScore: analytics.lastQuizScore || 0, // 🆕
          totalBBPoints: analytics.totalBBPoints || analytics.cumulativeScore, // 🆕
          quizCountByMode: analytics.quizCountByMode, // 🆕
          timeStats: analytics.timeStats,
          timePerQuestionStats: analytics.timePerQuestionStats
        },
        lastQuiz: analytics.lastQuiz,
        categoryPerformance: analytics.categoryPerformance ? 
          Object.fromEntries(analytics.categoryPerformance) : {},
        performanceTrends: analytics.performanceTrends || [], // 🆕
        difficultyPerformance: analytics.difficultyPerformance,
        metadata: {
          lastUpdated: analytics.lastUpdated,
          createdAt: analytics.createdAt
        }
      }
    });
    
  } catch (error) {
    console.error('❌ User analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user analytics',
      error: error.message
    });
  }
});

//NEW: Verify BB Points source - Debug endpoint
router.get("/verify-bb-points", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log("🔍 VERIFYING BB POINTS SOURCE for user:", userId);

    const analytics = await PerformanceAnalytics.findOne({ userId });

    if (!analytics) {
      return res.json({
        success: false,
        message: "No analytics found for verification"
      });
    }

    const totalTimeSpent = analytics.timeStats.TIMED + 
                          analytics.timeStats.UNTIMED + 
                          analytics.timeStats['ON-THE-GO'];

    const timedRatio = totalTimeSpent > 0 ? (analytics.timeStats.TIMED / totalTimeSpent) * 100 : 0;

    const verification = {
      cumulativeScore: analytics.cumulativeScore,
      lastQuizScore: analytics.lastQuizScore || 0, // 🆕
      totalBBPoints: analytics.totalBBPoints || analytics.cumulativeScore, // 🆕
      exactTimedQuizCount: analytics.quizCountByMode?.TIMED || 0, // 🆕
      timeStats: {
        TIMED: analytics.timeStats.TIMED || 0,
        UNTIMED: analytics.timeStats.UNTIMED || 0,
        'ON-THE-GO': analytics.timeStats['ON-THE-GO'] || 0
      },
      timedTimePercentage: timedRatio.toFixed(2) + '%',
      lastQuizMode: analytics.lastQuiz?.quizMode,
      lastQuizBBPoints: analytics.lastQuiz?.bbPointsEarned || 0,
      totalQuizzes: analytics.totalQuizzesTaken,
      warning: timedRatio < 50 && analytics.cumulativeScore > 0 ? 
        '⚠️ Warning: BB Points detected but TIMED mode time is less than 50%' : 
        '✅ BB Points tracking looks correct',
      recommendation: analytics.cumulativeScore === 0 ? 
        '💡 Take some TIMED quizzes to earn BB Points!' :
        '🎯 Continue taking TIMED quizzes to earn more BB Points'
    };

    console.log(" BB Points verification completed:");
    console.log("   - Cumulative Score:", verification.cumulativeScore);
    console.log("   - Exact TIMED Quizzes:", verification.exactTimedQuizCount);
    console.log("   - TIMED Time %:", verification.timedTimePercentage);
    console.log("   - Status:", verification.warning);

    res.json({
      success: true,
      message: "BB Points verification completed",
      verification: verification
    });

  } catch (error) {
    console.error("❌ BB Points verification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify BB Points source",
      error: error.message
    });
  }
});

// 🗑️ Admin: Reset user analytics
router.delete('/admin/reset/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('🗑️ Admin resetting analytics for user:', userId);
    
    // TODO: Add admin role check and confirmation
    
    const result = await PerformanceAnalytics.findOneAndDelete({ userId });
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'No analytics found for this user'
      });
    }
    
    console.log(' Analytics reset successfully');
    
    return res.status(200).json({
      success: true,
      message: 'User analytics reset successfully'
    });
    
  } catch (error) {
    console.error('❌ Reset analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset analytics',
      error: error.message
    });
  }
});

// 📥 ENHANCED: Admin export analytics data
router.get('/admin/export', authenticateToken, async (req, res) => {
  try {
    console.log('📥 Export analytics request');
    
    // TODO: Add admin role check
    
    const format = req.query.format || 'json';
    
    // Get all analytics data with populated user info
    const analytics = await PerformanceAnalytics.find({})
      .populate('userId', 'email profile.firstName profile.lastName')
      .lean();
    
    if (format === 'csv') {
      // Enhanced CSV headers
      const csvHeaders = [
        'User Email',
        'User Name',
        'Total Quizzes',
        'Questions Attempted',
        'Correct Answers',
        'Accuracy %',
        'Cumulative Score',
        'Last Quiz Score',
        'Total BB Points', 
        'TIMED Quizzes', 
        'UNTIMED Quizzes', 
        'ON-THE-GO Quizzes', 
        'Time in TIMED',
        'Time in UNTIMED',
        'Time in TUTOR',
        'Time in ON-THE-GO',
        'Avg Time per Question',
        'Last Updated'
      ].join(',');
      
      const csvRows = analytics.map(a => [
        a.userId?.email || '',
        `${a.userId?.profile?.firstName || ''} ${a.userId?.profile?.lastName || ''}`.trim() || 'Unknown',
        a.totalQuizzesTaken,
        a.totalQuestionsAttempted,
        a.totalCorrectQuestions,
        a.accuracyPercentage,
        a.cumulativeScore,
        a.lastQuizScore || 0, 
        a.totalBBPoints || a.cumulativeScore, 
        a.quizCountByMode?.TIMED || 0, 
        a.quizCountByMode?.UNTIMED || 0, 
        a.quizCountByMode?.['ON-THE-GO'] || 0, 
        a.timeStats.TIMED,
        a.timeStats.UNTIMED,
        a.timeStats.TUTOR,
        a.timeStats['ON-THE-GO'],
        a.timePerQuestionStats.averageTime.toFixed(2),
        new Date(a.lastUpdated).toISOString()
      ].join(','));
      
      const csv = [csvHeaders, ...csvRows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analytics_export.csv');
      return res.send(csv);
    }
    
    // Default to JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=analytics_export.json');
    return res.json({
      success: true,
      exportDate: new Date().toISOString(),
      totalRecords: analytics.length,
      data: analytics.map(a => ({
        user: {
          email: a.userId?.email || '',
          name: `${a.userId?.profile?.firstName || ''} ${a.userId?.profile?.lastName || ''}`.trim() || 'Unknown'
        },
        totalQuizzesTaken: a.totalQuizzesTaken,
        totalQuestionsAttempted: a.totalQuestionsAttempted,
        totalCorrectQuestions: a.totalCorrectQuestions,
        accuracyPercentage: a.accuracyPercentage,
        cumulativeScore: a.cumulativeScore,
        lastQuizScore: a.lastQuizScore || 0, 
        totalBBPoints: a.totalBBPoints || a.cumulativeScore, 
        quizCountByMode: a.quizCountByMode, 
        timeStats: a.timeStats,
        timePerQuestionStats: a.timePerQuestionStats,
        lastUpdated: a.lastUpdated
      }))
    });
    
  } catch (error) {
    console.error('❌ Export error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export analytics',
      error: error.message
    });
  }
});

// NEW: Export enhanced analytics
router.get('/admin/export-enhanced', authenticateToken, async (req, res) => {
  try {
    console.log('📥 Enhanced export request');
    
    const format = req.query.format || 'json';
    const includeCategories = req.query.includeCategories === 'true';
    const includeTrends = req.query.includeTrends === 'true';
    
    // Get all analytics with enhanced data
    const analytics = await PerformanceAnalytics.find({})
      .populate('userId', 'email profile.firstName profile.lastName')
      .lean();
    
    const enhancedData = analytics.map(a => {
      const baseData = {
        userEmail: a.userId?.email || '',
        userName: `${a.userId?.profile?.firstName || ''} ${a.userId?.profile?.lastName || ''}`.trim(),
        
        // ALL DASHBOARD REQUIREMENTS
        totalQuizzes: a.totalQuizzesTaken,
        totalQuestionsAttempted: a.totalQuestionsAttempted,
        totalCorrectQuestions: a.totalCorrectQuestions,
        accuracyPercentage: a.accuracyPercentage,
        cumulativeScore: a.cumulativeScore,
        lastQuizScore: a.lastQuizScore || 0,
        totalBBPoints: a.totalBBPoints || a.cumulativeScore,
        
        // Quiz mode breakdown
        timedQuizzes: a.quizCountByMode?.TIMED || 0,
        untimedQuizzes: a.quizCountByMode?.UNTIMED || 0,
        onTheGoQuizzes: a.quizCountByMode?.['ON-THE-GO'] || 0,
        
        // Time stats
        timedTime: a.timeStats?.TIMED || 0,
        untimedTime: a.timeStats?.UNTIMED || 0,
        onTheGoTime: a.timeStats?.['ON-THE-GO'] || 0,
        avgTimePerQuestion: a.timePerQuestionStats?.averageTime || 0,
        
        lastUpdated: new Date(a.lastUpdated).toISOString()
      };
      
      // Add category data if requested
      if (includeCategories && a.categoryPerformance) {
        baseData.categoryPerformance = Object.fromEntries(a.categoryPerformance);
        baseData.totalCategories = a.categoryPerformance.size;
      }
      
      // Add trends data if requested
      if (includeTrends && a.performanceTrends) {
        baseData.performanceTrends = a.performanceTrends;
        baseData.totalTrends = a.performanceTrends.length;
      }
      
      return baseData;
    });
    
    if (format === 'csv') {
      // Enhanced CSV headers
      const csvHeaders = [
        'User Email', 'User Name', 'Total Quizzes', 'Questions Attempted', 'Correct Answers',
        'Accuracy %', 'Cumulative Score', 'Last Quiz Score', 'Total BB Points',
        'TIMED Quizzes', 'UNTIMED Quizzes', 'ON-THE-GO Quizzes',
        'TIMED Time', 'UNTIMED Time', 'ON-THE-GO Time', 'Avg Time per Question',
        'Last Updated'
      ].join(',');
      
      const csvRows = enhancedData.map(a => [
        a.userEmail, a.userName, a.totalQuizzes, a.totalQuestionsAttempted,
        a.totalCorrectQuestions, a.accuracyPercentage, a.cumulativeScore,
        a.lastQuizScore, a.totalBBPoints, a.timedQuizzes, a.untimedQuizzes,
        a.onTheGoQuizzes, a.timedTime, a.untimedTime, a.onTheGoTime,
        a.avgTimePerQuestion.toFixed(2), a.lastUpdated
      ].join(','));
      
      const csv = [csvHeaders, ...csvRows].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=enhanced_analytics_export.csv');
      return res.send(csv);
    }
    
    // JSON export
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=enhanced_analytics_export.json');
    return res.json({
      success: true,
      exportDate: new Date().toISOString(),
      totalRecords: enhancedData.length,
      exportOptions: {
        format,
        includeCategories,
        includeTrends
      },
      data: enhancedData
    });
    
  } catch (error) {
    console.error('❌ Enhanced export error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export enhanced analytics',
      error: error.message
    });
  }
});

// ENHANCED: Reset analytics route with confirmation
router.delete("/reset-analytics", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { confirm } = req.query;

    console.log("🗑️ RESET ANALYTICS REQUEST for user:", userId);

    if (confirm !== 'true') {
      return res.status(400).json({
        success: false,
        message: "Please add ?confirm=true to confirm analytics reset"
      });
    }

    const result = await PerformanceAnalytics.deleteOne({ userId });

    if (result.deletedCount === 0) {
      return res.json({
        success: true,
        message: "No analytics data found to delete"
      });
    }

    console.log(" Analytics data reset successfully");

    res.json({
      success: true,
      message: "Analytics data reset successfully! All performance data cleared.",
      note: "Take TIMED quizzes to earn BB Points and rebuild your analytics"
    });

  } catch (error) {
    console.error("❌ Reset analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset analytics data",
      error: error.message
    });
  }
});

// SAME: Analytics overview route
router.get("/overview", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log("📊 GET ANALYTICS OVERVIEW REQUEST for user:", userId);

    const analytics = await PerformanceAnalytics.findOne({ userId });

    if (!analytics) {
      return res.json({
        success: true,
        message: "No analytics data found",
        overview: null
      });
    }

    // Calculate additional metrics
    const totalTimeSpent = analytics.timeStats.TIMED + 
                          analytics.timeStats.UNTIMED + 
                          analytics.timeStats['ON-THE-GO'];

    const incorrectQuestions = analytics.totalQuestionsAttempted - analytics.totalCorrectQuestions;

    const overview = {
      basicStats: {
        totalQuizzesTaken: analytics.totalQuizzesTaken,
        totalQuestionsAttempted: analytics.totalQuestionsAttempted,
        totalCorrectQuestions: analytics.totalCorrectQuestions,
        incorrectQuestions,
        accuracyPercentage: analytics.accuracyPercentage,
        cumulativeScore: analytics.cumulativeScore, 
        lastQuizScore: analytics.lastQuizScore || 0, // 
        totalBBPoints: analytics.totalBBPoints || analytics.cumulativeScore 
      },
      quizModeBreakdown: { // Enhanced breakdown
        quizCountByMode: analytics.quizCountByMode || { TIMED: 0, UNTIMED: 0, 'ON-THE-GO': 0 },
        timeStats: {
          TIMED: analytics.timeStats.TIMED || 0,
          UNTIMED: analytics.timeStats.UNTIMED || 0,
          'ON-THE-GO': analytics.timeStats['ON-THE-GO'] || 0
        }
      },
      timeBreakdown: {
        totalTimeSpent,
        timePerQuestionStats: analytics.timePerQuestionStats
      },
      lastQuizInfo: analytics.lastQuiz,
      categoryInsights: { // Category insights
        totalCategories: analytics.categoryPerformance ? analytics.categoryPerformance.size : 0,
        strongestCategory: analytics.getStrongestCategory ? analytics.getStrongestCategory() : null,
        weakestCategory: analytics.getWeakestCategory ? analytics.getWeakestCategory() : null
      },
      timestamps: {
        accountCreated: analytics.createdAt,
        lastUpdated: analytics.lastUpdated
      },
      // BONUS: BB Points insights
      bbPointsInsights: {
        totalBBPoints: analytics.cumulativeScore,
        lastQuizBBPoints: analytics.lastQuiz?.bbPointsEarned || 0,
        exactTimedQuizzes: analytics.quizCountByMode?.TIMED || 0, // 🆕
        bbPointsSource: 'Only from TIMED mode quizzes'
      }
    };

    console.log(" Analytics overview retrieved successfully");

    res.json({
      success: true,
      message: "Analytics overview retrieved successfully",
      overview
    });

  } catch (error) {
    console.error("❌ Get analytics overview error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve analytics overview",
      error: error.message
    });
  }
});

// ENHANCED: Leaderboard route with BB Points focus
router.get("/leaderboard", authenticateToken, async (req, res) => {
  try {
    const { limit = 10, mode = 'bb-points' } = req.query;

    console.log("🏆 GET LEADERBOARD REQUEST");
    console.log("📊 Mode:", mode, "Limit:", limit);

    // Build query based on mode
    let sortField = 'cumulativeScore'; // Default sort by BB Points
    if (mode === 'accuracy') sortField = 'accuracyPercentage';
    if (mode === 'questions') sortField = 'totalQuestionsAttempted';
    if (mode === 'quizzes') sortField = 'totalQuizzesTaken';

    const leaderboard = await PerformanceAnalytics.find({})
      .populate('userId', 'email profile.firstName profile.lastName')
      .sort({ [sortField]: -1 })
      .limit(parseInt(limit))
      .select('userId totalQuizzesTaken totalQuestionsAttempted totalCorrectQuestions accuracyPercentage cumulativeScore lastQuiz timeStats quizCountByMode');

    const transformedLeaderboard = leaderboard.map((entry, index) => {
      // Calculate TIMED quiz ratio
      const totalTime = entry.timeStats.TIMED + entry.timeStats.UNTIMED + 
                       entry.timeStats['ON-THE-GO'];
      const timedRatio = totalTime > 0 ? (entry.timeStats.TIMED / totalTime) * 100 : 0;

      return {
        rank: index + 1,
        user: {
          _id: entry.userId._id,
          email: entry.userId.email,
          name: `${entry.userId.profile?.firstName || ''} ${entry.userId.profile?.lastName || ''}`.trim() || entry.userId.email.split('@')[0]
        },
        stats: {
          totalQuizzes: entry.totalQuizzesTaken,
          totalQuestions: entry.totalQuestionsAttempted,
          correctAnswers: entry.totalCorrectQuestions,
          accuracy: entry.accuracyPercentage,
          bbPoints: entry.cumulativeScore, // BB Points from TIMED mode only
          lastQuizMode: entry.lastQuiz?.quizMode || null,
          timedModePercentage: Math.round(timedRatio),
          exactTimedQuizzes: entry.quizCountByMode?.TIMED || 0 //  Exact count
        }
      };
    });

    console.log("✅ Leaderboard retrieved successfully");

    res.json({
      success: true,
      message: "Leaderboard retrieved successfully",
      leaderboard: transformedLeaderboard,
      mode,
      count: transformedLeaderboard.length,
      note: "BB Points are earned only from TIMED mode quizzes"
    });

  } catch (error) {
    console.error("❌ Get leaderboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve leaderboard",
      error: error.message
    });
  }
});

export default router;
//routes/analytics.route.js