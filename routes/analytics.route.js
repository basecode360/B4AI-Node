import express from "express";
import PerformanceAnalytics from "../models/PerformanceAnalytics.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { userModel } from "../models/userModel.js";

const router = express.Router();

// 📊 Update analytics after quiz completion
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
      difficulty
    } = req.body;
    
    const userId = req.user.userId;
    
    // Validation
    if (!quizMode || !totalQuestions || correctAnswers === undefined || !timeSpent) {
      return res.status(400).json({
        success: false,
        message: 'Required fields missing: quizMode, totalQuestions, correctAnswers, timeSpent'
      });
    }
    
    // Validate quiz mode
    const validModes = ['TIMED', 'UNTIMED', 'TUTOR', 'ON-THE-GO'];
    if (!validModes.includes(quizMode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid quiz mode. Must be: TIMED, UNTIMED, TUTOR, or ON-THE-GO'
      });
    }
    
    // Find or create analytics record
    let analytics = await PerformanceAnalytics.findOne({ userId });
    
    if (!analytics) {
      console.log('🆕 Creating new analytics record for user:', userId);
      analytics = new PerformanceAnalytics({ userId });
    }
    
    // Use the model method to update analytics
    await analytics.updateAfterQuiz({
      quizMode,
      totalQuestions,
      correctAnswers,
      timeSpent,
      questionTimes,
      bbPointsEarned,
      category,
      difficulty
    });
    
    console.log('✅ Analytics successfully updated');
    
    return res.status(200).json({
      success: true,
      message: 'Analytics updated successfully!',
      analytics: {
        totalQuestionsAttempted: analytics.totalQuestionsAttempted,
        totalCorrectQuestions: analytics.totalCorrectQuestions,
        accuracyPercentage: analytics.accuracyPercentage,
        cumulativeScore: analytics.cumulativeScore,
        timeStats: analytics.timeStats,
        lastQuiz: analytics.lastQuiz
      }
    });
    
  } catch (error) {
    console.error('❌ Analytics update error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update analytics',
      error: error.message
    });
  }
});

// 📱 Get user stats (for mobile app) - 4 main points
router.get('/user-stats', authenticateToken, async (req, res) => {
  try {
    console.log('📈 User stats request for user:', req.user.userId);
    
    const userId = req.user.userId;
    
    const analytics = await PerformanceAnalytics.findOne({ userId });
    
    if (!analytics) {
      console.log('📊 No analytics data found, returning default values');
      return res.status(200).json({
        success: true,
        analytics: {
          totalQuestionsAttempted: 0,
          totalCorrectQuestions: 0,
          cumulativeScore: 0,
          timeStats: {
            TIMED: 0,
            UNTIMED: 0,
            TUTOR: 0,
            'ON-THE-GO': 0
          }
        }
      });
    }
    
    console.log('✅ User stats retrieved');
    
    return res.status(200).json({
      success: true,
      analytics: {
        // 4 main points for user display
        totalQuestionsAttempted: analytics.totalQuestionsAttempted,
        totalCorrectQuestions: analytics.totalCorrectQuestions,
        cumulativeScore: analytics.cumulativeScore,
        timeStats: analytics.timeStats
      }
    });
    
  } catch (error) {
    console.error('❌ User analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve stats',
      error: error.message
    });
  }
});

// 🔧 Admin: Get all users' analytics with detailed info
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
    
    console.log(`✅ Found ${analytics.length} analytics records`);
    
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
      // All 7 points for admin
      totalQuizzesTaken: analytic.totalQuizzesTaken,
      totalQuestionsAttempted: analytic.totalQuestionsAttempted,
      totalCorrectQuestions: analytic.totalCorrectQuestions,
      accuracyPercentage: analytic.accuracyPercentage,
      cumulativeScore: analytic.cumulativeScore,
      timeStats: analytic.timeStats,
      timePerQuestionStats: analytic.timePerQuestionStats,
      lastQuiz: analytic.lastQuiz,
      categoryPerformance: analytic.categoryPerformance ? 
        Object.fromEntries(analytic.categoryPerformance) : {},
      difficultyPerformance: analytic.difficultyPerformance,
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
      }
    });
    
  } catch (error) {
    console.error('❌ Admin analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin stats',
      error: error.message
    });
  }
});

// 📊 Admin: Get summary statistics
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
          avgAccuracy: { $avg: "$accuracyPercentage" },
          avgCumulativeScore: { $avg: "$cumulativeScore" },
          totalTimedTime: { $sum: "$timeStats.TIMED" },
          totalUntimedTime: { $sum: "$timeStats.UNTIMED" },
          totalTutorTime: { $sum: "$timeStats.TUTOR" },
          totalOnTheGoTime: { $sum: "$timeStats.ON-THE-GO" }
        }
      }
    ];
    
    const [summary] = await PerformanceAnalytics.aggregate(summaryPipeline);
    
    // Get top performers
    const topPerformers = await PerformanceAnalytics.find({})
      .populate('userId', 'email profile.firstName profile.lastName')
      .sort({ accuracyPercentage: -1 })
      .limit(5)
      .lean();
    
    // Get most active users
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
          avgAccuracy: { $avg: "$categoryPerformance.v.accuracy" }
        }
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { totalAttempted: -1 } }
    ]);
    
    return res.status(200).json({
      success: true,
      summary: {
        totalUsersWithAnalytics: summary?.totalUsers || 0,
        totalQuizzesTaken: summary?.totalQuizzesTaken || 0,
        totalQuestionsAttempted: summary?.totalQuestionsAttempted || 0,
        totalCorrectQuestions: summary?.totalCorrectQuestions || 0,
        averageAccuracy: Math.round(summary?.avgAccuracy || 0),
        averageCumulativeScore: Math.round(summary?.avgCumulativeScore || 0),
        modeTimeDistribution: {
          totalTimedTime: summary?.totalTimedTime || 0,
          totalUntimedTime: summary?.totalUntimedTime || 0,
          totalTutorTime: summary?.totalTutorTime || 0,
          totalOnTheGoTime: summary?.totalOnTheGoTime || 0
        },
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
        categoryStats
      }
    });
    
  } catch (error) {
    console.error('❌ Admin summary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve summary stats',
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
          timeStats: analytics.timeStats,
          timePerQuestionStats: analytics.timePerQuestionStats
        },
        lastQuiz: analytics.lastQuiz,
        categoryPerformance: analytics.categoryPerformance ? 
          Object.fromEntries(analytics.categoryPerformance) : {},
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
    
    console.log('✅ Analytics reset successfully');
    
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

export default router;