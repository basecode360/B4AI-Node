import mongoose from "mongoose";
import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import PerformanceAnalytics from "../models/PerformanceAnalytics.js";

const router = express.Router();

// ✅ FIXED: Analytics update route - BB Points sirf TIMED mode se
router.post("/update-analytics", authenticateToken, async (req, res) => {
  try {
    const { quizMode, totalQuestions, correctAnswers, timeSpent, questionTimes } = req.body;
    const userId = req.user.userId;

    console.log("\n📊 ============ ANALYTICS UPDATE REQUEST ============");
    console.log("👤 User:", userId);
    console.log("📝 Quiz Data:", { quizMode, totalQuestions, correctAnswers, timeSpent });
    
    // ✅ CRITICAL CHECK: BB Points logic
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
    const validModes = ['TIMED', 'UNTIMED', 'TUTOR', 'ON-THE-GO'];
    if (!validModes.includes(quizMode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quiz mode. Must be one of: " + validModes.join(', ')
      });
    }

    // Validate numbers
    if (totalQuestions <= 0 || correctAnswers < 0 || correctAnswers > totalQuestions || timeSpent < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid numeric values in quiz data"
      });
    }

    // ✅ FIXED: Use updated static method with proper BB Points logic
    const updatedAnalytics = await PerformanceAnalytics.updateWithLastQuiz(userId, {
      quizMode,
      totalQuestions,
      correctAnswers,
      timeSpent,
      questionTimes: questionTimes || []
    });

    console.log("✅ ============ ANALYTICS UPDATE SUCCESSFUL ============");
    console.log("📈 Final Results:");
    console.log("   - Quiz Mode:", quizMode);
    console.log("   - Total BB Points (cumulativeScore):", updatedAnalytics.cumulativeScore);
    console.log("   - Last Quiz BB Points:", updatedAnalytics.lastQuiz.bbPointsEarned);
    console.log("   - Total Quizzes:", updatedAnalytics.totalQuizzesTaken);
    console.log("   - Accuracy:", updatedAnalytics.accuracyPercentage + "%");
    console.log("============================================\n");

    res.json({
      success: true,
      message: "Analytics updated successfully",
      analytics: {
        totalQuizzesTaken: updatedAnalytics.totalQuizzesTaken,
        totalQuestionsAttempted: updatedAnalytics.totalQuestionsAttempted,
        totalCorrectQuestions: updatedAnalytics.totalCorrectQuestions,
        accuracyPercentage: updatedAnalytics.accuracyPercentage,
        cumulativeScore: updatedAnalytics.cumulativeScore, // BB Points (sirf TIMED se)
        timeStats: updatedAnalytics.timeStats,
        timePerQuestionStats: updatedAnalytics.timePerQuestionStats,
        lastQuiz: updatedAnalytics.lastQuiz // Last quiz data (har mode save hoti hai)
      }
    });

  } catch (error) {
    console.error("❌ Analytics update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update analytics",
      error: error.message
    });
  }
});

// ✅ FIXED: Get user stats route with enhanced logging
router.get("/user-stats", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log("📊 GET USER STATS REQUEST for user:", userId);

    // Find user analytics
    const analytics = await PerformanceAnalytics.findOne({ userId });

    if (!analytics) {
      console.log("📊 No analytics found for user, returning default stats");
      return res.json({
        success: true,
        message: "No analytics data found",
        analytics: {
          totalQuizzesTaken: 0,
          totalQuestionsAttempted: 0,
          totalCorrectQuestions: 0,
          accuracyPercentage: 0,
          cumulativeScore: 0, // BB Points = 0
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
          lastQuiz: null
        }
      });
    }

    console.log("✅ User stats retrieved successfully");
    console.log("📈 Current Analytics Data:");
    console.log("   - Total Quizzes:", analytics.totalQuizzesTaken);
    console.log("   - Total BB Points (cumulativeScore):", analytics.cumulativeScore);
    console.log("   - Accuracy:", analytics.accuracyPercentage + "%");
    console.log("   - Last Quiz Mode:", analytics.lastQuiz?.quizMode || 'None');
    console.log("   - Last Quiz BB Points:", analytics.lastQuiz?.bbPointsEarned || 0);
    console.log("   - TIMED Time:", analytics.timeStats.TIMED + 's');
    console.log("   - UNTIMED Time:", analytics.timeStats.UNTIMED + 's');

    res.json({
      success: true,
      message: "User stats retrieved successfully",
      analytics: {
        totalQuizzesTaken: analytics.totalQuizzesTaken,
        totalQuestionsAttempted: analytics.totalQuestionsAttempted,
        totalCorrectQuestions: analytics.totalCorrectQuestions,
        accuracyPercentage: analytics.accuracyPercentage,
        cumulativeScore: analytics.cumulativeScore, // BB Points (sirf TIMED se)
        timeStats: analytics.timeStats,
        timePerQuestionStats: analytics.timePerQuestionStats,
        lastQuiz: analytics.lastQuiz // Last quiz data
      }
    });

  } catch (error) {
    console.error("❌ Get user stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user stats",
      error: error.message
    });
  }
});

// ✅ SAME: Get last quiz details route
router.get("/last-quiz", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log("📊 GET LAST QUIZ REQUEST for user:", userId);

    const analytics = await PerformanceAnalytics.findOne({ userId }).select('lastQuiz');

    if (!analytics || !analytics.lastQuiz) {
      return res.json({
        success: true,
        message: "No last quiz data found",
        lastQuiz: null
      });
    }

    console.log("✅ Last quiz data retrieved:");
    console.log("   - Mode:", analytics.lastQuiz.quizMode);
    console.log("   - BB Points:", analytics.lastQuiz.bbPointsEarned);
    console.log("   - Accuracy:", analytics.lastQuiz.accuracy + "%");

    res.json({
      success: true,
      message: "Last quiz data retrieved successfully",
      lastQuiz: analytics.lastQuiz
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

// ✅ ENHANCED: BB Points summary route with better calculations
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

    // ✅ BETTER: Calculate timed quiz count from total time and average time
    const totalTime = analytics.timeStats.TIMED + 
                     analytics.timeStats.UNTIMED + 
                     analytics.timeStats.TUTOR + 
                     analytics.timeStats['ON-THE-GO'];
    
    const timedRatio = totalTime > 0 ? analytics.timeStats.TIMED / totalTime : 0;
    const estimatedTimedQuizzes = Math.round(analytics.totalQuizzesTaken * timedRatio);

    const bbPointsSummary = {
      totalBBPoints: analytics.cumulativeScore, // Total BB Points (sirf TIMED se)
      lastQuizBBPoints: analytics.lastQuiz?.bbPointsEarned || 0,
      timedQuizCount: estimatedTimedQuizzes,
      averageBBPointsPerQuiz: estimatedTimedQuizzes > 0 ? 
        Math.round(analytics.cumulativeScore / estimatedTimedQuizzes) : 0,
      // ✅ BONUS: Additional insights
      timedTimePercentage: Math.round(timedRatio * 100),
      lastQuizMode: analytics.lastQuiz?.quizMode || null
    };

    console.log("✅ BB Points summary retrieved:");
    console.log("   - Total BB Points:", bbPointsSummary.totalBBPoints);
    console.log("   - Last Quiz BB Points:", bbPointsSummary.lastQuizBBPoints);
    console.log("   - Estimated TIMED Quizzes:", bbPointsSummary.timedQuizCount);
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

// ✅ NEW: Verify BB Points source - Debug endpoint
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
                          analytics.timeStats.TUTOR + 
                          analytics.timeStats['ON-THE-GO'];

    const timedRatio = totalTimeSpent > 0 ? (analytics.timeStats.TIMED / totalTimeSpent) * 100 : 0;

    const verification = {
      cumulativeScore: analytics.cumulativeScore,
      timeStats: analytics.timeStats,
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

    console.log("✅ BB Points verification completed:");
    console.log("   - Cumulative Score:", verification.cumulativeScore);
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

// ✅ ENHANCED: Reset analytics route with confirmation
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

    console.log("✅ Analytics data reset successfully");

    res.json({
      success: true,
      message: "Analytics data reset successfully! Start fresh with TIMED mode testing.",
      note: "Take TIMED quizzes to earn BB Points (cumulativeScore)"
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

// ✅ SAME: Analytics overview route
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
                          analytics.timeStats.TUTOR + 
                          analytics.timeStats['ON-THE-GO'];

    const incorrectQuestions = analytics.totalQuestionsAttempted - analytics.totalCorrectQuestions;

    const overview = {
      basicStats: {
        totalQuizzesTaken: analytics.totalQuizzesTaken,
        totalQuestionsAttempted: analytics.totalQuestionsAttempted,
        totalCorrectQuestions: analytics.totalCorrectQuestions,
        incorrectQuestions,
        accuracyPercentage: analytics.accuracyPercentage,
        cumulativeScore: analytics.cumulativeScore // BB Points
      },
      timeBreakdown: {
        totalTimeSpent,
        timeStats: analytics.timeStats,
        timePerQuestionStats: analytics.timePerQuestionStats
      },
      lastQuizInfo: analytics.lastQuiz,
      timestamps: {
        accountCreated: analytics.createdAt,
        lastUpdated: analytics.lastUpdated
      },
      // ✅ BONUS: BB Points insights
      bbPointsInsights: {
        totalBBPoints: analytics.cumulativeScore,
        lastQuizBBPoints: analytics.lastQuiz?.bbPointsEarned || 0,
        bbPointsSource: 'Only from TIMED mode quizzes'
      }
    };

    console.log("✅ Analytics overview retrieved successfully");

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

// ✅ ENHANCED: Leaderboard route with BB Points focus
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
      .select('userId totalQuizzesTaken totalQuestionsAttempted totalCorrectQuestions accuracyPercentage cumulativeScore lastQuiz timeStats');

    const transformedLeaderboard = leaderboard.map((entry, index) => {
      // Calculate TIMED quiz ratio
      const totalTime = entry.timeStats.TIMED + entry.timeStats.UNTIMED + 
                       entry.timeStats.TUTOR + entry.timeStats['ON-THE-GO'];
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
          timedModePercentage: Math.round(timedRatio)
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
