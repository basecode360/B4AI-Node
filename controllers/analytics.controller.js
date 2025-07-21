import PerformanceAnalytics from "../models/PerformanceAnalytics.js";
import { userModel } from "../models/userModel.js";

// Helper function to validate quiz data
const validateQuizData = (data) => {
  const errors = [];
  
  if (!data.quizMode) errors.push('Quiz mode is required');
  if (!data.totalQuestions || data.totalQuestions < 1) errors.push('Total questions must be at least 1');
  if (data.correctAnswers === undefined || data.correctAnswers < 0) errors.push('Correct answers is required');
  if (data.correctAnswers > data.totalQuestions) errors.push('Correct answers cannot exceed total questions');
  if (!data.timeSpent || data.timeSpent < 0) errors.push('Time spent must be positive');
  
  const validModes = ['TIMED', 'UNTIMED', 'TUTOR', 'ON-THE-GO'];
  if (data.quizMode && !validModes.includes(data.quizMode)) {
    errors.push('Invalid quiz mode');
  }
  
  return errors;
};

// Update analytics after quiz completion
export const updateAnalytics = async (req, res) => {
  try {
    console.log('📊 Analytics update request:', req.body);
    console.log('👤 User ID:', req.user?.userId);
    
    const validationErrors = validateQuizData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    const userId = req.user.userId;
    
    // Find or create analytics record
    let analytics = await PerformanceAnalytics.findOne({ userId });
    
    if (!analytics) {
      console.log('🆕 Creating new analytics record for user:', userId);
      analytics = new PerformanceAnalytics({ userId });
    }
    
    // Use the model method to update analytics
    await analytics.updateAfterQuiz(req.body);
    
    console.log('✅ Analytics successfully updated');
    
    // Return updated stats
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
};

// Get user's own stats
export const getUserStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('📈 Fetching stats for user:', userId);
    
    const analytics = await PerformanceAnalytics.findOne({ userId })
      .select('totalQuestionsAttempted totalCorrectQuestions cumulativeScore timeStats');
    
    if (!analytics) {
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
    
    return res.status(200).json({
      success: true,
      analytics: {
        totalQuestionsAttempted: analytics.totalQuestionsAttempted,
        totalCorrectQuestions: analytics.totalCorrectQuestions,
        cumulativeScore: analytics.cumulativeScore,
        timeStats: analytics.timeStats
      }
    });
    
  } catch (error) {
    console.error('❌ Get user stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve stats',
      error: error.message
    });
  }
};

// Admin: Get all users' analytics
export const getAllUsersAnalytics = async (req, res) => {
  try {
    // Check if user is admin
    const requestingUser = await userModel.findById(req.user.userId);
    if (requestingUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }
    
    // Pagination and sorting
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'lastUpdated';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    
    // Search filter
    const searchFilter = {};
    if (req.query.search) {
      // This would require text index on user collection
      searchFilter['$or'] = [
        { 'userId.email': { $regex: req.query.search, $options: 'i' } },
        { 'userId.profile.firstName': { $regex: req.query.search, $options: 'i' } },
        { 'userId.profile.lastName': { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Get total count
    const totalCount = await PerformanceAnalytics.countDocuments();
    
    // Get analytics with user details
    const analytics = await PerformanceAnalytics.find(searchFilter)
      .populate('userId', 'email profile.firstName profile.lastName role isVerified createdAt')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Transform data
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
      totalQuizzesTaken: analytic.totalQuizzesTaken,
      totalQuestionsAttempted: analytic.totalQuestionsAttempted,
      totalCorrectQuestions: analytic.totalCorrectQuestions,
      accuracyPercentage: analytic.accuracyPercentage,
      cumulativeScore: analytic.cumulativeScore,
      timeStats: analytic.timeStats,
      timePerQuestionStats: analytic.timePerQuestionStats,
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
};

// Admin: Get summary statistics
export const getAdminSummary = async (req, res) => {
  try {
    // Check admin role
    const requestingUser = await userModel.findById(req.user.userId);
    if (requestingUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }
    
    // Get date range filter if provided
    const dateFilter = {};
    if (req.query.startDate) {
      dateFilter.createdAt = { $gte: new Date(req.query.startDate) };
    }
    if (req.query.endDate) {
      dateFilter.createdAt = { 
        ...dateFilter.createdAt,
        $lte: new Date(req.query.endDate) 
      };
    }
    
    // Summary aggregation
    const summaryPipeline = [
      { $match: dateFilter },
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
          totalOnTheGoTime: { $sum: "$timeStats.ON-THE-GO" },
          avgTimePerQuestion: { $avg: "$timePerQuestionStats.averageTime" }
        }
      }
    ];
    
    const [summary] = await PerformanceAnalytics.aggregate(summaryPipeline);
    
    // Get trends data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const trendsPipeline = [
      { $match: { lastUpdated: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$lastUpdated" } },
          avgAccuracy: { $avg: "$accuracyPercentage" },
          totalQuizzes: { $sum: "$totalQuizzesTaken" },
          totalQuestions: { $sum: "$totalQuestionsAttempted" }
        }
      },
      { $sort: { _id: 1 } }
    ];
    
    const trends = await PerformanceAnalytics.aggregate(trendsPipeline);
    
    // Get performance distribution
    const performanceDistribution = await PerformanceAnalytics.aggregate([
      {
        $bucket: {
          groupBy: "$accuracyPercentage",
          boundaries: [0, 20, 40, 60, 80, 100],
          default: "Other",
          output: {
            count: { $sum: 1 },
            users: { $push: "$userId" }
          }
        }
      }
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
        averageTimePerQuestion: parseFloat((summary?.avgTimePerQuestion || 0).toFixed(2)),
        modeTimeDistribution: {
          totalTimedTime: summary?.totalTimedTime || 0,
          totalUntimedTime: summary?.totalUntimedTime || 0,
          totalTutorTime: summary?.totalTutorTime || 0,
          totalOnTheGoTime: summary?.totalOnTheGoTime || 0
        },
        trends,
        performanceDistribution
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
};

// Admin: Export analytics data
export const exportAnalytics = async (req, res) => {
  try {
    // Check admin role
    const requestingUser = await userModel.findById(req.user.userId);
    if (requestingUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }
    
    const format = req.query.format || 'json';
    
    // Get all analytics data
    const analytics = await PerformanceAnalytics.find({})
      .populate('userId', 'email profile.firstName profile.lastName')
      .lean();
    
    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = [
        'User Email',
        'User Name',
        'Total Quizzes',
        'Questions Attempted',
        'Correct Answers',
        'Accuracy %',
        'Cumulative Score',
        'Time in TIMED',
        'Time in UNTIMED',
        'Time in TUTOR',
        'Time in ON-THE-GO',
        'Avg Time per Question',
        'Last Updated'
      ].join(',');
      
      const csvRows = analytics.map(a => [
        a.userId?.email || '',
        `${a.userId?.profile?.firstName || ''} ${a.userId?.profile?.lastName || ''}`.trim(),
        a.totalQuizzesTaken,
        a.totalQuestionsAttempted,
        a.totalCorrectQuestions,
        a.accuracyPercentage,
        a.cumulativeScore,
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
      data: analytics
    });
    
  } catch (error) {
    console.error('❌ Export error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export analytics',
      error: error.message
    });
  }
};