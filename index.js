import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./utils/db.js";
import authRoutes from "./routes/user.route.js";
import quizRoute from "./routes/quiz.route.js";
import analyticsRoute from "./routes/analytics.route.js";
import universitiesRoutes from "./routes/universities.route.js";
import studentQuizRoute from "./routes/studentQuiz.route.js";
import cookieParser from "cookie-parser";

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
    ];

    // Check if the origin is in the allowed list
    if (!origin || allowedOrigins.some(domain => {
      if (domain.includes('*')) {
        const regex = new RegExp(domain.replace('*', '.*'));
        return regex.test(origin);
      }
      return origin === domain;
    })) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
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
  optionsSuccessStatus: 200
};

// Middleware setup
app.use(cors(corsOption));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || "0.0.0.0";

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "BoardBullets API Server is running!",
    version: "1.0.0",
    endpoints: {
      auth: "/api/v1/auth",
      quiz: "/api/v1/quiz",
      analytics: "/api/v1/analytics"
    },
    port: PORT,
    host: HOST,
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    server: "running",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    port: PORT,
    host: HOST,
    uptime: process.uptime(),
  });
});

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/quiz", quizRoute);
app.use("/api/v1/student-quiz", studentQuizRoute);
app.use("/api/v1/analytics", analyticsRoute);
app.use('/api/v1/universities', universitiesRoutes); 

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Error:", err);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: "CORS policy violation"
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, HOST, () => {
  connectDB();
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`🌐 Network access: http://192.168.18.112:${PORT}`);
  console.log(`📊 Analytics API: http://${HOST}:${PORT}/api/v1/analytics`);
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