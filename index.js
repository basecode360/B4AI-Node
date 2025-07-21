import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./utils/db.js";
import authRoutes from "./routes/user.route.js";
import quizRoute from "./routes/quiz.route.js";
import studentQuizRoute from "./routes/studentquiz.route.js";
import analyticsRoute from "./routes/analytics.route.js";
import cookieParser from "cookie-parser";

// ✅ NEW IMPORTS
import universitiesRoutes from './routes/universities.js';
import countriesRoutes from './routes/countries.js';
import educationalStatusRoutes from './routes/educationalStatus.js';
import specialtiesRoutes from './routes/specialties.js';

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

app.get("/", (req, res) => {
  res.json({
    message: "BoardBullets API Server is running!",
    port: PORT,
    host: HOST, // Added for debugging
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    server: "running",
    port: PORT,
    host: HOST,
  });
});

// ✅ FIXED: All routes now use consistent /api/v1/ prefix
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/quiz", quizRoute);
app.use("/api/v1/student-quiz", studentQuizRoute);
app.use("/api/v1/analytics", analyticsRoute);
app.use('/api/v1/universities', universitiesRoutes);

// ✅ NEW ROUTES
app.use('/api/v1/countries', countriesRoutes);
app.use('/api/v1/educational-status', educationalStatusRoutes);
app.use('/api/v1/specialties', specialtiesRoutes);

// Start server
app.listen(PORT, HOST, () => {
  connectDB();
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`🌐 Network access: http://192.168.18.112:${PORT}`);
  console.log(`📚 Universities API: http://${HOST}:${PORT}/api/v1/universities`);
  console.log(`🌍 Countries API: http://${HOST}:${PORT}/api/v1/countries`);
  console.log(`🎓 Educational Status API: http://${HOST}:${PORT}/api/v1/educational-status`);
  console.log(`⚕️ Specialties API: http://${HOST}:${PORT}/api/v1/specialties`);
});

export default app;