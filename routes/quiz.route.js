
import mongoose from "mongoose";

import express from "express";
import { addCategory, addQuestion, getQuestion } from "../controllers/quiz-controller.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { Quiz } from "../models/quizModel.js"; // ✅ Correct import
import { userModel } from "../models/userModel.js";
import { StudentQuiz } from "../models/studentQuizModel.js";
import PerformanceAnalytics from "../models/PerformanceAnalytics.js";

const router = express.Router();

// Existing routes
router.post("/add-question", addQuestion);
router.put("/add-category/:questionId", addCategory);
router.get("/get-question", authenticateToken, getQuestion);

// ✅ GET ALL QUIZZES - Admin Management
router.get("/manage-quizzes", authenticateToken, async (req, res) => {
  try {
    console.log("📋 Fetching all quizzes for management...");
    console.log("🔍 Requested by user:", req.user?.userId);

    // Fetch all quizzes with user information
    const quizzes = await Quiz.find({})
      .populate('userId', 'email profile.firstName profile.lastName role')
      .sort({ createdAt: -1 }); // Latest first

    console.log(`📊 Found ${quizzes.length} quizzes in database`);

    // Transform data for frontend
    const transformedQuizzes = quizzes.map(quiz => ({
      _id: quiz._id,
      question: quiz.question,
      options: quiz.options,
      correctAnswer: quiz.correctAnswer,
      category: quiz.category,
      subCategory: quiz.subCategory,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
      creator: quiz.userId ? {
        _id: quiz.userId._id,
        email: quiz.userId.email,
        name: `${quiz.userId.profile?.firstName || ''} ${quiz.userId.profile?.lastName || ''}`.trim() || quiz.userId.email.split('@')[0],
        role: quiz.userId.role
      } : null
    }));

    res.json({
      success: true,
      message: "Quizzes fetched successfully",
      quizzes: transformedQuizzes,
      count: transformedQuizzes.length
    });

  } catch (error) {
    console.error("❌ Fetch quizzes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch quizzes",
      error: error.message
    });
  }
});

// ✅ CREATE NEW QUIZ ENDPOINT
router.post("/manage-quizzes", authenticateToken, async (req, res) => {
  try {
    const { question, options, correctAnswer, category, subCategory } = req.body;

    console.log("➕ CREATE QUIZ REQUEST");
    console.log("📝 Quiz data:", { question, options, correctAnswer, category, subCategory });
    console.log("🔍 Created by user:", req.user?.userId);

    // Validation
    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question is required"
      });
    }

    if (!options || !Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({
        success: false,
        message: "Exactly 4 options are required"
      });
    }

    // Check if all options have content
    if (options.some(option => !option || !option.trim())) {
      return res.status(400).json({
        success: false,
        message: "All options must have content"
      });
    }

    // Validate correct answer index
    const correctIndex = parseInt(correctAnswer);
    if (isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) {
      return res.status(400).json({
        success: false,
        message: "Correct answer must be between 0 and 3"
      });
    }

    // Create new quiz object
    const newQuizData = {
      userId: req.user.userId,
      question: question.trim(),
      options: options.map(option => option.trim()),
      correctAnswer: correctIndex,
      category: category?.trim() || null,
      subCategory: subCategory?.trim() || null
    };

    console.log("📋 Final quiz data to save:", newQuizData);

    // Save to database using Quiz model
    const newQuiz = new Quiz(newQuizData);
    const savedQuiz = await newQuiz.save();

    // Populate user data for response
    const populatedQuiz = await Quiz.findById(savedQuiz._id)
      .populate('userId', 'email profile.firstName profile.lastName role');

    console.log("✅ Quiz created successfully:", populatedQuiz._id);

    // Transform response
    const transformedQuiz = {
      _id: populatedQuiz._id,
      question: populatedQuiz.question,
      options: populatedQuiz.options,
      correctAnswer: populatedQuiz.correctAnswer,
      category: populatedQuiz.category,
      subCategory: populatedQuiz.subCategory,
      createdAt: populatedQuiz.createdAt,
      updatedAt: populatedQuiz.updatedAt,
      creator: populatedQuiz.userId ? {
        _id: populatedQuiz.userId._id,
        email: populatedQuiz.userId.email,
        name: `${populatedQuiz.userId.profile?.firstName || ''} ${populatedQuiz.userId.profile?.lastName || ''}`.trim() || populatedQuiz.userId.email.split('@')[0],
        role: populatedQuiz.userId.role
      } : null
    };

    res.status(201).json({
      success: true,
      message: "Quiz created successfully",
      quiz: transformedQuiz
    });

  } catch (error) {
    console.error("❌ CREATE QUIZ ERROR:", error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create quiz",
      error: error.message
    });
  }
});

// ✅ UPDATE EXISTING QUIZ ROUTES FOR BULK OPERATIONS

// BULK UPDATE CATEGORIES FOR ADMIN QUIZZES
router.put("/manage-quizzes/bulk-category", authenticateToken, async (req, res) => {
  try {
    const { quizIds, category, subCategory } = req.body;

    console.log("📂 BULK CATEGORY UPDATE REQUEST");
    console.log("📝 Quiz IDs:", quizIds);
    console.log("🔍 New Category:", { category, subCategory });

    if (!quizIds || !Array.isArray(quizIds) || quizIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Quiz IDs are required"
      });
    }

    // Perform bulk category update
    const result = await Quiz.bulkUpdateCategory(quizIds, category, subCategory);

    console.log("📂 Bulk category update completed:", result);

    res.json({
      success: true,
      message: `${result.modifiedCount} quizzes updated successfully`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error("❌ Bulk category update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update quiz categories",
      error: error.message
    });
  }
});

// BULK DELETE ADMIN QUIZZES
router.delete("/manage-quizzes/bulk-delete", authenticateToken, async (req, res) => {
  try {
    const { quizIds } = req.body;
    console.log("🗑️ BULK DELETE ADMIN QUIZZES REQUEST");
    console.log("📝 Quiz IDs:", quizIds);
    console.log("🔍 Requested by:", req.user?.userId);

    if (!quizIds || !Array.isArray(quizIds) || quizIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Quiz IDs are required"
      });
    }
    // ✅ ALSO FIX: Use 'new' with ObjectId constructor
    const objectIds = quizIds.map(id => new mongoose.Types.ObjectId(id));

    // Perform bulk deletion
    const result = await Quiz.deleteMany({ _id: { $in: objectIds } });

    console.log("🗑️ Bulk deletion completed:", result);

    res.json({
      success: true,
      message: `${result.deletedCount} quizzes deleted successfully`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error("❌ Bulk delete error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete quizzes",
      error: error.message
    });
  }
});

// ✅ DELETE QUIZ BY ID
router.delete("/manage-quizzes/:quizId", authenticateToken, async (req, res) => {
  try {
    const { quizId } = req.params;
    console.log("🗑️ DELETE QUIZ REQUEST - Quiz ID:", quizId);
    console.log("🔍 Requested by user:", req.user?.userId);

    // Find and delete quiz
    const quizToDelete = await Quiz.findById(quizId);

    if (!quizToDelete) {
      console.log("❌ Quiz not found:", quizId);
      return res.status(404).json({
        success: false,
        message: "Quiz not found"
      });
    }

    console.log("✅ Quiz found for deletion:", {
      id: quizToDelete._id,
      question: quizToDelete.question.substring(0, 50) + '...',
      creator: quizToDelete.userId
    });

    // Delete the quiz
    await Quiz.findByIdAndDelete(quizId);

    console.log("✅ Quiz deleted successfully");

    res.json({
      success: true,
      message: "Quiz deleted successfully",
      deletedQuiz: {
        _id: quizToDelete._id,
        question: quizToDelete.question
      }
    });

  } catch (error) {
    console.error("❌ DELETE QUIZ ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete quiz",
      error: error.message
    });
  }
});

// ✅ UPDATE QUIZ BY ID
router.put("/manage-quizzes/:quizId", authenticateToken, async (req, res) => {
  try {
    const { quizId } = req.params;
    const updateData = req.body;

    console.log("✏️ UPDATE QUIZ REQUEST - Quiz ID:", quizId);
    console.log("📝 Update data:", updateData);
    console.log("🔍 Requested by user:", req.user?.userId);

    // Find quiz first
    const existingQuiz = await Quiz.findById(quizId);

    if (!existingQuiz) {
      console.log("❌ Quiz not found:", quizId);
      return res.status(404).json({
        success: false,
        message: "Quiz not found"
      });
    }

    console.log("✅ Quiz found for update");

    // Prepare update object
    const updateFields = {
      updatedAt: new Date()
    };

    // Handle question update
    if (updateData.question) {
      updateFields.question = updateData.question.trim();
    }

    // Handle options update
    if (updateData.options && Array.isArray(updateData.options)) {
      // Validate that we have exactly 4 options
      if (updateData.options.length !== 4) {
        return res.status(400).json({
          success: false,
          message: "Quiz must have exactly 4 options"
        });
      }
      updateFields.options = updateData.options;
    }

    // Handle correct answer update
    if (updateData.correctAnswer !== undefined) {
      const correctIndex = parseInt(updateData.correctAnswer);
      if (correctIndex < 0 || correctIndex > 3) {
        return res.status(400).json({
          success: false,
          message: "Correct answer index must be between 0 and 3"
        });
      }
      updateFields.correctAnswer = correctIndex;
    }

    // Handle category updates
    if (updateData.category !== undefined) {
      updateFields.category = updateData.category;
    }

    if (updateData.subCategory !== undefined) {
      updateFields.subCategory = updateData.subCategory;
    }

    console.log("📋 Final update fields:", updateFields);

    // Update quiz in database
    const updatedQuiz = await Quiz.findByIdAndUpdate(
      quizId,
      { $set: updateFields },
      {
        new: true,
        runValidators: true
      }
    ).populate('userId', 'email profile.firstName profile.lastName role');

    console.log("✅ Quiz updated successfully");

    // Transform response
    const transformedQuiz = {
      _id: updatedQuiz._id,
      question: updatedQuiz.question,
      options: updatedQuiz.options,
      correctAnswer: updatedQuiz.correctAnswer,
      category: updatedQuiz.category,
      subCategory: updatedQuiz.subCategory,
      createdAt: updatedQuiz.createdAt,
      updatedAt: updatedQuiz.updatedAt,
      creator: updatedQuiz.userId ? {
        _id: updatedQuiz.userId._id,
        email: updatedQuiz.userId.email,
        name: `${updatedQuiz.userId.profile?.firstName || ''} ${updatedQuiz.userId.profile?.lastName || ''}`.trim() || updatedQuiz.userId.email.split('@')[0],
        role: updatedQuiz.userId.role
      } : null
    };

    res.json({
      success: true,
      message: "Quiz updated successfully",
      quiz: transformedQuiz
    });

  } catch (error) {
    console.error("❌ UPDATE QUIZ ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update quiz",
      error: error.message
    });
  }
});

// ✅ GET SINGLE QUIZ BY ID
router.get("/manage-quizzes/:quizId", authenticateToken, async (req, res) => {
  try {
    const { quizId } = req.params;
    console.log("👁️ GET QUIZ REQUEST - Quiz ID:", quizId);

    // Find quiz by ID
    const quiz = await Quiz.findById(quizId)
      .populate('userId', 'email profile.firstName profile.lastName role');

    if (!quiz) {
      console.log("❌ Quiz not found:", quizId);
      return res.status(404).json({
        success: false,
        message: "Quiz not found"
      });
    }

    console.log("✅ Quiz details fetched successfully");

    // Transform response
    const transformedQuiz = {
      _id: quiz._id,
      question: quiz.question,
      options: quiz.options,
      correctAnswer: quiz.correctAnswer,
      category: quiz.category,
      subCategory: quiz.subCategory,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
      creator: quiz.userId ? {
        _id: quiz.userId._id,
        email: quiz.userId.email,
        name: `${quiz.userId.profile?.firstName || ''} ${quiz.userId.profile?.lastName || ''}`.trim() || quiz.userId.email.split('@')[0],
        role: quiz.userId.role
      } : null
    };

    res.json({
      success: true,
      message: "Quiz details retrieved successfully",
      data: {
        quiz: transformedQuiz
      }
    });

  } catch (error) {
    console.error("❌ GET QUIZ ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get quiz details",
      error: error.message
    });
  }
});

// ✅ STUDENT QUIZ SUBMISSION ROUTES

// GET ALL STUDENT SUBMISSIONS (Admin View)
router.get("/student-submissions", authenticateToken, async (req, res) => {
  try {
    const { status, category, language, page = 1, limit = 20 } = req.query;

    console.log("📋 Fetching student quiz submissions...");
    console.log("🔍 Filters:", { status, category, language });

    // Build filter query
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (category && category !== 'all') filter.category = category;
    if (language && language !== 'all') filter.language = language;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch submissions with pagination
    const submissions = await StudentQuiz.find(filter)
      .populate('userId', 'email profile.firstName profile.lastName role')
      .populate('moderatedBy', 'email profile.firstName profile.lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalCount = await StudentQuiz.countDocuments(filter);

    console.log(`📊 Found ${submissions.length} submissions (${totalCount} total)`);

    // Transform data
    const transformedSubmissions = submissions.map(submission => ({
      _id: submission._id,
      question: submission.question,
      options: submission.options,
      correctAnswer: submission.correctAnswer,
      category: submission.category,
      subCategory: submission.subCategory,
      language: submission.language,
      difficulty: submission.difficulty,
      status: submission.status,
      moderationNotes: submission.moderationNotes,
      submissionSource: submission.submissionSource,
      qualityScore: submission.qualityScore,
      reportCount: submission.reportCount,
      viewCount: submission.viewCount,
      tags: submission.tags,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      moderatedAt: submission.moderatedAt,
      submitter: submission.userId ? {
        _id: submission.userId._id,
        email: submission.userId.email,
        name: `${submission.userId.profile?.firstName || ''} ${submission.userId.profile?.lastName || ''}`.trim() || submission.userId.email.split('@')[0],
        role: submission.userId.role
      } : null,
      moderator: submission.moderatedBy ? {
        _id: submission.moderatedBy._id,
        email: submission.moderatedBy.email,
        name: `${submission.moderatedBy.profile?.firstName || ''} ${submission.moderatedBy.profile?.lastName || ''}`.trim() || submission.moderatedBy.email.split('@')[0]
      } : null
    }));

    res.json({
      success: true,
      message: "Student submissions fetched successfully",
      submissions: transformedSubmissions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalItems: totalCount,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error("❌ Fetch student submissions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch student submissions",
      error: error.message
    });
  }
});

// BULK APPROVE STUDENT SUBMISSIONS
router.put("/student-submissions/bulk-approve", authenticateToken, async (req, res) => {
  try {
    const { submissionIds, notes = '' } = req.body;

    console.log("✅ BULK APPROVE REQUEST");
    console.log("📝 Submission IDs:", submissionIds);
    console.log("🔍 Moderator:", req.user?.userId);

    if (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Submission IDs are required"
      });
    }

    // Perform bulk approval
    const result = await StudentQuiz.bulkUpdateStatus(
      submissionIds,
      'approved',
      req.user.userId,
      notes
    );

    console.log("✅ Bulk approval completed:", result);

    res.json({
      success: true,
      message: `${result.modifiedCount} submissions approved successfully`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error("❌ Bulk approve error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve submissions",
      error: error.message
    });
  }
});

// BULK REJECT STUDENT SUBMISSIONS
router.put("/student-submissions/bulk-reject", authenticateToken, async (req, res) => {
  try {
    const { submissionIds, notes = '' } = req.body;

    console.log("❌ BULK REJECT REQUEST");
    console.log("📝 Submission IDs:", submissionIds);
    console.log("🔍 Moderator:", req.user?.userId);

    if (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Submission IDs are required"
      });
    }

    // Perform bulk rejection
    const result = await StudentQuiz.bulkUpdateStatus(
      submissionIds,
      'rejected',
      req.user.userId,
      notes
    );

    console.log("❌ Bulk rejection completed:", result);

    res.json({
      success: true,
      message: `${result.modifiedCount} submissions rejected successfully`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error("❌ Bulk reject error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject submissions",
      error: error.message
    });
  }
});

// BULK DELETE STUDENT SUBMISSIONS
router.delete("/student-submissions/bulk-delete", authenticateToken, async (req, res) => {
  try {
    const { submissionIds } = req.body;

    console.log("🗑️ BULK DELETE REQUEST");
    console.log("📝 Submission IDs:", submissionIds);
    console.log("🔍 Requested by:", req.user?.userId);

    if (!submissionIds || !Array.isArray(submissionIds) || submissionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Submission IDs are required"
      });
    }

    // Perform bulk deletion
    const result = await StudentQuiz.bulkDelete(submissionIds);

    console.log("🗑️ Bulk deletion completed:", result);

    res.json({
      success: true,
      message: `${result.deletedCount} submissions deleted successfully`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error("❌ Bulk delete error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete submissions",
      error: error.message
    });
  }
});

// GET MODERATION STATISTICS
router.get("/student-submissions/stats", authenticateToken, async (req, res) => {
  try {
    console.log("📊 Fetching moderation statistics...");

    // Get status distribution
    const statusStats = await StudentQuiz.getModerationStats();

    // Get category/language distribution
    const categoryStats = await StudentQuiz.aggregate([
      {
        $group: {
          _id: {
            category: "$category",
            language: "$language"
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent activity
    const recentActivity = await StudentQuiz.find()
      .populate('moderatedBy', 'profile.firstName profile.lastName email')
      .sort({ moderatedAt: -1 })
      .limit(10)
      .select('question status moderatedBy moderatedAt moderationNotes');

    // Get submissions by submitter
    const submitterStats = await StudentQuiz.aggregate([
      {
        $group: {
          _id: "$userId",
          totalSubmissions: { $sum: 1 },
          approvedSubmissions: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] }
          },
          rejectedSubmissions: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] }
          }
        }
      },
      { $sort: { totalSubmissions: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      message: "Moderation statistics fetched successfully",
      stats: {
        statusDistribution: statusStats,
        categoryDistribution: categoryStats,
        recentActivity: recentActivity,
        topSubmitters: submitterStats
      }
    });

  } catch (error) {
    console.error("❌ Fetch stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: error.message
    });
  }
});

// SUBMIT NEW QUIZ (For Android App)
router.post("/student-submissions", authenticateToken, async (req, res) => {
  try {
    const {
      question,
      options,
      correctAnswer,
      category,
      subCategory,
      language = 'english',
      difficulty = 'medium',
      deviceInfo,
      submissionIP
    } = req.body;

    console.log("📝 NEW STUDENT SUBMISSION");
    console.log("👤 Submitted by:", req.user?.userId);

    // Validation
    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question is required"
      });
    }

    if (!options || !Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({
        success: false,
        message: "Exactly 4 options are required"
      });
    }

    if (options.some(option => !option || !option.trim())) {
      return res.status(400).json({
        success: false,
        message: "All options must have content"
      });
    }

    const correctIndex = parseInt(correctAnswer);
    if (isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) {
      return res.status(400).json({
        success: false,
        message: "Correct answer must be between 0 and 3"
      });
    }

    // Create submission
    const submissionData = {
      userId: req.user.userId,
      question: question.trim(),
      options: options.map(option => option.trim()),
      correctAnswer: correctIndex,
      category: category?.trim() || null,
      subCategory: subCategory?.trim() || null,
      language: language,
      difficulty: difficulty,
      status: 'pending',
      submissionSource: 'android_app',
      deviceInfo: deviceInfo || null,
      submissionIP: submissionIP || req.ip
    };

    const newSubmission = new StudentQuiz(submissionData);
    const savedSubmission = await newSubmission.save();

    console.log("✅ Student submission saved:", savedSubmission._id);

    res.status(201).json({
      success: true,
      message: "Quiz submitted successfully for review",
      submissionId: savedSubmission._id
    });

  } catch (error) {
    console.error("❌ Student submission error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit quiz",
      error: error.message
    });
  }
});


// Update the existing quiz submission endpoint to include analytics
router.post("/submit-quiz", authenticateToken, async (req, res) => {
  try {
    const {
      quizId,
      quizMode,
      answers, // Array of { questionId, selectedAnswer, timeSpent }
      totalTimeSpent
    } = req.body;
    
    const userId = req.user.userId;
    
    console.log("📝 Quiz submission received:", {
      quizId,
      quizMode,
      userId,
      answersCount: answers?.length
    });
    
    // Validate submission
    if (!quizId || !quizMode || !answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quiz submission data"
      });
    }
    
    // Get quiz questions to calculate score
    const quizQuestions = await Quiz.find({
      _id: { $in: answers.map(a => a.questionId) }
    });
    
    if (quizQuestions.length !== answers.length) {
      return res.status(400).json({
        success: false,
        message: "Some questions not found"
      });
    }
    
    // Calculate results
    let correctAnswers = 0;
    const questionTimes = [];
    const detailedResults = [];
    
    for (const answer of answers) {
      const question = quizQuestions.find(q => q._id.toString() === answer.questionId);
      if (!question) continue;
      
      const isCorrect = question.correctAnswer === answer.selectedAnswer;
      if (isCorrect) correctAnswers++;
      
      questionTimes.push(answer.timeSpent || 0);
      
      detailedResults.push({
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        timeSpent: answer.timeSpent || 0
      });
    }
    
    const totalQuestions = answers.length;
    const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
    
    // Calculate BB Points (example formula)
    const basePoints = correctAnswers * 10;
    const speedBonus = quizMode === 'TIMED' ? Math.max(0, 50 - Math.floor(totalTimeSpent / 10)) : 0;
    const bbPointsEarned = basePoints + speedBonus;
    
    // Update user's performance analytics
    let analytics = await PerformanceAnalytics.findOne({ userId });
    
    if (!analytics) {
      analytics = new PerformanceAnalytics({ userId });
    }
    
    // Update analytics using the model method
    await analytics.updateAfterQuiz({
      quizMode,
      totalQuestions,
      correctAnswers,
      timeSpent: totalTimeSpent,
      questionTimes,
      bbPointsEarned,
      category: quizQuestions[0]?.category, // Assuming all questions in a quiz have same category
      difficulty: quizQuestions[0]?.difficulty
    });
    
    console.log("✅ Quiz submitted and analytics updated");
    
    // Return quiz results
    return res.status(200).json({
      success: true,
      message: "Quiz submitted successfully",
      results: {
        totalQuestions,
        correctAnswers,
        accuracy,
        timeSpent: totalTimeSpent,
        bbPointsEarned,
        detailedResults
      },
      analytics: {
        totalQuestionsAttempted: analytics.totalQuestionsAttempted,
        totalCorrectQuestions: analytics.totalCorrectQuestions,
        cumulativeScore: analytics.cumulativeScore,
        accuracyPercentage: analytics.accuracyPercentage
      }
    });
    
  } catch (error) {
    console.error("❌ Quiz submission error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit quiz",
      error: error.message
    });
  }
});

// Get quiz statistics for a specific category
router.get("/category-stats/:category", authenticateToken, async (req, res) => {
  try {
    const { category } = req.params;
    const userId = req.user.userId;
    
    const analytics = await PerformanceAnalytics.findOne({ userId });
    
    if (!analytics || !analytics.categoryPerformance) {
      return res.status(200).json({
        success: true,
        stats: {
          category,
          attempted: 0,
          correct: 0,
          accuracy: 0
        }
      });
    }
    
    const categoryStats = analytics.categoryPerformance.get(category) || {
      attempted: 0,
      correct: 0,
      accuracy: 0
    };
    
    return res.status(200).json({
      success: true,
      stats: {
        category,
        ...categoryStats
      }
    });
    
  } catch (error) {
    console.error("❌ Category stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get category statistics",
      error: error.message
    });
  }
});

// Get user's quiz history
router.get("/my-history", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const analytics = await PerformanceAnalytics.findOne({ userId })
      .select('lastQuiz totalQuizzesTaken accuracyPercentage cumulativeScore');
    
    if (!analytics) {
      return res.status(200).json({
        success: true,
        history: [],
        stats: {
          totalQuizzes: 0,
          overallAccuracy: 0,
          totalScore: 0
        }
      });
    }
    
    // For now, we only have the last quiz details
    // In a real implementation, you'd store individual quiz records
    const history = analytics.lastQuiz ? [analytics.lastQuiz] : [];
    
    return res.status(200).json({
      success: true,
      history,
      stats: {
        totalQuizzes: analytics.totalQuizzesTaken,
        overallAccuracy: analytics.accuracyPercentage,
        totalScore: analytics.cumulativeScore
      },
      pagination: {
        currentPage: page,
        totalPages: 1,
        hasMore: false
      }
    });
    
  } catch (error) {
    console.error("❌ Quiz history error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get quiz history",
      error: error.message
    });
  }
});


export default router;