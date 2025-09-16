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
import compression from 'compression';
import revenueRoutes from './routes/revenue.route.js';

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

app.set('trust proxy', 1);
app.use(compression());
const corsOption = {
  origin: (origin, callback) => {
    // List of allowed origins
    const allowedOrigins = [
      'https://208.109.35.167',
      'https://app.lekh.io',
      'http://app.lekh.io',
      'https://api.lekh.io',
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

  // ✅ Log language parameter if present
  if (req.query.language) {
  }

  if (req.path.includes('/import-excel')) {
  }

  // ✅ Log quiz-related requests with more detail
  if (req.path.includes('/quiz/')) {
  }

  next();
});

const PORT = process.env.PORT || 9003;
const HOST = process.env.HOST || '127.0.0.1';

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
      admin: '/api/v1/admin', // ✅ NEW: Admin endpoints
      categories: '/api/v1/categories',
      subcategories: '/api/v1/subcategories',
    },
    port: PORT,
    host: HOST,
    timestamp: new Date().toISOString(),
    availableRoutes: [
      '/api/v1/auth - Authentication routes',
      '/api/v1/quiz - Quiz management routes with language support',
      '/api/v1/questions - Questions management and import routes',
      '/api/v1/analytics - Analytics and performance routes',
      '/api/v1/admin - Admin management routes (active users, etc.)', // ✅ NEW
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
    // ✅ NEW: Admin features
    adminFeatures: {
      activeUsers: '/api/v1/admin/active-users',
      activeUserStats: '/api/v1/admin/active-users/stats',
      requiresAuth: true,
      requiresAdminRole: true,
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
      activeUserTracking: 'enabled', // ✅ NEW
    },
  });
});

// ✅ QUESTIONS ROUTE FIRST (before other routes to avoid conflicts)
// app.use('/api/v1/questions', questionsRoutes);
app.use('/api/v1/stripe', stripeRoutes);

// ✅ Other API routes with enhanced logging
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/quiz', quizRoute);
app.use('/api/v1/student-quiz', studentQuizRoute);
app.use('/api/v1/analytics', analyticsRoute);

// ✅ NEW: Active Users Management Route (Admin only)

app.use('/api/v1/universities', universitiesRoutes);

// ✅ EXISTING ROUTES
app.use('/api/v1/countries', countriesRoutes);
app.use('/api/v1/educational-status', educationalStatusRoutes);
app.use('/api/v1/specialties', specialtiesRoutes);

// ✅ Route-specific logging middleware with language awareness
// app.use(
//   '/api/v1/quiz',
//   (req, res, next) => {
//     if (req.query.language) {
//     }
//     next();
//   },
//   quizRoute
// );

app.use(
  '/api/v1/questions',
  (req, res, next) => {
    next();
  },
  questionsRoutes
);

app.use(
  '/api/v1/analytics',
  (req, res, next) => {
    next();
  },
  analyticsRoute
);
app.use('/api/v1/revenue', revenueRoutes);

// ✅ NEW: Active user route logging middleware
app.use('/api/v1/admin', (req, res, next) => {
  if (req.path.includes('active-users')) {
  }
  next();
});

// ✅ UPDATED API Documentation endpoint with active users support
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

          'POST /forgot-password - Forgot password',
          'POST /reset-password - Reset password',
        ],
      },
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
      // ✅ NEW: Admin Management endpoints
      admin: {
        base: '/api/v1/admin',
        routes: [
          'GET /active-users - Get currently active users (Admin only)',
          'GET /active-users/stats - Get active user statistics (Admin only)',
        ],
        description: 'Admin-only endpoints for system management',
        authentication: 'Requires valid JWT token and admin role',
        examples: [
          'GET /api/v1/admin/active-users?timeframe=24h&page=1&limit=20',
          'GET /api/v1/admin/active-users?role=admin&sortBy=lastActive',
          'GET /api/v1/admin/active-users/stats',
        ],
        features: [
          'Real-time active user tracking',
          'Session-based activity detection',
          'Role-based filtering',
          'Pagination support',
          'Time-based activity filtering (24h, 7d, 30d)',
          'Automatic logout detection',
        ],
      },
      // ✅ EXISTING: Categories documentation
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
      // ✅ EXISTING: Subcategories documentation
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

  // ✅ Log language context if available
  if (req.query.language) {
  }


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

  // ✅ Check if it's a language-related query
  if (req.query.language) {
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
      '/api/v1/admin', // ✅ NEW
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

// ✅ Enhanced server startup with active user management info
app.listen(PORT, HOST, () => {
  connectDB();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  app.close(() => {
    mongoose.connection.close(false, () => {
      process.exit(0);
    });
  });
});

export default app;
