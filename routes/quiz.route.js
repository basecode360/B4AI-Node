import express from "express";
import { addCategory, addQuestion, getQuestion } from "../controllers/quiz-controller.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/add-question", addQuestion);

// 2. Category Add API (Screen 2)
router.put("/add-category/:questionId", addCategory);
router.get("/get-question",authenticateToken,getQuestion)

export default router;
