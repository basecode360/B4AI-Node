// Enhanced quiz.route.js - WITH LANGUAGE FILTERING SUPPORT
import mongoose from 'mongoose';
import express from 'express';
import {
  addCategory,
  addQuestion,
  getQuestion,
} from '../controllers/quiz-controller.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { Quiz } from '../models/quizModel.js';
import { userModel } from '../models/userModel.js';
import { StudentQuiz } from '../models/studentQuizModel.js';
import PerformanceAnalytics from '../models/PerformanceAnalytics.js';

const router = express.Router();

// ✅ UPDATED CATEGORIES API - WITH LANGUAGE FILTER SUPPORT
router.get('/categories', async (req, res) => {
  try {
    // ✅ Get language filter from query params
    const { language } = req.query;

    console.log('📚 Fetching categories from Questions collection...');
    console.log('🌐 Language filter:', language || 'all languages');

    // Get categories from Questions collection (if exists) or Quiz collection
    let Questions;
    try {
      Questions = mongoose.model('Questions');
    } catch (error) {
      Questions = Quiz; // Fallback to Quiz model if Questions doesn't exist
    }

    // ✅ Build filter object with language support
    const matchFilter = {
      status: 'active',
      approved: true,
      category: { $ne: null, $ne: '', $exists: true },
    };

    // ✅ Add language filter if provided
    if (language && language !== 'all') {
      matchFilter.language = language;
      console.log('🔍 Filtering by language:', language);
    }

    console.log('🔍 MongoDB match filter:', matchFilter);

    // ✅ Dynamic categories with counts and language filtering
    const categoriesData = await Questions.aggregate([
      {
        $match: matchFilter,
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          languages: { $addToSet: '$language' },
          difficulties: { $addToSet: '$difficulty' },
          sampleQuestion: { $first: '$question' },
        },
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          languages: 1,
          difficulties: 1,
          sampleQuestion: { $substr: ['$sampleQuestion', 0, 100] },
          _id: 0,
        },
      },
      {
        $sort: { count: -1, category: 1 },
      },
    ]);

    console.log(
      `✅ Found ${categoriesData.length} categories for language: ${
        language || 'all'
      }`
    );

    // ✅ Transform to match frontend expectations
    const transformedCategories = categoriesData.map((cat) => ({
      category: cat.category,
      count: cat.count,
      languages: cat.languages || [],
      difficulties: cat.difficulties || [],
      subCategories: [], // ✅ Empty array for compatibility
      hasSubCategories: false,
    }));

    res.json({
      success: true,
      message: language
        ? `Categories fetched successfully for ${language}`
        : 'Categories fetched successfully',
      data: transformedCategories,
      total: transformedCategories.length,
      metadata: {
        timestamp: new Date().toISOString(),
        totalQuestions: transformedCategories.reduce(
          (sum, cat) => sum + cat.count,
          0
        ),
        language: language || 'all',
        appliedFilters: { language: language || null },
      },
    });
  } catch (error) {
    console.error('❌ Get categories error:', error);

    // ✅ Fallback to Quiz collection if Questions fails
    try {
      console.log('🔄 Falling back to Quiz collection...');
      const fallbackCategories = await Quiz.getCategoriesWithCounts();

      res.json({
        success: true,
        message: 'Categories fetched from fallback source',
        data: fallbackCategories,
        total: fallbackCategories.length,
        fallback: true,
      });
    } catch (fallbackError) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories from both sources',
        error: error.message,
        fallbackError: fallbackError.message,
        data: [],
      });
    }
  }
});

// ✅ UPDATED QUESTIONS API - WITH ENHANCED LANGUAGE FILTERING
router.get('/questions', async (req, res) => {
  try {
    const {
      category,
      language = 'english', // ✅ Default to english
      difficulty,
      examType,
      limit = 20,
      random = 'true',
    } = req.query;

    console.log('🔍 Fetching questions with enhanced filters:', {
      category,
      language,
      difficulty,
      examType,
      limit,
    });

    // Try Questions collection first, fallback to Quiz
    let Questions;
    try {
      Questions = mongoose.model('Questions');
    } catch (error) {
      Questions = Quiz;
    }

    // ✅ Build dynamic filter with ALWAYS language included
    const filter = {
      status: 'active',
      approved: true,
      language: language, // ✅ Always filter by language
    };

    if (category && category !== 'all')
      filter.category = new RegExp(category, 'i');
    if (difficulty && difficulty !== 'all') filter.difficulty = difficulty;
    if (examType && examType !== 'all') filter.examType = examType;

    console.log('🔍 Final MongoDB filter:', filter);

    // ✅ First check if questions exist with these filters
    const totalCount = await Questions.countDocuments(filter);
    console.log(`📊 Total questions matching filter: ${totalCount}`);

    if (totalCount === 0) {
      // ✅ Enhanced error response with language info
      return res.json({
        success: false,
        message: `No questions found for ${language}${
          difficulty ? ` (${difficulty} difficulty)` : ''
        }${category ? ` in ${category} category` : ''}`,
        questions: [],
        totalQuestions: 0,
        totalAvailable: 0,
        appliedFilters: {
          category: category || null,
          language: language,
          difficulty: difficulty || null,
          examType: examType || null,
          limit: parseInt(limit),
          randomized: random === 'true',
        },
        noQuestionsFound: true,
        metadata: {
          timestamp: new Date().toISOString(),
          hasMore: false,
          samplingUsed: false,
          validationPassed: 0,
          invalidFiltered: 0,
        },
      });
    }

    // ✅ Get questions with proper selection and language validation
    let query = Questions.find(filter)
      .select(
        'question options correctAnswer category language difficulty examType wikipediaLink createdAt'
      )
      .lean();

    // ✅ Apply randomization if requested
    if (random === 'true' && totalCount > parseInt(limit)) {
      const randomSkip = Math.floor(
        Math.random() * Math.max(0, totalCount - parseInt(limit))
      );
      query = query.skip(randomSkip);
      console.log(`🎲 Random skip applied: ${randomSkip}`);
    }

    const questions = await query.limit(parseInt(limit));

    // ✅ Double-check language consistency
    const validQuestions = questions.filter((q) => q.language === language);
    const invalidFiltered = questions.length - validQuestions.length;

    if (invalidFiltered > 0) {
      console.warn(
        `⚠️ Filtered out ${invalidFiltered} questions with wrong language`
      );
    }

    console.log(
      `✅ Returning ${validQuestions.length} valid questions for ${language}`
    );

    // ✅ Enhanced response with language metadata
    res.json({
      success: true,
      message: `Found ${validQuestions.length} questions for ${language}`,
      questions: validQuestions,
      totalFound: validQuestions.length,
      totalAvailable: totalCount,
      appliedFilters: {
        category: category || null,
        language: language,
        difficulty: difficulty || null,
        examType: examType || null,
        limit: parseInt(limit),
        randomized: random === 'true',
      },
      metadata: {
        timestamp: new Date().toISOString(),
        hasMore:
          validQuestions.length === parseInt(limit) &&
          totalCount > parseInt(limit),
        samplingUsed: random === 'true' && totalCount > parseInt(limit),
        validationPassed: validQuestions.length,
        invalidFiltered: invalidFiltered,
      },
    });
  } catch (error) {
    console.error('❌ Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions',
      error: error.message,
      questions: [],
      totalFound: 0,
    });
  }
});

// ✅ ENHANCED LANGUAGES API with metadata
router.get('/languages', async (req, res) => {
  try {
    console.log('🌐 Fetching available languages...');

    let Questions;
    try {
      Questions = mongoose.model('Questions');
    } catch (error) {
      Questions = Quiz;
    }

    // ✅ Get languages with question counts
    const languageCounts = await Questions.aggregate([
      {
        $match: {
          status: 'active',
          approved: true,
        },
      },
      {
        $group: {
          _id: '$language',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const languages = languageCounts
      .map((item) => item._id)
      .filter((lang) => lang);

    // ✅ Fallback if no languages found
    const availableLanguages =
      languages.length > 0 ? languages : ['english', 'spanish', 'french'];

    console.log('✅ Languages found:', availableLanguages);

    // ✅ Create language counts object
    const languageCountsObj = languageCounts.reduce((acc, item) => {
      if (item._id) {
        acc[item._id] = item.count;
      }
      return acc;
    }, {});

    res.json({
      success: true,
      message: 'Languages fetched successfully',
      data: availableLanguages,
      metadata: {
        timestamp: new Date().toISOString(),
        totalLanguages: availableLanguages.length,
        languageCounts: languageCountsObj,
        mostPopular: languageCounts[0]?._id || 'english',
      },
      fallback: languages.length === 0,
    });
  } catch (error) {
    console.error('❌ Get languages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch languages',
      error: error.message,
      data: ['english'], // Fallback
      fallback: true,
    });
  }
});

// ✅ NEW: SUBCATEGORIES API with language support (if needed)
router.get('/subcategories/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { language } = req.query;

    console.log(
      `📂 Fetching subcategories for category: ${category}, language: ${
        language || 'all'
      }`
    );

    let Questions;
    try {
      Questions = mongoose.model('Questions');
    } catch (error) {
      Questions = Quiz;
    }

    // ✅ Build filter with language support
    const filter = {
      category: new RegExp(category, 'i'),
      status: 'active',
      approved: true,
      subCategory: { $ne: null, $ne: '', $exists: true },
    };

    if (language && language !== 'all') {
      filter.language = language;
    }

    const subcategories = await Questions.distinct('subCategory', filter);

    console.log(
      `✅ Found ${subcategories.length} subcategories for ${category}`
    );

    res.json({
      success: true,
      message: `Subcategories fetched for ${category}`,
      data: subcategories.filter((sub) => sub && sub.trim() !== ''),
      category: category,
      language: language || 'all',
    });
  } catch (error) {
    console.error('❌ Get subcategories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subcategories',
      error: error.message,
      data: [],
    });
  }
});

// ✅ NEW: QUIZ STATS API with language breakdown
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 Fetching quiz statistics...');

    let Questions;
    try {
      Questions = mongoose.model('Questions');
    } catch (error) {
      Questions = Quiz;
    }

    // ✅ Get comprehensive stats
    const stats = await Questions.aggregate([
      {
        $match: {
          status: 'active',
          approved: true,
        },
      },
      {
        $group: {
          _id: null,
          totalQuestions: { $sum: 1 },
          languages: { $addToSet: '$language' },
          categories: { $addToSet: '$category' },
          difficulties: { $addToSet: '$difficulty' },
          examTypes: { $addToSet: '$examType' },
        },
      },
    ]);

    // ✅ Get language breakdown
    const languageBreakdown = await Questions.aggregate([
      {
        $match: {
          status: 'active',
          approved: true,
        },
      },
      {
        $group: {
          _id: '$language',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const statsData = stats[0] || {
      totalQuestions: 0,
      languages: [],
      categories: [],
      difficulties: [],
      examTypes: [],
    };

    res.json({
      success: true,
      message: 'Quiz statistics fetched successfully',
      data: {
        totalQuestions: statsData.totalQuestions,
        totalLanguages: statsData.languages.length,
        totalCategories: statsData.categories.length,
        totalDifficulties: statsData.difficulties.length,
        totalExamTypes: statsData.examTypes.length,
        languageBreakdown: languageBreakdown.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        availableLanguages: statsData.languages,
        availableCategories: statsData.categories,
        availableDifficulties: statsData.difficulties,
        availableExamTypes: statsData.examTypes,
      },
    });
  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz statistics',
      error: error.message,
      data: null,
    });
  }
});

// Existing routes
router.post('/add-question', addQuestion);
router.put('/add-category/:questionId', addCategory);
router.get('/get-question', authenticateToken, getQuestion);

// ✅ GET ALL QUIZZES - Admin Management
router.get('/manage-quizzes', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Fetching all quizzes for management...');

    // ✅ Admins can access all quizzes, no personal filtering
    const quizzes = await Quiz.find({})
      .populate('category', 'name') // Populate category name
      .populate('language', 'name') // Populate language name
      .lean();

    console.log(`✅ Found ${quizzes.length} quizzes`);

    res.json({
      success: true,
      message: 'Quizzes fetched successfully',
      data: quizzes,
      total: quizzes.length,
      metadata: {
        timestamp: new Date().toISOString(),
        totalQuestions: quizzes.reduce(
          (sum, quiz) => sum + (quiz.questions ? quiz.questions.length : 0),
          0
        ),
      },
    });
  } catch (error) {
    console.error('❌ Get quizzes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quizzes',
      error: error.message,
      data: [],
    });
  }
});

// ✅ CREATE NEW QUIZ ENDPOINT
router.post('/manage-quizzes', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      language,
      questions, // Array of question objects
      examType,
      duration,
      passPercentage,
    } = req.body;

    console.log('🆕 Creating new quiz with data:', {
      title,
      description,
      category,
      language,
      questions,
      examType,
      duration,
      passPercentage,
    });

    // ✅ Basic validation
    if (
      !title ||
      !category ||
      !language ||
      !questions ||
      questions.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Title, category, language, and questions are required',
        data: null,
      });
    }

    // ✅ Create new quiz
    const newQuiz = new Quiz({
      title,
      description,
      category,
      language,
      questions,
      examType,
      duration,
      passPercentage,
      status: 'active',
      approved: true, // Auto-approve for admin-created quizzes
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newQuiz.save();

    res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      data: newQuiz,
    });
  } catch (error) {
    console.error('❌ Create quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create quiz',
      error: error.message,
    });
  }
});

// ✅ UPDATE EXISTING QUIZ ROUTES FOR BULK OPERATIONS

// BULK UPDATE CATEGORIES FOR ADMIN QUIZZES
router.put(
  '/manage-quizzes/bulk-category',
  authenticateToken,
  async (req, res) => {
    try {
      const { quizIds, newCategory } = req.body;

      console.log('🔄 Bulk updating categories for quizzes:', {
        quizIds,
        newCategory,
      });

      // ✅ Validate input
      if (!Array.isArray(quizIds) || quizIds.length === 0 || !newCategory) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input data',
          data: null,
        });
      }

      // ✅ Update quizzes in bulk
      const result = await Quiz.updateMany(
        { _id: { $in: quizIds } },
        { $set: { category: newCategory, updatedAt: new Date() } }
      );

      console.log(`✅ Updated ${result.nModified} quizzes`);

      res.json({
        success: true,
        message: `Updated ${result.nModified} quizzes successfully`,
        data: result,
      });
    } catch (error) {
      console.error('❌ Bulk update categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update categories',
        error: error.message,
      });
    }
  }
);

// BULK DELETE ADMIN QUIZZES
router.delete(
  '/manage-quizzes/bulk-delete',
  authenticateToken,
  async (req, res) => {
    try {
      const { quizIds } = req.body;

      console.log('🗑️ Bulk deleting quizzes:', quizIds);

      // ✅ Validate input
      if (!Array.isArray(quizIds) || quizIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid quiz IDs',
          data: null,
        });
      }

      // ✅ Delete quizzes in bulk
      const result = await Quiz.deleteMany({ _id: { $in: quizIds } });

      console.log(`✅ Deleted ${result.deletedCount} quizzes`);

      res.json({
        success: true,
        message: `Deleted ${result.deletedCount} quizzes successfully`,
        data: result,
      });
    } catch (error) {
      console.error('❌ Bulk delete quizzes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete quizzes',
        error: error.message,
      });
    }
  }
);

// ✅ DELETE QUIZ BY ID
router.delete(
  '/manage-quizzes/:quizId',
  authenticateToken,
  async (req, res) => {
    try {
      const { quizId } = req.params;

      console.log('🗑️ Deleting quiz with ID:', quizId);

      // ✅ Delete quiz by ID
      const result = await Quiz.findByIdAndDelete(quizId);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found',
          data: null,
        });
      }

      res.json({
        success: true,
        message: 'Quiz deleted successfully',
        data: result,
      });
    } catch (error) {
      console.error('❌ Delete quiz error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete quiz',
        error: error.message,
      });
    }
  }
);

// ✅ UPDATE QUIZ BY ID
router.put('/manage-quizzes/:quizId', authenticateToken, async (req, res) => {
  try {
    const { quizId } = req.params;
    const updateData = req.body;

    console.log('🔄 Updating quiz with ID:', quizId, 'Data:', updateData);

    // ✅ Update quiz by ID
    const result = await Quiz.findByIdAndUpdate(
      quizId,
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found',
        data: null,
      });
    }

    res.json({
      success: true,
      message: 'Quiz updated successfully',
      data: result,
    });
  } catch (error) {
    console.error('❌ Update quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update quiz',
      error: error.message,
    });
  }
});

// ✅ GET SINGLE QUIZ BY ID
router.get('/manage-quizzes/:quizId', authenticateToken, async (req, res) => {
  try {
    const { quizId } = req.params;

    console.log('🔍 Fetching quiz details for ID:', quizId);

    // ✅ Get quiz by ID
    const quiz = await Quiz.findById(quizId)
      .populate('category', 'name') // Populate category name
      .populate('language', 'name') // Populate language name
      .lean();

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Quiz not found',
        data: null,
      });
    }

    res.json({
      success: true,
      message: 'Quiz details fetched successfully',
      data: quiz,
    });
  } catch (error) {
    console.error('❌ Get quiz details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz details',
      error: error.message,
      data: null,
    });
  }
});

// ✅ STUDENT QUIZ SUBMISSION ROUTES

// GET ALL STUDENT SUBMISSIONS (Admin View)
router.get('/student-submissions', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Fetching all student quiz submissions...');

    // ✅ Admins can access all submissions, no user filtering
    const submissions = await StudentQuiz.find({})
      .populate('quizId', 'title') // Populate quiz title
      .populate('userId', 'name email') // Populate user details
      .lean();

    console.log(`✅ Found ${submissions.length} submissions`);

    res.json({
      success: true,
      message: 'Student submissions fetched successfully',
      data: submissions,
      total: submissions.length,
      metadata: {
        timestamp: new Date().toISOString(),
        totalQuizzes: submissions.reduce(
          (sum, sub) => sum + (sub.questions ? sub.questions.length : 0),
          0
        ),
      },
    });
  } catch (error) {
    console.error('❌ Get submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions',
      error: error.message,
      data: [],
    });
  }
});

// BULK APPROVE STUDENT SUBMISSIONS
router.put(
  '/student-submissions/bulk-approve',
  authenticateToken,
  async (req, res) => {
    try {
      const { submissionIds } = req.body;

      console.log('✅ Bulk approving student submissions:', submissionIds);

      // ✅ Validate input
      if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid submission IDs',
          data: null,
        });
      }

      // ✅ Approve submissions in bulk
      const result = await StudentQuiz.updateMany(
        { _id: { $in: submissionIds } },
        { $set: { status: 'approved', updatedAt: new Date() } }
      );

      console.log(`✅ Approved ${result.nModified} submissions`);

      res.json({
        success: true,
        message: `Approved ${result.nModified} submissions successfully`,
        data: result,
      });
    } catch (error) {
      console.error('❌ Bulk approve submissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve submissions',
        error: error.message,
      });
    }
  }
);

// BULK REJECT STUDENT SUBMISSIONS
router.put(
  '/student-submissions/bulk-reject',
  authenticateToken,
  async (req, res) => {
    try {
      const { submissionIds } = req.body;

      console.log('❌ Bulk rejecting student submissions:', submissionIds);

      // ✅ Validate input
      if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid submission IDs',
          data: null,
        });
      }

      // ✅ Reject submissions in bulk
      const result = await StudentQuiz.updateMany(
        { _id: { $in: submissionIds } },
        { $set: { status: 'rejected', updatedAt: new Date() } }
      );

      console.log(`✅ Rejected ${result.nModified} submissions`);

      res.json({
        success: true,
        message: `Rejected ${result.nModified} submissions successfully`,
        data: result,
      });
    } catch (error) {
      console.error('❌ Bulk reject submissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject submissions',
        error: error.message,
      });
    }
  }
);

// BULK DELETE STUDENT SUBMISSIONS
router.delete(
  '/student-submissions/bulk-delete',
  authenticateToken,
  async (req, res) => {
    try {
      const { submissionIds } = req.body;

      console.log('🗑️ Bulk deleting student submissions:', submissionIds);

      // ✅ Validate input
      if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid submission IDs',
          data: null,
        });
      }

      // ✅ Delete submissions in bulk
      const result = await StudentQuiz.deleteMany({
        _id: { $in: submissionIds },
      });

      console.log(`✅ Deleted ${result.deletedCount} submissions`);

      res.json({
        success: true,
        message: `Deleted ${result.deletedCount} submissions successfully`,
        data: result,
      });
    } catch (error) {
      console.error('❌ Bulk delete submissions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete submissions',
        error: error.message,
      });
    }
  }
);

// GET MODERATION STATISTICS
router.get(
  '/student-submissions/stats',
  authenticateToken,
  async (req, res) => {
    try {
      console.log('📊 Fetching moderation statistics...');

      // ✅ Total submissions
      const totalSubmissions = await StudentQuiz.countDocuments();

      // ✅ Approved submissions
      const approvedSubmissions = await StudentQuiz.countDocuments({
        status: 'approved',
      });

      // ✅ Rejected submissions
      const rejectedSubmissions = await StudentQuiz.countDocuments({
        status: 'rejected',
      });

      // ✅ Pending submissions (if any)
      const pendingSubmissions = await StudentQuiz.countDocuments({
        status: 'pending',
      });

      res.json({
        success: true,
        message: 'Moderation statistics fetched successfully',
        data: {
          totalSubmissions,
          approvedSubmissions,
          rejectedSubmissions,
          pendingSubmissions,
        },
      });
    } catch (error) {
      console.error('❌ Get moderation stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch moderation statistics',
        error: error.message,
        data: null,
      });
    }
  }
);

// SUBMIT NEW QUIZ (For Android App)
router.post('/student-submissions', authenticateToken, async (req, res) => {
  try {
    const {
      quizId,
      userId,
      answers, // Array of answer objects
      duration,
      submittedAt,
    } = req.body;

    console.log('📥 Submitting new quiz:', {
      quizId,
      userId,
      answers,
      duration,
      submittedAt,
    });

    // ✅ Basic validation
    if (!quizId || !userId || !answers || answers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Quiz ID, user ID, and answers are required',
        data: null,
      });
    }

    // ✅ Create new submission
    const newSubmission = new StudentQuiz({
      quizId,
      userId,
      answers,
      duration,
      submittedAt: submittedAt || new Date(),
      status: 'pending', // Default to pending
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newSubmission.save();

    res.status(201).json({
      success: true,
      message: 'Quiz submitted successfully',
      data: newSubmission,
    });
  } catch (error) {
    console.error('❌ Submit quiz error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit quiz',
      error: error.message,
    });
  }
});

// Update the existing quiz submission endpoint to include analytics
router.post('/submit-quiz', authenticateToken, async (req, res) => {
  try {
    const {
      quizId,
      userId,
      answers, // Array of answer objects
      duration,
      submittedAt,
    } = req.body;

    console.log('📥 Submitting quiz with analytics:', {
      quizId,
      userId,
      answers,
      duration,
      submittedAt,
    });

    // ✅ Basic validation
    if (!quizId || !userId || !answers || answers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Quiz ID, user ID, and answers are required',
        data: null,
      });
    }

    // ✅ Create new submission
    const newSubmission = new StudentQuiz({
      quizId,
      userId,
      answers,
      duration,
      submittedAt: submittedAt || new Date(),
      status: 'pending', // Default to pending
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newSubmission.save();

    // ✅ Calculate and save analytics data
    const correctAnswers = answers.filter((ans) => ans.isCorrect).length;
    const totalQuestions = answers.length;
    const score = (correctAnswers / totalQuestions) * 100;

    // ✅ Upsert analytics data
    await PerformanceAnalytics.updateOne(
      { userId, quizId },
      {
        $set: {
          userId,
          quizId,
          score,
          totalQuestions,
          correctAnswers,
          submittedAt: new Date(),
          updatedAt: new Date(),
        },
        $inc: { attemptCount: 1 },
      },
      { upsert: true }
    );

    res.status(201).json({
      success: true,
      message: 'Quiz submitted and analytics updated successfully',
      data: newSubmission,
    });
  } catch (error) {
    console.error('❌ Submit quiz with analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit quiz or update analytics',
      error: error.message,
    });
  }
});

// Get quiz statistics for a specific category
router.get('/category-stats/:category', authenticateToken, async (req, res) => {
  try {
    const { category } = req.params;

    console.log('📊 Fetching quiz statistics for category:', category);

    // ✅ Get total quizzes in category
    const totalQuizzes = await Quiz.countDocuments({ category });

    // ✅ Get average score for quizzes in category
    const averageScore = await PerformanceAnalytics.aggregate([
      {
        $match: {
          category,
          status: 'completed', // Only completed quizzes
        },
      },
      {
        $group: {
          _id: null,
          avgScore: { $avg: '$score' },
          totalAttempts: { $sum: '$attemptCount' },
        },
      },
    ]);

    const statsData = averageScore[0] || {
      avgScore: 0,
      totalAttempts: 0,
    };

    res.json({
      success: true,
      message: `Statistics for category: ${category}`,
      data: {
        totalQuizzes,
        averageScore: statsData.avgScore,
        totalAttempts: statsData.totalAttempts,
      },
    });
  } catch (error) {
    console.error('❌ Get category stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category statistics',
      error: error.message,
      data: null,
    });
  }
});

// Get user's quiz history
router.get('/my-history', authenticateToken, async (req, res) => {
  try {
    const { userId } = req;

    console.log('📜 Fetching quiz history for user ID:', userId);

    // ✅ Get user's quiz submissions
    const history = await StudentQuiz.find({ userId })
      .populate('quizId', 'title category') // Populate quiz details
      .sort({ submittedAt: -1 }) // Latest first
      .lean();

    console.log(`✅ Found ${history.length} history records`);

    res.json({
      success: true,
      message: 'Quiz history fetched successfully',
      data: history,
      total: history.length,
    });
  } catch (error) {
    console.error('❌ Get quiz history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quiz history',
      error: error.message,
      data: [],
    });
  }
});

export default router;
