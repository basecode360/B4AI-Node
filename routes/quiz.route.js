// Enhanced quiz.route.js - WITH LANGUAGE FILTERING SUPPORT
import mongoose from "mongoose";
import express from "express";
import { addCategory, addQuestion, getQuestion } from "../controllers/quiz-controller.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { Quiz } from "../models/quizModel.js";

const router = express.Router();

// ✅ UPDATED CATEGORIES API - WITH LANGUAGE FILTER SUPPORT
router.get("/categories", async (req, res) => {
  try {
    // ✅ Get language filter from query params
    const { language } = req.query;

    console.log("📚 Fetching categories from Questions collection...");
    console.log("🌐 Language filter:", language || 'all languages');

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
      category: { $ne: null, $ne: '', $exists: true }
    };

    // ✅ Add language filter if provided
    if (language && language !== 'all') {
      matchFilter.language = language;
      console.log("🔍 Filtering by language:", language);
    }

    console.log("🔍 MongoDB match filter:", matchFilter);

    // ✅ Dynamic categories with counts and language filtering
    const categoriesData = await Questions.aggregate([
      {
        $match: matchFilter
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          languages: { $addToSet: '$language' },
          difficulties: { $addToSet: '$difficulty' },
          sampleQuestion: { $first: '$question' }
        }
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          languages: 1,
          difficulties: 1,
          sampleQuestion: { $substr: ['$sampleQuestion', 0, 100] },
          _id: 0
        }
      },
      {
        $sort: { count: -1, category: 1 }
      }
    ]);

    console.log(`✅ Found ${categoriesData.length} categories for language: ${language || 'all'}`);

    // ✅ Transform to match frontend expectations
    const transformedCategories = categoriesData.map(cat => ({
      category: cat.category,
      count: cat.count,
      languages: cat.languages || [],
      difficulties: cat.difficulties || [],
      subCategories: [], // ✅ Empty array for compatibility
      hasSubCategories: false
    }));

    res.json({
      success: true,
      message: language ?
        `Categories fetched successfully for ${language}` :
        "Categories fetched successfully",
      data: transformedCategories,
      total: transformedCategories.length,
      metadata: {
        timestamp: new Date().toISOString(),
        totalQuestions: transformedCategories.reduce((sum, cat) => sum + cat.count, 0),
        language: language || 'all',
        appliedFilters: { language: language || null }
      }
    });
  } catch (error) {
    console.error("❌ Get categories error:", error);

    // ✅ Fallback to Quiz collection if Questions fails
    try {
      console.log("🔄 Falling back to Quiz collection...");
      const fallbackCategories = await Quiz.getCategoriesWithCounts();

      res.json({
        success: true,
        message: "Categories fetched from fallback source",
        data: fallbackCategories,
        total: fallbackCategories.length,
        fallback: true
      });
    } catch (fallbackError) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch categories from both sources",
        error: error.message,
        fallbackError: fallbackError.message,
        data: []
      });
    }
  }
});

// ✅ UPDATED QUESTIONS API - WITH ENHANCED LANGUAGE FILTERING
router.get("/questions", async (req, res) => {
  try {
    const {
      category,
      language = 'english', // ✅ Default to english
      difficulty,
      examType,
      limit = 20,
      random = 'true'
    } = req.query;

    console.log("🔍 Fetching questions with enhanced filters:", {
      category, language, difficulty, examType, limit
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
      language: language // ✅ Always filter by language
    };

    if (category && category !== 'all') filter.category = new RegExp(category, 'i');
    if (difficulty && difficulty !== 'all') filter.difficulty = difficulty;
    if (examType && examType !== 'all') filter.examType = examType;

    console.log("🔍 Final MongoDB filter:", filter);

    // ✅ First check if questions exist with these filters
    const totalCount = await Questions.countDocuments(filter);
    console.log(`📊 Total questions matching filter: ${totalCount}`);

    if (totalCount === 0) {
      // ✅ Enhanced error response with language info
      return res.json({
        success: false,
        message: `No questions found for ${language}${difficulty ? ` (${difficulty} difficulty)` : ''}${category ? ` in ${category} category` : ''}`,
        questions: [],
        totalQuestions: 0,
        totalAvailable: 0,
        appliedFilters: {
          category: category || null,
          language: language,
          difficulty: difficulty || null,
          examType: examType || null,
          limit: parseInt(limit),
          randomized: random === 'true'
        },
        noQuestionsFound: true,
        metadata: {
          timestamp: new Date().toISOString(),
          hasMore: false,
          samplingUsed: false,
          validationPassed: 0,
          invalidFiltered: 0
        }
      });
    }

    // ✅ Get questions with proper selection and language validation
    let query = Questions.find(filter)
      .select('question options correctAnswer category language difficulty examType wikipediaLink createdAt')
      .lean();

    // ✅ Apply randomization if requested
    if (random === 'true' && totalCount > parseInt(limit)) {
      const randomSkip = Math.floor(Math.random() * Math.max(0, totalCount - parseInt(limit)));
      query = query.skip(randomSkip);
      console.log(`🎲 Random skip applied: ${randomSkip}`);
    }

    const questions = await query.limit(parseInt(limit));

    // ✅ Double-check language consistency
    const validQuestions = questions.filter(q => q.language === language);
    const invalidFiltered = questions.length - validQuestions.length;

    if (invalidFiltered > 0) {
      console.warn(`⚠️ Filtered out ${invalidFiltered} questions with wrong language`);
    }

    console.log(`✅ Returning ${validQuestions.length} valid questions for ${language}`);

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
        randomized: random === 'true'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        hasMore: validQuestions.length === parseInt(limit) && totalCount > parseInt(limit),
        samplingUsed: random === 'true' && totalCount > parseInt(limit),
        validationPassed: validQuestions.length,
        invalidFiltered: invalidFiltered
      }
    });

  } catch (error) {
    console.error("❌ Get questions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch questions",
      error: error.message,
      questions: [],
      totalFound: 0
    });
  }
});

// ✅ ENHANCED LANGUAGES API with metadata
router.get("/languages", async (req, res) => {
  try {
    console.log("🌐 Fetching available languages...");

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
          approved: true
        }
      },
      {
        $group: {
          _id: '$language',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const languages = languageCounts.map(item => item._id).filter(lang => lang);

    // ✅ Fallback if no languages found
    const availableLanguages = languages.length > 0 ? languages : ['english', 'spanish', 'french'];

    console.log("✅ Languages found:", availableLanguages);

    // ✅ Create language counts object
    const languageCountsObj = languageCounts.reduce((acc, item) => {
      if (item._id) {
        acc[item._id] = item.count;
      }
      return acc;
    }, {});

    res.json({
      success: true,
      message: "Languages fetched successfully",
      data: availableLanguages,
      metadata: {
        timestamp: new Date().toISOString(),
        totalLanguages: availableLanguages.length,
        languageCounts: languageCountsObj,
        mostPopular: languageCounts[0]?._id || 'english'
      },
      fallback: languages.length === 0
    });
  } catch (error) {
    console.error("❌ Get languages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch languages",
      error: error.message,
      data: ['english'], // Fallback
      fallback: true
    });
  }
});

// ✅ NEW: SUBCATEGORIES API with language support (if needed)
router.get("/subcategories/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const { language } = req.query;

    console.log(`📂 Fetching subcategories for category: ${category}, language: ${language || 'all'}`);

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
      subCategory: { $ne: null, $ne: '', $exists: true }
    };

    if (language && language !== 'all') {
      filter.language = language;
    }

    const subcategories = await Questions.distinct('subCategory', filter);

    console.log(`✅ Found ${subcategories.length} subcategories for ${category}`);

    res.json({
      success: true,
      message: `Subcategories fetched for ${category}`,
      data: subcategories.filter(sub => sub && sub.trim() !== ''),
      category: category,
      language: language || 'all'
    });
  } catch (error) {
    console.error("❌ Get subcategories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subcategories",
      error: error.message,
      data: []
    });
  }
});

// ✅ NEW: QUIZ STATS API with language breakdown
router.get("/stats", async (req, res) => {
  try {
    console.log("📊 Fetching quiz statistics...");

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
          approved: true
        }
      },
      {
        $group: {
          _id: null,
          totalQuestions: { $sum: 1 },
          languages: { $addToSet: '$language' },
          categories: { $addToSet: '$category' },
          difficulties: { $addToSet: '$difficulty' },
          examTypes: { $addToSet: '$examType' }
        }
      }
    ]);

    // ✅ Get language breakdown
    const languageBreakdown = await Questions.aggregate([
      {
        $match: {
          status: 'active',
          approved: true
        }
      },
      {
        $group: {
          _id: '$language',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const statsData = stats[0] || {
      totalQuestions: 0,
      languages: [],
      categories: [],
      difficulties: [],
      examTypes: []
    };

    res.json({
      success: true,
      message: "Quiz statistics fetched successfully",
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
        availableExamTypes: statsData.examTypes
      }
    });
  } catch (error) {
    console.error("❌ Get stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch quiz statistics",
      error: error.message,
      data: null
    });
  }
});

// ✅ Keep existing routes
router.post("/add-question", addQuestion);
router.put("/add-category/:questionId", addCategory);
router.get("/get-question", authenticateToken, getQuestion);

export default router;