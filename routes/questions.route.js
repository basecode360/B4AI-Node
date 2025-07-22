import express from 'express';
import {
  importExcelQuestions,
  getAllQuestions,
  getRandomQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  bulkUpdateQuestions,
  bulkDeleteQuestions,
  uploadMiddleware
} from '../controllers/questions-controller.js';
import { authenticateToken } from '../middleware/authMiddleware.js'; // ✅ CORRECT PATH - matches your structure

const router = express.Router();

// Test route to verify the questions API is working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Questions API is working!',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /import-excel - Import questions from Excel',
      'GET /all - Get all questions',
      'GET /random - Get random questions for quiz',
      'POST /create - Create single question',
      'PUT /update/:id - Update question',
      'DELETE /delete/:id - Delete question'
    ]
  });
});

// Import routes (requires authentication and admin role)
// ✅ MIDDLEWARE ORDER: uploadMiddleware FIRST, then authenticateToken
router.post('/import-excel', 
  uploadMiddleware,      // ✅ File upload first
  authenticateToken,     // ✅ Auth after file processing
  importExcelQuestions   // ✅ Controller last
);

// CRUD routes for questions management
router.get('/all', authenticateToken, getAllQuestions);
router.get('/random', getRandomQuestions); // Public route for getting quiz questions
router.post('/create', authenticateToken, createQuestion);
router.put('/update/:questionId', authenticateToken, updateQuestion);
router.delete('/delete/:questionId', authenticateToken, deleteQuestion);

// Bulk operations (admin only)
router.put('/bulk-update', authenticateToken, bulkUpdateQuestions);
router.delete('/bulk-delete', authenticateToken, bulkDeleteQuestions);

// Statistics and analytics routes
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const Questions = (await import('../models/QuestionsModel.js')).default;
    
    const stats = await Questions.aggregate([
      {
        $group: {
          _id: null,
          totalQuestions: { $sum: 1 },
          byLanguage: {
            $push: {
              k: '$language',
              v: 1
            }
          },
          byCategory: {
            $push: {
              k: '$category',
              v: 1
            }
          },
          byStatus: {
            $push: {
              k: '$status',
              v: 1
            }
          },
          approvedCount: {
            $sum: { $cond: [{ $eq: ['$approved', true] }, 1, 0] }
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$approved', false] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          totalQuestions: 1,
          approvedCount: 1,
          pendingCount: 1,
          byLanguage: { $arrayToObject: '$byLanguage' },
          byCategory: { $arrayToObject: '$byCategory' },
          byStatus: { $arrayToObject: '$byStatus' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      stats: stats[0] || {
        totalQuestions: 0,
        approvedCount: 0,
        pendingCount: 0,
        byLanguage: {},
        byCategory: {},
        byStatus: {}
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message,
      code: 'STATS_ERROR'
    });
  }
});

// Get questions by category
router.get('/category/:category', async (req, res) => {
  try {
    const Questions = (await import('../models/QuestionsModel.js')).default;
    const { category } = req.params;
    const { language = 'english', limit = 20 } = req.query;

    const questions = await Questions.find({
      category: new RegExp(category, 'i'),
      language: language,
      status: 'active',
      approved: true
    })
    .select('question options correctAnswer category subCategory language difficulty')
    .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      questions,
      category,
      language,
      count: questions.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions by category',
      error: error.message,
      code: 'CATEGORY_ERROR'
    });
  }
});

// Get unique categories
router.get('/categories', async (req, res) => {
  try {
    const Questions = (await import('../models/QuestionsModel.js')).default;
    const { language = 'all' } = req.query;
    
    const filter = { status: 'active' };
    if (language !== 'all') {
      filter.language = language;
    }

    const categories = await Questions.distinct('category', filter);
    const subCategories = await Questions.distinct('subCategory', filter);

    res.status(200).json({
      success: true,
      categories: categories.filter(cat => cat), // Remove null/empty values
      subCategories: subCategories.filter(subCat => subCat),
      language
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message,
      code: 'CATEGORIES_ERROR'
    });
  }
});

// Get unique languages
router.get('/languages', async (req, res) => {
  try {
    const Questions = (await import('../models/QuestionsModel.js')).default;
    const languages = await Questions.distinct('language', { status: 'active' });
    
    res.status(200).json({
      success: true,
      languages: languages.filter(lang => lang)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch languages',
      error: error.message,
      code: 'LANGUAGES_ERROR'
    });
  }
});

// Search questions
router.get('/search', async (req, res) => {
  try {
    const Questions = (await import('../models/QuestionsModel.js')).default;
    const { 
      q, 
      language = 'english', 
      category = 'all',
      limit = 20,
      page = 1 
    } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long',
        code: 'INVALID_QUERY'
      });
    }

    const filter = {
      $and: [
        {
          $or: [
            { question: new RegExp(q, 'i') },
            { category: new RegExp(q, 'i') },
            { subCategory: new RegExp(q, 'i') },
            { correctAnswerText: new RegExp(q, 'i') }
          ]
        },
        { status: 'active' },
        { approved: true }
      ]
    };

    if (language !== 'all') {
      filter.$and.push({ language: language });
    }

    if (category !== 'all') {
      filter.$and.push({ category: new RegExp(category, 'i') });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const questions = await Questions.find(filter)
      .select('question options correctAnswer category subCategory language difficulty')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Questions.countDocuments(filter);

    res.status(200).json({
      success: true,
      questions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      },
      searchQuery: q
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message,
      code: 'SEARCH_ERROR'
    });
  }
});

// Approve/reject questions (admin only)
router.patch('/approve/:questionId', authenticateToken, async (req, res) => {
  try {
    const Questions = (await import('../models/QuestionsModel.js')).default;
    const { questionId } = req.params;
    const { approved } = req.body;

    const question = await Questions.findByIdAndUpdate(
      questionId,
      { 
        approved: approved === true,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
        code: 'NOT_FOUND'
      });
    }

    res.status(200).json({
      success: true,
      message: `Question ${approved ? 'approved' : 'rejected'} successfully`,
      question
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update question approval status',
      error: error.message,
      code: 'APPROVAL_ERROR'
    });
  }
});

export default router;