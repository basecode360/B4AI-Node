import Questions from '../models/QuestionsModel.js';
import PerformanceAnalytics from '../models/PerformanceAnalytics.js';
import {userModel} from '../models/userModel.js';
import XLSX from 'xlsx';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/excel/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `questions-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.originalname.endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx) are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Language mappings for column headers
const languageConfigs = {
  english: {
    sheetName: 'Questions_EN',
    language: 'english',
    columns: {
      question: 'Question',
      answer: 'Answer',
      optionOne: 'Option One',
      optionTwo: 'Option Two',
      optionThree: 'Option Three',
      category: 'Category',
      subCategory: 'Sub-category',
      wikipediaLink: 'Wikipedia Link',
      examType: 'Exam Type',
      index: 'Index',
      approved: 'Approved'
    }
  },
  spanish: {
    sheetName: 'Questions_ES',
    language: 'spanish',
    columns: {
      question: 'Pregunta',
      answer: 'Respuesta',
      optionOne: 'Opción uno',
      optionTwo: 'Opción dos',
      optionThree: 'Opción tres',
      category: 'Categoría',
      subCategory: 'Subcategoría',
      wikipediaLink: 'Wikipedia Link',
      examType: 'Tipo de examen',
      index: 'Índice',
      approved: 'Aprobado'
    }
  },
  french: {
    sheetName: 'Questions_FR',
    language: 'french',
    columns: {
      question: 'Question',
      answer: 'Répondre',
      optionOne: 'Option 1',
      optionTwo: 'Option deux',
      optionThree: 'Option trois',
      category: 'Catégorie',
      subCategory: 'Sous-catégorie',
      wikipediaLink: 'Wikipedia Link',
      examType: 'Type d\'examen',
      index: 'Indice',
      approved: 'Approuvé'
    }
  }
};

// Enhanced parseExcelSheet function to preserve original data
const parseExcelSheetWithDetails = (workbook, config) => {
  const worksheet = workbook.Sheets[config.sheetName];
  
  if (!worksheet) {
    throw new Error(`Sheet "${config.sheetName}" not found in Excel file`);
  }

  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (jsonData.length < 2) {
    throw new Error(`Sheet "${config.sheetName}" is empty or has no data`);
  }

  const headers = jsonData[0];
  const dataRows = jsonData.slice(1);

  const columnIndices = {};
  Object.keys(config.columns).forEach(key => {
    const columnName = config.columns[key];
    const index = headers.findIndex(header => 
      header && header.toString().toLowerCase().includes(columnName.toLowerCase())
    );
    if (index !== -1) {
      columnIndices[key] = index;
    }
  });

  const requiredColumns = ['question', 'answer', 'optionOne', 'optionTwo', 'optionThree'];
  const missingColumns = requiredColumns.filter(col => columnIndices[col] === undefined);
  
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns in ${config.sheetName}: ${missingColumns.join(', ')}`);
  }

  const parsedQuestions = [];
  
  dataRows.forEach((row, index) => {
    try {
      if (!row || row.length === 0) return;
      
      const question = row[columnIndices.question];
      const answer = row[columnIndices.answer];
      const optionOne = row[columnIndices.optionOne];
      const optionTwo = row[columnIndices.optionTwo];
      const optionThree = row[columnIndices.optionThree];

      if (!question || !answer || !optionOne || !optionTwo || !optionThree) {
        return;
      }

      const options = [optionOne, optionTwo, optionThree].map(opt => opt.toString().trim());
      
      const correctAnswerIndex = options.findIndex(option => 
        option.toLowerCase() === answer.toString().toLowerCase().trim()
      );

      if (correctAnswerIndex === -1) {
        options.unshift(answer.toString().trim());
      }

      // FIXED: Enhanced approved parsing to handle all cases including accented characters
      let approvedValue = false;
      if (columnIndices.approved !== undefined && row[columnIndices.approved] !== undefined) {
        const approvedCell = row[columnIndices.approved];
        if (approvedCell !== null && approvedCell !== '') {
          // Use String() to safely convert and trim
          const approvedStr = String(approvedCell).trim().toLowerCase();
          
          // Check for various approved values
          approvedValue = approvedStr === 'yes' || 
                         approvedStr === 'sí' ||  // Spanish with accent
                         approvedStr === 'si' ||  // Spanish without accent
                         approvedStr === 'oui' || // French
                         approvedStr === 'true' ||
                         approvedStr === '1' ||
                         approvedCell === true ||
                         approvedCell === 1;
          
          // Debug log for first few questions
          if (index < 5) {
            console.log(`[${config.language}] Row ${index + 2} - Approved: "${approvedCell}" (type: ${typeof approvedCell}) => ${approvedValue}`);
          }
        }
      }

      const questionData = {
        question: question.toString().trim(),
        language: config.language,
        options: options,
        correctAnswer: correctAnswerIndex === -1 ? 0 : correctAnswerIndex,
        correctAnswerText: answer.toString().trim(),
        category: row[columnIndices.category] ? row[columnIndices.category].toString().trim() : 'General',
        subCategory: row[columnIndices.subCategory] ? row[columnIndices.subCategory].toString().trim() : '',
        examType: row[columnIndices.examType] ? row[columnIndices.examType].toString().trim() : 'MCAT',
        wikipediaLink: row[columnIndices.wikipediaLink] ? row[columnIndices.wikipediaLink].toString().trim() : '',
        originalIndex: row[columnIndices.index] ? parseInt(row[columnIndices.index]) : index + 1,
        approved: approvedValue, // Use enhanced parsing result
        status: 'active',
        importSource: 'excel_import'
      };

      parsedQuestions.push(questionData);
      
    } catch (error) {
      console.error(`Error parsing row ${index + 2} in ${config.sheetName}:`, error.message);
    }
  });

  // Log summary of approved status
  const approvedCount = parsedQuestions.filter(q => q.approved).length;
  console.log(`[${config.language}] Parsed ${parsedQuestions.length} questions, ${approvedCount} approved`);

  return parsedQuestions;
};

// Import Excel questions - FIXED VERSION
export const importExcelQuestions = async (req, res) => {
  try {
    console.log('📊 Import Excel questions called');
    
    // Check if user is authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Check if this is a force import request
    const isForceImport = req.body.forceImport === 'true';
    
    if (isForceImport) {
      // Handle force import of skipped questions
      console.log('🔄 Force import requested');
      
      let skippedQuestions = [];
      try {
        skippedQuestions = JSON.parse(req.body.skippedQuestions || '[]');
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid skipped questions data',
          code: 'INVALID_DATA'
        });
      }

      if (skippedQuestions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No skipped questions to import',
          code: 'NO_DATA'
        });
      }

      let imported = 0;
      let failed = 0;
      let errors = [];

      // Process each skipped question
      for (const skippedQuestion of skippedQuestions) {
        try {
          // For force import, we'll update existing questions or create new ones
          if (skippedQuestion.reason?.includes('Duplicate')) {
            // Update existing question - PRESERVE APPROVED STATUS
            const updated = await Questions.findOneAndUpdate(
              {
                question: skippedQuestion.question,
                language: skippedQuestion.language
              },
              {
                ...skippedQuestion.originalData,
                updatedAt: new Date(),
                forceImported: true,
                // PRESERVE original approved status - CRITICAL!
                approved: skippedQuestion.originalData?.approved === true,
                status: skippedQuestion.originalData?.status || 'active'
              },
              { new: true, upsert: true }
            );
            
            if (updated) {
              imported++;
              console.log(`✅ Force updated question with approved=${updated.approved}`);
            } else {
              failed++;
            }
          } else {
            // Create new question - PRESERVE APPROVED STATUS
            const newQuestion = new Questions({
              question: skippedQuestion.question || 'Untitled Question',
              language: skippedQuestion.language || 'english',
              options: skippedQuestion.originalData?.options || ['Option 1', 'Option 2'],
              correctAnswer: skippedQuestion.originalData?.correctAnswer || 0,
              correctAnswerText: skippedQuestion.originalData?.correctAnswerText || 'Option 1',
              category: skippedQuestion.category || 'Uncategorized',
              creator: req.user.userId,
              importDate: new Date(),
              forceImported: true,
              // PRESERVE original status and approved values - CRITICAL!
              status: skippedQuestion.originalData?.status || 'active',
              approved: skippedQuestion.originalData?.approved === true
            });

            await newQuestion.save({ validateBeforeSave: false });
            imported++;
            console.log(`✅ Force created question with approved=${newQuestion.approved}`);
          }
        } catch (error) {
          console.error(`Failed to force import question: ${error.message}`);
          errors.push(`${skippedQuestion.question?.substring(0, 50)}...: ${error.message}`);
          failed++;
        }
      }

      return res.status(200).json({
        success: true,
        message: `Force imported ${imported} questions. ${failed} failed.`,
        imported,
        failed,
        errors: errors.slice(0, 10)
      });
    }

    // Normal import process
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No Excel file uploaded',
        code: 'FILE_REQUIRED'
      });
    }

    // Parse selected languages
    let selectedLanguages = ['english'];
    if (req.body.languages) {
      try {
        selectedLanguages = JSON.parse(req.body.languages);
      } catch (error) {
        console.error('Error parsing languages:', error);
      }
    }

    console.log('Selected languages:', selectedLanguages);
    console.log('Uploaded file:', req.file.filename);

    // Read the Excel file
    const workbook = XLSX.readFile(req.file.path);
    console.log('Available sheets:', workbook.SheetNames);

    let totalImported = 0;
    let totalSkipped = 0;
    let totalDuplicates = 0;
    let allErrors = [];
    let allSkippedQuestions = [];
    let allImportedQuestions = [];

    // Process each selected language
    for (const language of selectedLanguages) {
      try {
        console.log(`\n🌍 Processing ${language} questions...`);
        
        const config = languageConfigs[language];
        if (!config) {
          allErrors.push(`Unsupported language: ${language}`);
          continue;
        }

        // Parse questions from the sheet with enhanced data
        const questions = parseExcelSheetWithDetails(workbook, config);
        console.log(`📝 Parsed ${questions.length} questions for ${language}`);

        if (questions.length === 0) {
          allErrors.push(`No valid questions found in ${config.sheetName}`);
          continue;
        }

        // Log sample of parsed data for debugging
        console.log(`Sample parsed data (first 3 questions):`);
        questions.slice(0, 3).forEach((q, i) => {
          console.log(`  Q${i + 1}: approved=${q.approved}, question="${q.question.substring(0, 40)}..."`);
        });

        // Bulk import questions with enhanced tracking
        const result = await Questions.bulkImportQuestions(questions, req.user.userId);
        
        totalImported += result.imported;
        totalSkipped += result.skipped;
        totalDuplicates += result.duplicates || 0;
        allErrors = allErrors.concat(result.errors);
        
        // Skipped questions already have originalData from bulkImportQuestions
        if (result.skippedQuestions && result.skippedQuestions.length > 0) {
          allSkippedQuestions = allSkippedQuestions.concat(result.skippedQuestions);
        }
        
        if (result.importedQuestions && result.importedQuestions.length > 0) {
          allImportedQuestions = allImportedQuestions.concat(result.importedQuestions);
        }

        console.log(`✅ ${language} import result:`, {
          imported: result.imported,
          skipped: result.skipped,
          duplicates: result.duplicates || 0
        });
        
      } catch (error) {
        console.error(`Error processing ${language}:`, error.message);
        allErrors.push(`${language}: ${error.message}`);
      }
    }

    // Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (error) {
      console.error('Error deleting uploaded file:', error);
    }

    // Prepare response
    const success = totalImported > 0 || totalSkipped > 0;
    let message = '';
    
    if (totalImported > 0 && totalSkipped === 0) {
      message = `Successfully imported all ${totalImported} questions!`;
    } else if (totalImported > 0 && totalSkipped > 0) {
      message = `Imported ${totalImported} questions. ${totalSkipped} questions were skipped (${totalDuplicates} duplicates).`;
    } else if (totalImported === 0 && totalSkipped > 0) {
      message = `No new questions imported. All ${totalSkipped} questions were skipped (${totalDuplicates} duplicates).`;
    } else {
      message = 'No questions were processed from the file.';
    }

    // Log final summary
    console.log('\n📊 Import Summary:');
    console.log(`  Total Imported: ${totalImported}`);
    console.log(`  Total Skipped: ${totalSkipped}`);
    console.log(`  Total Duplicates: ${totalDuplicates}`);

    res.status(success ? 200 : 400).json({
      success,
      message,
      imported: totalImported,
      skipped: totalSkipped,
      duplicates: totalDuplicates,
      errors: allErrors.slice(0, 10),
      skippedQuestions: allSkippedQuestions,
      quizzes: allImportedQuestions,
      processedLanguages: selectedLanguages,
      summary: {
        totalProcessed: totalImported + totalSkipped,
        successRate: totalImported > 0 ? ((totalImported / (totalImported + totalSkipped)) * 100).toFixed(1) + '%' : '0%'
      }
    });

  } catch (error) {
    console.error('❌ Import Excel error:', error);
    
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Failed to import questions',
      error: error.message,
      code: 'IMPORT_ERROR'
    });
  }
};

// Get all questions with filters
/*export const getAllQuestions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      language = 'all', 
      category = 'all',
      status = 'all',
      approved = 'all',
      search = ''
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (language !== 'all') {
      filter.language = language;
    }
    
    if (category !== 'all') {
      filter.category = new RegExp(category, 'i');
    }
    
    if (status !== 'all') {
      filter.status = status;
    }
    
    if (approved !== 'all') {
      filter.approved = approved === 'true';
    }
    
    if (search) {
      filter.$or = [
        { question: new RegExp(search, 'i') },
        { category: new RegExp(search, 'i') },
        { subCategory: new RegExp(search, 'i') }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get questions with pagination
    const questions = await Questions.find(filter)
    .populate({
      path: 'creator',
      select: 'name email role',
      populate: {
        path: 'profile',
        select: 'firstName lastName profilePic'
      }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    // Get total count
    const total = await Questions.countDocuments(filter);

    res.status(200).json({
      success: true,
      questions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalQuestions: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions',
      error: error.message,
      code: 'FETCH_ERROR'
    });
  }
};*/
// Add these helper functions to your controller file

// 📊 Helper function to get approved question statistics
const getApprovedQuestionStats = async () => {
  try {
    const [
      totalApproved,
      totalCategories,
      totalLanguages,
      recentlyApproved
    ] = await Promise.all([
      Questions.countDocuments({ approved: true }),
      Questions.distinct('category', { approved: true }),
      Questions.distinct('language', { approved: true }),
      Questions.countDocuments({ 
        approved: true, 
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
      })
    ]);

    return {
      approved: totalApproved,
      categories: totalCategories.filter(Boolean),
      languages: totalLanguages.filter(Boolean),
      recentlyApproved,
      total: totalApproved
    };
  } catch (error) {
    console.error('Error getting approved question stats:', error);
    return {
      approved: 0,
      categories: [],
      languages: [],
      recentlyApproved: 0,
      total: 0
    };
  }
};

// 📊 Helper function to get student question statistics (for unapproved questions)
const getStudentQuestionStats = async () => {
  try {
    const [
      totalPending,
      totalCategories,
      totalLanguages,
      recentSubmissions,
      needsReview
    ] = await Promise.all([
      Questions.countDocuments({ approved: false }),
      Questions.distinct('category', { approved: false }),
      Questions.distinct('language', { approved: false }),
      Questions.countDocuments({ 
        approved: false, 
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }),
      Questions.countDocuments({ 
        approved: false, 
        moderationStatus: 'needs_review' 
      })
    ]);

    return {
      pending: totalPending,
      categories: totalCategories.filter(Boolean),
      languages: totalLanguages.filter(Boolean),
      recentSubmissions,
      needsReview,
      total: totalPending
    };
  } catch (error) {
    console.error('Error getting student question stats:', error);
    return {
      pending: 0,
      categories: [],
      languages: [],
      recentSubmissions: 0,
      needsReview: 0,
      total: 0
    };
  }
};

// Fixed getAllStudentQuestions function
export const getAllStudentQuestions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      language = 'all', 
      category = 'all',
      status = 'all',
      search = ''
    } = req.query;

    // Build filter object - ALWAYS filter for non-approved questions only
    const filter = {
      approved: false // for all the unapproved questions
    };
    
    if (language !== 'all') {
      filter.language = language;
    }
    
    if (category !== 'all') {
      filter.category = new RegExp(category, 'i');
    }
    
    if (status !== 'all') {
      filter.status = status;
    }
    
    if (search) {
      filter.$or = [
        { question: new RegExp(search, 'i') },
        { category: new RegExp(search, 'i') },
        { subCategory: new RegExp(search, 'i') }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get questions with pagination
    const questions = await Questions.find(filter)
    .populate({
      path: 'creator',
      select: 'name email role',
      populate: {
        path: 'profile',
        select: 'firstName lastName profilePic'
      }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    // Get total count for non-approved questions only
    const total = await Questions.countDocuments(filter);

    // 📊 Add stats for student questions (FIXED: Use correct function)
    const stats = await getStudentQuestionStats();

    res.status(200).json({
      success: true,
      questions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalQuestions: total,
        limit: parseInt(limit)
      },
      stats // Include stats about student questions
    });

  } catch (error) {
    console.error('❌ Get student questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student questions',
      error: error.message,
      code: 'STUDENT_QUESTIONS_FETCH_ERROR'
    });
  }
};

// Fixed getAllQuestions function (for approved questions)
export const getAllQuestions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      language = 'all', 
      category = 'all',
      status = 'all',
      search = ''
    } = req.query;

    // Build filter object - ALWAYS filter for approved questions only
    const filter = {
      approved: true // 🔥 KEY CHANGE: Only return approved questions
    };
    
    if (language !== 'all') {
      filter.language = language;
    }
    
    if (category !== 'all') {
      filter.category = new RegExp(category, 'i');
    }
    
    if (status !== 'all') {
      filter.status = status;
    }
    
    if (search) {
      filter.$or = [
        { question: new RegExp(search, 'i') },
        { category: new RegExp(search, 'i') },
        { subCategory: new RegExp(search, 'i') }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get questions with pagination
    const questions = await Questions.find(filter)
    .populate({
      path: 'creator',
      select: 'name email role',
      populate: {
        path: 'profile',
        select: 'firstName lastName profilePic'
      }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    // Get total count for approved questions only
    const total = await Questions.countDocuments(filter);

    // 📊 Add stats for approved questions
    const stats = await getApprovedQuestionStats();

    res.status(200).json({
      success: true,
      questions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalQuestions: total,
        limit: parseInt(limit)
      },
      stats // Include stats about approved questions
    });

  } catch (error) {
    console.error('❌ Get approved questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approved questions',
      error: error.message,
      code: 'APPROVED_QUESTIONS_FETCH_ERROR'
    });
  }
};


// Get random questions for quiz
export const getRandomQuestions = async (req, res) => {
  try {
    const { 
      count = 10, 
      language = 'english', 
      category = 'all',
      difficulty = 'all'
    } = req.query;

    // Build filter
    const filter = {
      language: language,
      status: 'active',
      approved: true
    };

    if (category !== 'all') {
      filter.category = new RegExp(category, 'i');
    }

    if (difficulty !== 'all') {
      filter.difficulty = difficulty;
    }

    // Get random questions
    const questions = await Questions.aggregate([
      { $match: filter },
      { $sample: { size: parseInt(count) } },
      {
        $project: {
          question: 1,
          options: 1,
          correctAnswer: 1,
          category: 1,
          subCategory: 1,
          language: 1,
          difficulty: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      questions,
      count: questions.length,
      requestedCount: parseInt(count)
    });

  } catch (error) {
    console.error('❌ Get random questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch random questions',
      error: error.message,
      code: 'FETCH_ERROR'
    });
  }
};

// Create single question - PRESERVE APPROVED STATUS
export const createQuestion = async (req, res) => {
  try {
    const questionData = {
      ...req.body,
      creator: req.user.userId,  
      importSource: 'manual_entry',
      approved: req.body.approved === true,
    };

    const newQuestion = new Questions(questionData);
    await newQuestion.save();

    
      
    // 3. Check if the user is not an admin (i.e., user can be a student or any non-admin role)
    //if (req.user.role !== "admin") {
      let performanceAnalytics = await PerformanceAnalytics.findOne({ userId: req.user.userId });

      if (!performanceAnalytics) {
        performanceAnalytics = new PerformanceAnalytics({
          userId: req.user.userId,
          cumulativeScore: 1, 
        });
      } else {
        performanceAnalytics.cumulativeScore += 1;
      }

      await performanceAnalytics.save();
   // }
    
    await newQuestion.populate('creator', 'name email role');

    console.log(`✅ Created question with approved=${newQuestion.approved}`);
    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      question: newQuestion,
    });
  } catch (error) {
    console.error('❌ Create question error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create question',
      error: error.message,
      code: 'CREATE_ERROR',
    });
  }
};


// Update question
export const updateQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    
    const updatedQuestion = await Questions.findByIdAndUpdate(
      questionId,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('creator', 'name email role');

    if (!updatedQuestion) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
        code: 'NOT_FOUND'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Question updated successfully',
      question: updatedQuestion
    });

  } catch (error) {
    console.error('❌ Update question error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update question',
      error: error.message,
      code: 'UPDATE_ERROR'
    });
  }
};

// Delete question
export const deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    
    const deletedQuestion = await Questions.findByIdAndDelete(questionId);

    if (!deletedQuestion) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
        code: 'NOT_FOUND'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Question deleted successfully',
      deletedQuestion
    });

  } catch (error) {
    console.error('❌ Delete question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete question',
      error: error.message,
      code: 'DELETE_ERROR'
    });
  }
};

// Bulk operations
export const bulkUpdateQuestions = async (req, res) => {
  try {
    const { questionIds, updateData } = req.body;

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Question IDs array is required',
        code: 'INVALID_INPUT'
      });
    }

    const result = await Questions.updateMany(
      { _id: { $in: questionIds } },
      { ...updateData, updatedAt: new Date() }
    );

    res.status(200).json({
      success: true,
      message: `Updated ${result.modifiedCount} questions`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('❌ Bulk update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update questions',
      error: error.message,
      code: 'BULK_UPDATE_ERROR'
    });
  }
};

export const bulkDeleteQuestions = async (req, res) => {
  try {
    const { questionIds } = req.body;

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Question IDs array is required',
        code: 'INVALID_INPUT'
      });
    }

    const result = await Questions.deleteMany({
      _id: { $in: questionIds }
    });

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} questions`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('❌ Bulk delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk delete questions',
      error: error.message,
      code: 'BULK_DELETE_ERROR'
    });
  }
};

// Function to approve the question and update points for the student
export const approveQuestionController = async (req, res) => {
  try {
    const Questions = (await import('../models/QuestionsModel.js')).default;
    const { questionId } = req.params;
    const { approved } = req.body;

    // Update the question's approved status
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

    // If the question is approved, update the student's cumulative score
    if (approved === true) {
      // Find the student who created the question
      const student = await userModel.findById(question.creator);

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
          code: 'STUDENT_NOT_FOUND'
        });
      }

      // Find the student's performance analytics
      let performanceAnalytics = await PerformanceAnalytics.findOne({ userId: student._id });

      if (!performanceAnalytics) {
        // If the student doesn't have performance analytics, create a new record
        performanceAnalytics = new PerformanceAnalytics({
          userId: student._id,
          cumulativeScore: 10,  // Add 10 points upon approval (starting from 1)
        });
      } else {
        // If the student already has performance analytics, update the cumulative score
        performanceAnalytics.cumulativeScore += 10; // Add 10 points
      }

      // Save the updated performance analytics
      await performanceAnalytics.save();
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
}


// Export the upload middleware
export const uploadMiddleware = upload.single('file');