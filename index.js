import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./utils/db.js";
import authRoutes from "./routes/user.route.js";
import quizRoute from "./routes/quiz.route.js";
import analyticsRoute from "./routes/analytics.route.js";
import cookieParser from "cookie-parser";

// Load environment variables
dotenv.config();

const app = express();

const corsOption = {
  origin: (origin, callback) => {
    // List of allowed origins for ngrok and beta users
    const allowedOrigins = [
      'https://*.ngrok-free.app',  // Allow ngrok domains for beta users
      'exp://192.168.18.112:8081',  // Expo app (device/emulator)
      'exp://localhost:8081',       // Expo app (local)
      'https://b4ai.netlify.app',
      'http://localhost:3000', // Local development
    ];

    // Check if the origin is in the allowed list
    if (!origin || allowedOrigins.some(domain => origin.includes(domain))) {
      callback(null, true);  // Allow the origin
    } else {
      callback(new Error('Not allowed by CORS'));  // Reject other origins
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type", 
    "Authorization", 
    "Cookie",
    "X-Requested-With", 
    "Accept",
    "ngrok-skip-browser-warning",
  ],
  optionsSuccessStatus: 200  // For legacy browser support
};


// Middleware setup
app.use(cors(corsOption));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ✅ Fixed - No template literals
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || "0.0.0.0";

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "BoardBullets API Server is running!",
    port: PORT,
    host: HOST,
    timestamp: new Date().toISOString(),
    availableRoutes: [
      "/api/v1/auth - Authentication routes",
      "/api/v1/quiz - Quiz management routes", 
      "/api/v1/analytics - Analytics and performance routes" // 🆕 Added analytics info
    ]
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    server: "running",
    port: PORT,
    host: HOST,
    database: "connected", // Assuming DB is connected
    services: {
      auth: "✅ Active",
      quiz: "✅ Active", 
      analytics: "✅ Active" // 🆕 Analytics service status
    }
  });
});

// 🆕 API Routes with enhanced logging
app.use("/api/v1/auth", (req, res, next) => {
  console.log(`🔐 Auth route accessed: ${req.method} ${req.path}`);
  next();
}, authRoutes);

app.use("/api/v1/quiz", (req, res, next) => {
  console.log(`🧠 Quiz route accessed: ${req.method} ${req.path}`);
  next();
}, quizRoute);

app.use("/api/v1/analytics", (req, res, next) => {
  console.log(`📊 Analytics route accessed: ${req.method} ${req.path}`);
  next();
}, analyticsRoute); // 🆕 Analytics route with logging

// 🆕 API Documentation endpoint
app.get("/api", (req, res) => {
  res.json({
    message: "BoardBullets API Documentation",
    version: "1.0.0",
    endpoints: {
      auth: {
        base: "/api/v1/auth",
        routes: [
          "POST /register - User registration",
          "POST /login - User login",
          "POST /verify-email - Email verification",
          "GET /profile/:userId - Get user profile",
          "PUT /update-profile - Update user profile",
          "POST /logout - User logout",
          "POST /forgot-password - Forgot password",
          "POST /reset-password - Reset password"
        ]
      },
      quiz: {
        base: "/api/v1/quiz",
        routes: [
          "GET /get-question - Get quiz questions",
          "POST /add-question - Add new question",
          "PUT /add-category/:questionId - Add category to question",
          "GET /manage-quizzes - Admin: Get all quizzes",
          "POST /manage-quizzes - Admin: Create new quiz",
          "PUT /manage-quizzes/:quizId - Admin: Update quiz",
          "DELETE /manage-quizzes/:quizId - Admin: Delete quiz",
          "GET /student-submissions - Admin: Get student submissions",
          "POST /student-submissions - Submit quiz for review"
        ]
      },
      analytics: {
        base: "/api/v1/analytics",
        routes: [
          "POST /update-analytics - Update user analytics after quiz",
          "GET /user-stats - Get user performance statistics",
          "GET /last-quiz - Get last quiz details",
          "GET /bb-points-summary - Get BB Points summary",
          "GET /overview - Get complete analytics overview",
          "GET /leaderboard - Get leaderboard data",
          "DELETE /reset-analytics - Reset user analytics (testing)"
        ]
      }
    }
  });
});

// 🆕 Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error(`❌ Error occurred: ${err.message}`);
  console.error(`📍 Route: ${req.method} ${req.path}`);
  console.error(`🔍 Stack: ${err.stack}`);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format"
    });
  }
  
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Resource already exists"
    });
  }
  
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === 'development' ? err.message : "Something went wrong"
  });
});

// 🆕 Handle 404 for unknown routes
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: "Route not found",
    requestedRoute: `${req.method} ${req.path}`,
    availableRoutes: [
      "/api/v1/auth",
      "/api/v1/quiz", 
      "/api/v1/analytics"
    ]
  });
});

// Start server with enhanced logging
app.listen(PORT, HOST, () => {
  connectDB();
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`🌐 Network access: http://192.168.18.112:${PORT}`);
  console.log(`📊 Analytics API: http://${HOST}:${PORT}/api/v1/analytics`);
  console.log(`🔗 API Documentation: http://${HOST}:${PORT}/api`);
  console.log(`❤️ Health Check: http://${HOST}:${PORT}/health`);
  
  // 🆕 Show available analytics endpoints
  console.log("\n📊 ANALYTICS ENDPOINTS:");
  console.log("POST   /api/v1/analytics/update-analytics    - Update user analytics");
  console.log("GET    /api/v1/analytics/user-stats         - Get user stats");
  console.log("GET    /api/v1/analytics/last-quiz          - Get last quiz data");
  console.log("GET    /api/v1/analytics/bb-points-summary  - Get BB Points summary");
  console.log("GET    /api/v1/analytics/overview           - Get complete overview");
  console.log("GET    /api/v1/analytics/leaderboard        - Get leaderboard");
  console.log("DELETE /api/v1/analytics/reset-analytics    - Reset analytics (testing)");
});

export default app;
