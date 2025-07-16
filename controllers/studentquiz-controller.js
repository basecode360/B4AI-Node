import { StudentQuiz } from '../models/studentQuizModel.js'; // Fixed import path
import { validationResult } from 'express-validator';

// Add Question Controller
export const addQuestion = async (req, res) => {
  try {
    // 🐛 DEBUG: Log collection info
    
    // Validation errors check karo
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      question,
      answers,
      options, // Also check for 'options' field
      correctAnswerIndex,
      correctAnswer, // Also check for 'correctAnswer' field
      category,
      subCategory,
      language,
      difficulty,
      tags
    } = req.body;

   

    
    // User ID token se nikalo (middleware se aayega) - Fixed to match your middleware
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication failed - no userId found'
      });
    }

    // Use the correct field names - check both possible names
    const finalAnswers = answers || options;
    const finalCorrectIndex = correctAnswerIndex !== undefined ? correctAnswerIndex : correctAnswer;

    // Validate required fields
    if (!question || !finalAnswers || finalAnswers.length !== 4) {
      return res.status(400).json({
        success: false,
        message: 'Question and 4 answers are required'
      });
    }

    if (finalCorrectIndex < 0 || finalCorrectIndex > 3) {
      return res.status(400).json({
        success: false,
        message: 'Correct answer index must be between 0-3'
      });
    }

    if (!category || !subCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category and sub-category are required'
      });
    }

    // New question object banao
    const questionData = {
      userId: userId,
      question: question.trim(),
      options: finalAnswers.map(answer => answer.trim()),
      correctAnswer: finalCorrectIndex,
      category: category,
      subCategory: subCategory,
      language: language || 'english',
      difficulty: difficulty || 'medium',
      tags: tags || [],
      status: 'pending', // Updated to match your schema
      submissionSource: 'web_app' // Added required field
    };


    const newQuestion = new StudentQuiz(questionData);

    
    // Database mein save karo
    const savedQuestion = await newQuestion.save();

   

    // Success response bhejo
    res.status(201).json({
      success: true,
      message: 'Question added successfully',
      data: {
        id: savedQuestion._id,
        question: savedQuestion.question,
        category: savedQuestion.category,
        subCategory: savedQuestion.subCategory,
        language: savedQuestion.language,
        status: savedQuestion.status,
        createdAt: savedQuestion.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error adding question:', error);
    console.error('🔍 Error details:', {
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get All Questions Controller
export const getAllQuestions = async (req, res) => {
  try {
    
    const {
      page = 1,
      limit = 10,
      category,
      subCategory,
      language,
      difficulty,
      userId
    } = req.query;

    // Filter object banao
    const filter = {};
    
    if (category) filter.category = category;
    if (subCategory) filter.subCategory = subCategory;
    if (language) filter.language = language;
    if (difficulty) filter.difficulty = difficulty;
    if (userId) filter.userId = userId;
    
    // Updated to match your schema
    filter.status = { $in: ['pending', 'approved'] };


    // Pagination calculate karo
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Database se questions fetch karo
    const questions = await StudentQuiz.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));


    // Total count nikalo
    const totalQuestions = await StudentQuiz.countDocuments(filter);
    const totalPages = Math.ceil(totalQuestions / parseInt(limit));


    res.status(200).json({
      success: true,
      message: 'Questions fetched successfully',
      data: questions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalQuestions: totalQuestions,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('❌ Error fetching questions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get Question By ID Controller
export const getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await StudentQuiz.findById(id)
      .populate('userId', 'name email');

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }


    res.status(200).json({
      success: true,
      message: 'Question fetched successfully',
      data: question
    });

  } catch (error) {
    console.error('❌ Error fetching question:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update Question Controller
export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.user?.id || req.user?._id; // Fixed


    // Question find karo
    const question = await StudentQuiz.findById(id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if user owns this question
    if (question.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own questions'
      });
    }

    // Update fields
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };


    const updatedQuestion = await StudentQuiz.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );


    res.status(200).json({
      success: true,
      message: 'Question updated successfully',
      data: updatedQuestion
    });

  } catch (error) {
    console.error('❌ Error updating question:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete Question Controller (Soft Delete)
export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.user?.id || req.user?._id; // Fixed


    const question = await StudentQuiz.findById(id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if user owns this question
    if (question.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own questions'
      });
    }

    // Soft delete - archive the question
    await StudentQuiz.findByIdAndUpdate(id, { 
      isArchived: true,
      updatedAt: new Date()
    });


    res.status(200).json({
      success: true,
      message: 'Question deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting question:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get Categories Controller
export const getCategories = async (req, res) => {
  try {
    const categories = [
      {
        id: 1,
        name: "General Knowledge",
        subCategories: [
          "History", "Geography", "Science", "Sports",
          "Politics", "Current Affairs", "Art & Culture", "Literature"
        ]
      },
      {
        id: 2,
        name: "Technology",
        subCategories: [
          "Programming", "Web Development", "Mobile Apps", "AI/ML",
          "Cybersecurity", "Data Science", "Cloud Computing", "Blockchain"
        ]
      },
      {
        id: 3,
        name: "Education",
        subCategories: [
          "Mathematics", "Physics", "Chemistry", "Biology",
          "English", "Economics", "Psychology", "Philosophy"
        ]
      },
      {
        id: 4,
        name: "Entertainment",
        subCategories: [
          "Movies", "Music", "TV Shows", "Gaming",
          "Celebrity", "Fashion", "Food & Cooking", "Travel"
        ]
      },
      {
        id: 5,
        name: "Business",
        subCategories: [
          "Finance", "Marketing", "Entrepreneurship", "Management",
          "Sales", "Investment", "Banking", "Stock Market"
        ]
      },
      {
        id: 6,
        name: "Health & Fitness",
        subCategories: [
          "Nutrition", "Exercise", "Mental Health", "Medicine",
          "Yoga", "Diet", "Sports Medicine", "First Aid"
        ]
      }
    ];

    res.status(200).json({
      success: true,
      message: 'Categories fetched successfully',
      data: categories
    });

  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Additional debug function to check collection
export const debugCollection = async (req, res) => {
  try {
  
    
    // Count all documents
    const totalCount = await StudentQuiz.countDocuments({});
    
    // Get sample documents
    const sampleDocs = await StudentQuiz.find({}).limit(3);
    
    // List all collections in the database
    const collections = await StudentQuiz.db.db.listCollections().toArray();
    
    res.json({
      success: true,
      collectionName: StudentQuiz.collection.collectionName,
      databaseName: StudentQuiz.db.databaseName || "default",
      connectionName: StudentQuiz.db.name,
      modelName: StudentQuiz.modelName,
      totalDocuments: totalCount,
      sampleDocuments: sampleDocs,
      allCollections: collections.map(c => c.name)
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};