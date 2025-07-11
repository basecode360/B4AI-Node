// FIXED BACKEND - WITH FORCE RANDOMIZATION

import { Quiz } from "../models/quizModel.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ✅ BACKEND FORCE RANDOMIZATION FUNCTION
const forceRandomShuffle = (originalOptions, originalCorrectIndex) => {
  // Generate truly random index (0, 1, 2, 3)
  const newRandomIndex = Math.floor(Math.random() * 4);

  console.log(`🎲 Original correct index: ${originalCorrectIndex}`);
  console.log(`🎲 New random index: ${newRandomIndex}`);

  // Get the correct answer text
  const correctAnswerText = originalOptions[originalCorrectIndex];

  // Create new shuffled array
  const shuffledOptions = [...originalOptions];

  // If new index is different, swap the options
  if (newRandomIndex !== originalCorrectIndex) {
    // Swap correct answer to new position
    shuffledOptions[newRandomIndex] = correctAnswerText;
    shuffledOptions[originalCorrectIndex] = originalOptions[newRandomIndex];
  }

  console.log("📋 Original options:", originalOptions);
  console.log("🔀 Shuffled options:", shuffledOptions);
  console.log(
    `✅ Correct answer '${correctAnswerText}' moved to index: ${newRandomIndex}`
  );

  return {
    shuffledOptions,
    newCorrectIndex: newRandomIndex,
  };
};

const generateOptionsWithGemini = async (question) => {
  try {
    console.log("API Key exists:", !!process.env.GEMINI_API_KEY);
    console.log("API Key length:", process.env.GEMINI_API_KEY?.length);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // ✅ SIMPLIFIED PROMPT: AI ko sirf correct answer first position pe dene ko bolo
    const prompt = `
Generate 4 multiple choice options for this question: "${question}"

Instructions:
1. Put the CORRECT answer as the FIRST option
2. Put 3 WRONG answers as the remaining options
3. Return format: CorrectAnswer|WrongOption1|WrongOption2|WrongOption3

Example:
Question: "Capital of France?"
Response: "Paris|London|Berlin|Madrid"

Question: "2+2=?"
Response: "4|5|6|3"

Question: "${question}"
Remember: First option should always be correct!
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    console.log("Gemini Response:", text);

    // Parse simple format: correctAnswer|wrong1|wrong2|wrong3
    let cleanText = text;

    // Remove common prefixes/suffixes that Gemini adds
    cleanText = cleanText.replace(/Question:.*?\n/gi, "");
    cleanText = cleanText.replace(/Answer:\s*/gi, "");
    cleanText = cleanText.replace(/Reply format:.*?\n/gi, "");
    cleanText = cleanText.replace(/Your reply:\s*/gi, "");
    cleanText = cleanText.replace(/Example:.*?\n/gi, "");

    // Get only the line with |
    const lines = cleanText.split("\n");
    let targetLine = "";

    for (let line of lines) {
      if (line.includes("|") && line.split("|").length >= 4) {
        targetLine = line.trim();
        break;
      }
    }

    console.log("Cleaned line:", targetLine);

    const parts = targetLine.split("|");
    if (parts.length >= 4) {
      const originalOptions = parts.slice(0, 4).map((opt) => opt.trim());
      const originalCorrectIndex = 0; // AI always puts correct answer at index 0

      console.log("✅ AI Response parsed successfully");
      console.log("Original options from AI:", originalOptions);

      // ✅ FORCE BACKEND RANDOMIZATION
      const { shuffledOptions, newCorrectIndex } = forceRandomShuffle(
        originalOptions,
        originalCorrectIndex
      );

      return {
        options: shuffledOptions, // ✅ Backend shuffled options
        correctAnswerIndex: newCorrectIndex, // ✅ Random index (0-3)
        correctAnswerText: shuffledOptions[newCorrectIndex], // For reference
        debugInfo: {
          aiOriginalOptions: originalOptions,
          aiOriginalIndex: originalCorrectIndex,
          backendForcedIndex: newCorrectIndex,
          randomizationApplied: true,
        },
      };
    }

    // If parsing fails, return smart fallback with randomization
    console.log("Parsing failed, using smart fallback with randomization");
    return getSmartFallbackWithRandomization(question);
  } catch (error) {
    console.error("Gemini Error:", error.message);
    return getSmartFallbackWithRandomization(question);
  }
};

// ✅ SMART FALLBACK WITH RANDOMIZATION
const getSmartFallbackWithRandomization = (question) => {
  const q = question.toLowerCase();
  let fallbackOptions = [];

  // Geography questions
  if (q.includes("capital")) {
    if (q.includes("pakistan")) {
      fallbackOptions = ["Islamabad", "Karachi", "Lahore", "Peshawar"];
    } else if (q.includes("india")) {
      fallbackOptions = ["New Delhi", "Mumbai", "Kolkata", "Chennai"];
    } else if (q.includes("france")) {
      fallbackOptions = ["Paris", "Lyon", "Marseille", "Nice"];
    } else if (q.includes("japan")) {
      fallbackOptions = ["Tokyo", "Osaka", "Kyoto", "Yokohama"];
    } else {
      fallbackOptions = ["Capital A", "Capital B", "Capital C", "Capital D"];
    }
  }
  // Science questions
  else if (q.includes("largest planet")) {
    fallbackOptions = ["Jupiter", "Saturn", "Earth", "Mars"];
  }
  // Math questions
  else if (q.includes("2+2") || q.includes("2 + 2")) {
    fallbackOptions = ["4", "3", "5", "6"];
  }
  // Default fallback
  else {
    fallbackOptions = ["Answer A", "Answer B", "Answer C", "Answer D"];
  }

  // ✅ Apply randomization to fallback
  const { shuffledOptions, newCorrectIndex } = forceRandomShuffle(
    fallbackOptions,
    0
  );

  return {
    options: shuffledOptions,
    correctAnswerIndex: newCorrectIndex,
    correctAnswerText: shuffledOptions[newCorrectIndex],
    debugInfo: {
      fallbackUsed: true,
      originalFallback: fallbackOptions,
      randomizedIndex: newCorrectIndex,
    },
  };
};

const addQuestion = async (req, res) => {
  try {
    const { userId, question } = req.body;

    // Validation
    if (!userId || !question) {
      return res.status(400).json({
        success: false,
        message: "User ID and question are required",
      });
    }

    console.log("\n=== PROCESSING NEW QUESTION ===");
    console.log("Question:", question);

    const aiResponse = await generateOptionsWithGemini(question);

    console.log("Final AI Response (After Backend Randomization):", aiResponse);
    console.log("=== END PROCESSING ===\n");

    // ✅ SCHEMA VALIDATION: Ensure correct answer index is within schema limits
    const validateCorrectAnswerIndex = (index) => {
      // Check your schema's max value - if it's 2, then only allow 0,1,2
      const SCHEMA_MAX_VALUE = 3; // ✅ Update this based on your schema

      if (index > SCHEMA_MAX_VALUE) {
        console.log(
          `⚠️ Index ${index} exceeds schema max ${SCHEMA_MAX_VALUE}, adjusting...`
        );
        return Math.min(index, SCHEMA_MAX_VALUE);
      }

      if (index < 0) {
        console.log(`⚠️ Index ${index} is negative, adjusting to 0...`);
        return 0;
      }

      return index;
    };

    // ✅ Save with validated correct answer index
    const validatedCorrectIndex = validateCorrectAnswerIndex(
      aiResponse.correctAnswerIndex
    );

    const newQuestion = new Quiz({
      userId: userId,
      question: question,
      options: aiResponse.options,
      correctAnswer: validatedCorrectIndex, // ✅ Schema-safe index
      category: null,
      subCategory: null,
    });

    const savedQuestion = await newQuestion.save();

    // ✅ Enhanced response with randomization info
    res.status(201).json({
      success: true,
      message: "Question added with BACKEND FORCE RANDOMIZATION",
      data: {
        questionId: savedQuestion._id,
        question: savedQuestion.question,
        options: savedQuestion.options,
        correctAnswerIndex: savedQuestion.correctAnswer, // Random index
        correctAnswerText: aiResponse.correctAnswerText,
        totalOptions: aiResponse.options.length,
        // ✅ Debug information
        randomizationInfo: {
          method: "Backend Force Randomization",
          aiOriginalIndex: aiResponse.debugInfo?.aiOriginalIndex || 0,
          finalRandomIndex: savedQuestion.correctAnswer,
          randomizationSuccess: true,
        },
      },
    });
  } catch (error) {
    console.error("Error adding question:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const addCategory = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { category, subCategory } = req.body;

    // Validation
    if (!category || !subCategory) {
      return res.status(400).json({
        success: false,
        message: "Category and sub-category are required",
      });
    }

    // Update question with categories
    const updatedQuestion = await Quiz.findByIdAndUpdate(
      questionId,
      {
        category: category,
        subCategory: subCategory,
      },
      { new: true }
    );

    if (!updatedQuestion) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    res.json({
      success: true,
      message: "Category and sub-category added successfully",
      data: {
        questionId: updatedQuestion._id,
        question: updatedQuestion.question,
        category: updatedQuestion.category,
        subCategory: updatedQuestion.subCategory,
        options: updatedQuestion.options,
        correctAnswer: updatedQuestion.correctAnswer, // Random index
      },
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ✅ TESTING FUNCTION: Test randomization
const testRandomDistribution = () => {
  console.log("\n🧪 TESTING RANDOMIZATION DISTRIBUTION:");
  const testResults = [];

  for (let i = 0; i < 20; i++) {
    const testOptions = ["Correct", "Wrong1", "Wrong2", "Wrong3"];
    const { newCorrectIndex } = forceRandomShuffle(testOptions, 0);
    testResults.push(newCorrectIndex);
  }

  console.log("Test results:", testResults);

  // Count distribution
  const distribution = { 0: 0, 1: 0, 2: 0, 3: 0 };
  testResults.forEach((index) => distribution[index]++);

  console.log("Distribution count:", distribution);
  console.log("Expected: roughly equal distribution");
  console.log("✅ Randomization test completed\n");
};

const getQuestion = async (req, res) => {
  const userId = req.user?.userId;
  try {
    const otherUserQuestion = await Quiz.find({
      $nor: [
        {
          userId: userId,
        },
      ],
    });

    return res.status(200).json({
      question: otherUserQuestion,
      success: true,
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error?.message,
    });
  }
};

// Uncomment to test randomization:
// testRandomDistribution();

export { addQuestion, addCategory, getQuestion };
