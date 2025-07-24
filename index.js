import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './utils/db.js';
import authRoutes from './routes/user.route.js';
import quizRoute from './routes/quiz.route.js';
import studentQuizRoute from './routes/studentquiz.route.js';
import analyticsRoute from './routes/analytics.route.js';
import universitiesRoutes from './routes/universities.route.js';
import questionsRoutes from './routes/questions.route.js';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';

// ✅ EXISTING IMPORTS
import countriesRoutes from './routes/countries.js';
import educationalStatusRoutes from './routes/educationalStatus.js';
import specialtiesRoutes from './routes/specialties.js';
// ✅ NEW: Separate Categories and Subcategories routes
import categoriesRoutes from './routes/categories.route.js';
import subcategoryRoutes from './routes/subcategory.route.js';

import stripeRoutes from './routes/stripe.js';

// Load environment variables
dotenv.config();

const app = express();

const corsOption = {
  origin: (origin, callback) => {
    // List of allowed origins
    const allowedOrigins = [
      'https://*.ngrok-free.app',
      'exp://192.168.18.112:8081',
      'exp://localhost:8081',
      'https://b4ai.netlify.app',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
    ];

    // Check if the origin is in the allowed list
    if (
      !origin ||
      allowedOrigins.some((domain) => {
        if (domain.includes('*')) {
          const regex = new RegExp(domain.replace('*', '.*'));
          return regex.test(origin);
        }
        return origin === domain;
      })
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // ✅ ADDED PATCH HERE
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Cookie',
    'X-Requested-With',
    'Accept',
    'ngrok-skip-browser-warning',
  ],
  optionsSuccessStatus: 200,
};

// ✅ FIXED MIDDLEWARE ORDER - CORS FIRST
app.use(cors(corsOption));
app.use(cookieParser());

app.use('/api/v1/stripe/webhook', express.raw({ type: 'application/json' }));

// ✅ CONDITIONAL BODY PARSING - Skip JSON parsing for file uploads
app.use((req, res, next) => {
  // Skip JSON parsing for file upload routes
  if (req.path.includes('/import-excel') || req.path.includes('/upload')) {
    return next();
  }

  // Apply JSON parsing for other routes
  express.json({ limit: '50mb' })(req, res, next);
});

app.use((req, res, next) => {
  // Skip URL encoded parsing for file upload routes
  if (req.path.includes('/import-excel') || req.path.includes('/upload')) {
    return next();
  }

  // Apply URL encoded parsing for other routes
  express.urlencoded({ extended: true, limit: '50mb' })(req, res, next);
});

// ✅ Enhanced Request logging middleware with language detection
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);

  // ✅ Log language parameter if present
  if (req.query.language) {
    console.log(`🌐 Language filter detected: ${req.query.language}`);
  }

  if (req.path.includes('/import-excel')) {
    console.log('📁 File upload route detected - skipping JSON parsing');
  }

  // ✅ Log quiz-related requests with more detail
  if (req.path.includes('/quiz/')) {
    console.log('🧠 Quiz API request:', {
      method: req.method,
      path: req.path,
      query: req.query,
      language: req.query.language || 'not specified',
    });
  }

  next();
});

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'BoardBullets API Server is running!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      quiz: '/api/v1/quiz',
      questions: '/api/v1/questions',
      analytics: '/api/v1/analytics',
      categories: '/api/v1/categories', // ✅ NEW
      subcategories: '/api/v1/subcategories', // ✅ NEW
    },
    port: PORT,
    host: HOST,
    timestamp: new Date().toISOString(),
    availableRoutes: [
      '/api/v1/auth - Authentication routes',
      '/api/v1/quiz - Quiz management routes with language support',
      '/api/v1/questions - Questions management and import routes',
      '/api/v1/analytics - Analytics and performance routes',
    ],
    // ✅ New language support info
    languageSupport: {
      enabled: true,
      defaultLanguage: 'english',
      supportedLanguages: ['english', 'spanish', 'french'],
      usage: {
        categories: '/api/v1/quiz/categories?language=spanish',
        questions: '/api/v1/quiz/questions?language=french&category=Biology',
        languages: '/api/v1/quiz/languages',
      },
    },
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    server: 'running',
    database:
      mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    port: PORT,
    host: HOST,
    uptime: process.uptime(),
    // ✅ Add language support status
    features: {
      languageFiltering: 'enabled',
      defaultLanguage: 'english',
      corsEnabled: true,
      fileUploadEnabled: true,
    },
  });
});

// ✅ QUESTIONS ROUTE FIRST (before other routes to avoid conflicts)
app.use('/api/v1/questions', questionsRoutes);
app.use('/api/v1/stripe', stripeRoutes);

// ✅ Other API routes with enhanced logging
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/quiz', quizRoute);
app.use('/api/v1/student-quiz', studentQuizRoute);
app.use('/api/v1/analytics', analyticsRoute);
app.use('/api/v1/universities', universitiesRoutes);

// ✅ EXISTING ROUTES
app.use('/api/v1/countries', countriesRoutes);
app.use('/api/v1/educational-status', educationalStatusRoutes);
app.use('/api/v1/specialties', specialtiesRoutes);

// ✅ Route-specific logging middleware with language awareness
app.use(
  '/api/v1/quiz',
  (req, res, next) => {
    console.log(`🧠 Quiz route accessed: ${req.method} ${req.path}`);
    if (req.query.language) {
      console.log(`🌐 Language filter: ${req.query.language}`);
    }
    next();
  },
  quizRoute
);

app.use(
  '/api/v1/questions',
  (req, res, next) => {
    console.log(`❓ Questions route accessed: ${req.method} ${req.path}`);
    next();
  },
  questionsRoutes
);

app.use(
  '/api/v1/analytics',
  (req, res, next) => {
    console.log(`📊 Analytics route accessed: ${req.method} ${req.path}`);
    next();
  },
  analyticsRoute
);

// ✅ UPDATED API Documentation endpoint with language support
app.get('/api', (req, res) => {
  res.json({
    message: 'BoardBullets API Documentation',
    version: '1.0.0',
    languageSupport: {
      enabled: true,
      defaultLanguage: 'english',
      supportedLanguages: ['english', 'spanish', 'french', 'urdu', 'arabic'],
    },
    endpoints: {
      auth: {
        base: '/api/v1/auth',
        routes: [
          'POST /register - User registration',
          'POST /login - User login',
          'POST /verify-email - Email verification',
          'GET /profile/:userId - Get user profile',
          'PUT /update-profile - Update user profile',
          'POST /logout - User logout',
          'POST /forgot-password - Forgot password',
          'POST /reset-password - Reset password',
        ],
      },
      // Test
      quiz: {
        base: '/api/v1/quiz',
        routes: [
          'GET /categories - Get quiz categories (supports ?language=spanish)',
          'GET /questions - Get quiz questions (supports ?language=french&category=Biology)',
          'GET /languages - Get available languages',
          'GET /subcategories/:category - Get subcategories (supports ?language=urdu)',
          'GET /stats - Get quiz statistics with language breakdown',
          'POST /add-question - Add new question',
          'PUT /add-category/:questionId - Add category to question',
          'GET /get-question - Get quiz questions (legacy)',
          'GET /manage-quizzes - Admin: Get all quizzes',
          'POST /manage-quizzes - Admin: Create new quiz',
          'PUT /manage-quizzes/:quizId - Admin: Update quiz',
          'DELETE /manage-quizzes/:quizId - Admin: Delete quiz',
          'GET /student-submissions - Admin: Get student submissions',
          'POST /student-submissions - Submit quiz for review',
        ],
        languageExamples: [
          'GET /api/v1/quiz/categories?language=spanish',
          'GET /api/v1/quiz/questions?language=french&category=Biology&difficulty=medium',
          'GET /api/v1/quiz/subcategories/Biology?language=urdu',
        ],
      },
      questions: {
        base: '/api/v1/questions',
        routes: [
          'POST /import-excel - Import questions from Excel file (Admin)',
          'GET /all - Get all questions with filters',
          'GET /random - Get random questions for quiz',
          'POST /create - Create single question (Admin)',
          'PUT /update/:questionId - Update question (Admin)',
          'DELETE /delete/:questionId - Delete question (Admin)',
          'PUT /bulk-update - Bulk update questions (Admin)',
          'DELETE /bulk-delete - Bulk delete questions (Admin)',
          'GET /stats - Get questions statistics',
          'GET /category/:category - Get questions by category',
          'GET /categories - Get unique categories',
          'GET /languages - Get available languages',
          'GET /search - Search questions',
          'PATCH /approve/:questionId - Approve/reject question (Admin)',
          'GET /export - Export questions to Excel (Admin)',
        ],
      },
      analytics: {
        base: '/api/v1/analytics',
        routes: [
          'POST /update-analytics - Update user analytics after quiz',
          'GET /user-stats - Get user performance statistics',
          'GET /last-quiz - Get last quiz details',
          'GET /bb-points-summary - Get BB Points summary',
          'GET /overview - Get complete analytics overview',
          'GET /leaderboard - Get leaderboard data',
          'DELETE /reset-analytics - Reset user analytics (testing)',
        ],
      },
      // ✅ NEW: Separate Categories documentation
      categories: {
        base: '/api/v1/categories',
        routes: [
          'GET / - Get all categories',
          'GET /:id - Get category by ID',
          'POST / - Create new category (Admin)',
          'PUT /:id - Update category (Admin)',
          'DELETE /:id - Delete category (Admin)',
          'GET /stats/count - Get categories with question count',
        ],
      },
      // ✅ NEW: Separate Subcategories documentation
      subcategories: {
        base: '/api/v1/subcategories',
        routes: [
          'GET / - Get all subcategories',
          'GET /:id - Get subcategory by ID',
          'POST / - Create new subcategory (Admin)',
          'PUT /:id - Update subcategory (Admin)',
          'DELETE /:id - Delete subcategory (Admin)',
          'GET /stats/count - Get subcategories with question count',
          'GET /search/:searchTerm - Search subcategories by name',
        ],
      },
    },
  });
});

// ✅ Enhanced error handling middleware with language-aware logging
app.use((err, req, res, next) => {
  console.error(`❌ Error occurred: ${err.message}`);
  console.error(`📍 Route: ${req.method} ${req.path}`);

  // ✅ Log language context if available
  if (req.query.language) {
    console.error(`🌐 Language context: ${req.query.language}`);
  }

  console.error(`🔍 Stack: ${err.stack}`);

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
    });
  }

  // ✅ HANDLE JSON PARSING ERRORS
  if (
    err.type === 'entity.parse.failed' ||
    err.message.includes('Unexpected token')
  ) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format or unsupported content type',
      code: 'PARSE_ERROR',
    });
  }

  // ✅ HANDLE FILE SIZE ERRORS
  if (
    err.type === 'entity.too.large' ||
    err.message.includes('request entity too large')
  ) {
    return res.status(413).json({
      success: false,
      message: 'File too large. Maximum file size is 50MB.',
      code: 'FILE_TOO_LARGE',
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map((e) => e.message),
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Resource already exists',
    });
  }

  // Handle multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File size too large. Maximum size is 10MB.',
    });
  }

  if (err.message === 'Only Excel files (.xlsx) are allowed!') {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type. Only Excel files (.xlsx) are allowed.',
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Something went wrong',
  });
});

// ✅ Enhanced 404 handler with language support info
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.path}`);

  // ✅ Check if it's a language-related query
  if (req.query.language) {
    console.log(`🌐 Language parameter was: ${req.query.language}`);
  }

  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedRoute: `${req.method} ${req.path}`,
    availableRoutes: [
      '/api/v1/auth',
      '/api/v1/quiz',
      '/api/v1/questions',
      '/api/v1/analytics',
    ],
    // ✅ Add language support info for 404s
    languageSupport: {
      enabled: true,
      examples: [
        '/api/v1/quiz/categories?language=spanish',
        '/api/v1/quiz/questions?language=french&category=Biology',
      ],
    },
  });
});

// ✅ Enhanced server startup with language support info
app.listen(PORT, HOST, () => {
  connectDB();
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`🌐 Network access: http://192.168.18.112:${PORT}`);
  console.log(
    `🧠 Quiz API with language support: http://${HOST}:${PORT}/api/v1/quiz`
  );
  console.log(
    `📚 Universities API: http://${HOST}:${PORT}/api/v1/universities`
  );
  console.log(`🌍 Countries API: http://${HOST}:${PORT}/api/v1/countries`);
  console.log(
    `🎓 Educational Status API: http://${HOST}:${PORT}/api/v1/educational-status`
  );
  console.log(`⚕️ Specialties API: http://${HOST}:${PORT}/api/v1/specialties`);
  console.log(`📊 Analytics API: http://${HOST}:${PORT}/api/v1/analytics`);
  console.log(`❓ Questions API: http://${HOST}:${PORT}/api/v1/questions`);
  // ✅ NEW: Separate Categories and Subcategories API logs
  console.log(`📂 Categories API: http://${HOST}:${PORT}/api/v1/categories`);
  console.log(
    `📁 Subcategories API: http://${HOST}:${PORT}/api/v1/subcategories`
  );
  console.log(`📁 File upload limit: 50MB`);
  console.log(`✅ Conditional body parsing enabled for file uploads`);
  console.log(`🌐 Language filtering enabled for quiz endpoints`);
  console.log(
    `🔗 Example: http://${HOST}:${PORT}/api/v1/quiz/categories?language=spanish`
  );
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  app.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

export default app;
