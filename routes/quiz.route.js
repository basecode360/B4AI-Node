// Update your routes/quiz.route.js file with these fixed routes

import express from "express";
import { addCategory, addQuestion, getQuestion } from "../controllers/quiz-controller.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { Quiz } from "../models/quizModel.js"; // ✅ Correct import
import { userModel } from "../models/userModel.js";

const router = express.Router();

// Existing routes
router.post("/add-question", addQuestion);
router.put("/add-category/:questionId", addCategory);
router.get("/get-question", authenticateToken, getQuestion);

// ✅ NEW MANAGEMENT ROUTES WITH CORRECT MODEL

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

export default router;