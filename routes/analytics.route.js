import express from "express";
import PerformanceAnalytics from "../models/PerformanceAnalytics.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { userModel } from "../models/userModel.js";

const router = express.Router();

// 📊 Quiz complete hone par analytics update karo
router.post('/update-analytics', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Analytics update request aaya:', req.body);
    console.log('👤 User ID:', req.user?.userId);
    
    const {
      quizMode,
      totalQuestions,
      correctAnswers,
      timeSpent,
      questionTimes
    } = req.body;
    
    const userId = req.user.userId;
    
    // Validation
    if (!quizMode || !totalQuestions || correctAnswers === undefined || !timeSpent) {
      return res.status(400).json({
        success: false,
        message: 'Required fields missing: quizMode, totalQuestions, correctAnswers, timeSpent'
      });
    }
    
    // User ka analytics record dhundo ya banao
    let analytics = await PerformanceAnalytics.findOne({ userId });
    
    if (!analytics) {
      console.log('🆕 Naya analytics record bana rahe hain user ke liye:', userId);
      analytics = new PerformanceAnalytics({ userId });
    }
    
    // Basic stats update karo
    analytics.totalQuizzesTaken += 1;
    analytics.totalQuestionsAttempted += totalQuestions;
    analytics.totalCorrectQuestions += correctAnswers;
    analytics.cumulativeScore += Math.round((correctAnswers / totalQuestions) * 100);
    
    // Mode ke hisab se time update karo
    if (!analytics.timeStats) {
      analytics.timeStats = {
        TIMED: 0,
        UNTIMED: 0,
        TUTOR: 0,
        'ON-THE-GO': 0
      };
    }
    analytics.timeStats[quizMode] = (analytics.timeStats[quizMode] || 0) + timeSpent;
    
    // Time per question stats update karo
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
    
    await analytics.save();
    console.log('✅ Analytics successfully save ho gaya');
    
    return res.status(200).json({
      success: true,
      message: 'Analytics update ho gaya successfully!',
      analytics: {
        totalQuestionsAttempted: analytics.totalQuestionsAttempted,
        totalCorrectQuestions: analytics.totalCorrectQuestions,
        accuracyPercentage: analytics.accuracyPercentage,
        cumulativeScore: analytics.cumulativeScore,
        timeStats: analytics.timeStats
      }
    });
    
  } catch (error) {
    console.error('❌ Analytics update error:', error);
    return res.status(500).json({
      success: false,
      message: 'Analytics update fail ho gaya',
      error: error.message
    });
  }
});

// 📱 User ke stats laao (Expo App ke liye) - 4 points jo user ko show karne hain
router.get('/user-stats', authenticateToken, async (req, res) => {
  try {
    console.log('📈 User stats request aaya for user:', req.user.userId);
    
    const userId = req.user.userId;
    
    const analytics = await PerformanceAnalytics.findOne({ userId });
    
    if (!analytics) {
      console.log('📊 User ka koi analytics data nahi mila, default data bhej rahe hain');
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
    
    console.log('✅ User stats mil gaye');
    
    return res.status(200).json({
      success: true,
      analytics: {
        // 4 main points jo user ko show karne hain
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
      message: 'Stats nahi mil rahe',
      error: error.message
    });
  }
});

// 🔧 Admin Dashboard ke liye sab users ka complete data - 7 points
router.get('/admin/all-stats', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 Admin stats request aaya');
    console.log('👤 Requested by user:', req.user?.userId);
    
    // Get all analytics with user details
    const analytics = await PerformanceAnalytics.find({})
      .populate('userId', 'email profile.firstName profile.lastName role')
      .sort({ lastUpdated: -1 });
    
    console.log('✅ Admin stats mil gaye:', analytics.length, 'users ka data');
    
    // Transform data for admin dashboard
    const transformedAnalytics = analytics.map(analytic => ({
      _id: analytic._id,
      user: analytic.userId ? {
        _id: analytic.userId._id,
        email: analytic.userId.email,
        name: `${analytic.userId.profile?.firstName || ''} ${analytic.userId.profile?.lastName || ''}`.trim() || 'No Name',
        role: analytic.userId.role
      } : null,
      // All 7 points for admin
      totalQuizzesTaken: analytic.totalQuizzesTaken,
      totalQuestionsAttempted: analytic.totalQuestionsAttempted,
      totalCorrectQuestions: analytic.totalCorrectQuestions,
      accuracyPercentage: analytic.accuracyPercentage,
      cumulativeScore: analytic.cumulativeScore,
      timeStats: analytic.timeStats,
      timePerQuestionStats: analytic.timePerQuestionStats,
      lastUpdated: analytic.lastUpdated,
      createdAt: analytic.createdAt
    }));
    
    return res.status(200).json({
      success: true,
      analytics: transformedAnalytics,
      count: transformedAnalytics.length
    });
    
  } catch (error) {
    console.error('❌ Admin analytics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Admin stats nahi mil rahe',
      error: error.message
    });
  }
});

// 📊 Admin Dashboard Summary Stats
router.get('/admin/summary', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Admin summary stats request');
    
    // Total users with analytics
    const totalUsersWithAnalytics = await PerformanceAnalytics.countDocuments();
    
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
    
    return res.status(200).json({
      success: true,
      summary: {
        totalUsersWithAnalytics,
        totalQuizzesTaken: totalQuizzesTaken[0]?.total || 0,
        totalQuestionsAttempted: totalQuestionsAttempted[0]?.total || 0,
        averageAccuracy: Math.round(averageAccuracy[0]?.avgAccuracy || 0),
        modeTimeDistribution: modeTimeStats[0] || {
          totalTimedTime: 0,
          totalUntimedTime: 0,
          totalTutorTime: 0,
          totalOnTheGoTime: 0
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Admin summary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Summary stats nahi mil rahe',
      error: error.message
    });
  }
});

export default router;
