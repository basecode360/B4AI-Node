import Questions from '../models/QuestionsModel.js';
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

// Helper function to parse Excel data
const parseExcelSheet = (workbook, config) => {
  const worksheet = workbook.Sheets[config.sheetName];
  
  if (!worksheet) {
    throw new Error(`Sheet "${config.sheetName}" not found in Excel file`);
  }

  // Convert sheet to JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (jsonData.length < 2) {
    throw new Error(`Sheet "${config.sheetName}" is empty or has no data`);
  }

  const headers = jsonData[0];
  const dataRows = jsonData.slice(1);

  // Map column indices
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

  // Validate required columns
  const requiredColumns = ['question', 'answer', 'optionOne', 'optionTwo', 'optionThree'];
  const missingColumns = requiredColumns.filter(col => columnIndices[col] === undefined);
  
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns in ${config.sheetName}: ${missingColumns.join(', ')}`);
  }

  // Parse data rows
  const parsedQuestions = [];
  
  dataRows.forEach((row, index) => {
    try {
      if (!row || row.length === 0) return; // Skip empty rows
      
      const question = row[columnIndices.question];
      const answer = row[columnIndices.answer];
      const optionOne = row[columnIndices.optionOne];
      const optionTwo = row[columnIndices.optionTwo];
      const optionThree = row[columnIndices.optionThree];

      // Skip rows with missing essential data
      if (!question || !answer || !optionOne || !optionTwo || !optionThree) {
        return;
      }

      // Create options array
      const options = [optionOne, optionTwo, optionThree].map(opt => opt.toString().trim());
      
      // Find correct answer index
      const correctAnswerIndex = options.findIndex(option => 
        option.toLowerCase() === answer.toString().toLowerCase().trim()
      );

      if (correctAnswerIndex === -1) {
        // If exact match not found, add the answer as the first option
        options.unshift(answer.toString().trim());
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
        approved: row[columnIndices.approved] ? 
          (row[columnIndices.approved].toString().toLowerCase() === 'yes' || 
           row[columnIndices.approved].toString().toLowerCase() === 'sí' || 
           row[columnIndices.approved].toString().toLowerCase() === 'oui') : false,
        status: 'active',
        importSource: 'excel_import'
      };

      parsedQuestions.push(questionData);
      
    } catch (error) {
      console.error(`Error parsing row ${index + 2} in ${config.sheetName}:`, error.message);
    }
  });

  return parsedQuestions;
};

// Import Excel questions
export const importExcelQuestions = async (req, res) => {
  try {
    console.log('📊 Import Excel questions called');
    
    // Check if user is authenticated - Updated for your auth system
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No Excel file uploaded',
        code: 'FILE_REQUIRED'
      });
    }

    // Parse selected languages
    let selectedLanguages = ['english']; // default
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
    let allErrors = [];

    // Process each selected language
    for (const language of selectedLanguages) {
      try {
        console.log(`Processing ${language} questions...`);
        
        const config = languageConfigs[language];
        if (!config) {
          allErrors.push(`Unsupported language: ${language}`);
          continue;
        }

        // Parse questions from the sheet
        const questions = parseExcelSheet(workbook, config);
        console.log(`Parsed ${questions.length} questions for ${language}`);

        if (questions.length === 0) {
          allErrors.push(`No valid questions found in ${config.sheetName}`);
          continue;
        }

        // Bulk import questions - Updated for your auth system
        const result = await Questions.bulkImportQuestions(questions, req.user.userId);
        
        totalImported += result.imported;
        totalSkipped += result.skipped;
        allErrors = allErrors.concat(result.errors);

        console.log(`${language} import result:`, result);
        
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

    // Send response
    const success = totalImported > 0;
    const message = success 
      ? `Successfully imported ${totalImported} questions across ${selectedLanguages.length} language(s)`
      : 'No questions were imported';

    res.status(success ? 200 : 400).json({
      success,
      message,
      imported: totalImported,
      skipped: totalSkipped,
      errors: allErrors.slice(0, 10), // Limit errors to first 10
      processedLanguages: selectedLanguages
    });

  } catch (error) {
    console.error('❌ Import Excel error:', error);
    
    // Clean up uploaded file on error
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
export const getAllQuestions = async (req, res) => {
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
      .populate('creator', 'name email role')
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

// Create single question
export const createQuestion = async (req, res) => {
  try {
    const questionData = {
      ...req.body,
      creator: req.user.userId, // Updated for your auth system
      importSource: 'manual_entry'
    };

    const newQuestion = new Questions(questionData);
    await newQuestion.save();

    // Populate creator info
    await newQuestion.populate('creator', 'name email role');

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      question: newQuestion
    });

  } catch (error) {
    console.error('❌ Create question error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create question',
      error: error.message,
      code: 'CREATE_ERROR'
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

// Export the upload middleware
export const uploadMiddleware = upload.single('file');