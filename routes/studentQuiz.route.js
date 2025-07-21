import express from "express";
import { 
  addQuestion, 
  getAllQuestions, 
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  getCategories,
  debugCollection // Add this for debugging
} from "../controllers/studentquiz-controller.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

console.log("✅ Student Quiz Routes loaded");

// 🐛 DEBUG ROUTE - Add this temporarily to check collection
router.get("/debug", authenticateToken, debugCollection);

// POST: Add question manually
router.post("/add-question", authenticateToken, addQuestion);

// GET: Get all questions with filters
router.get("/questions", authenticateToken, getAllQuestions);

// GET: Get question by ID
router.get("/question/:id", authenticateToken, getQuestionById);

// PUT: Update question
router.put("/question/:id", authenticateToken, updateQuestion);

// DELETE: Delete question (soft delete)
router.delete("/question/:id", authenticateToken, deleteQuestion);

// GET: Get categories
router.get("/categories", getCategories);

export default router;