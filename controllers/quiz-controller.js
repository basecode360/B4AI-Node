// COMPLETE BACKEND FOR STUDENTQUIZZES COLLECTION

import { Quiz } from "../models/quizModel.js";

const addQuestion = async (req, res) => {
  try {
    const { userId, question, answers, correctAnswerIndex, category, subCategory } = req.body;

    console.log("\n=== INCOMING REQUEST DATA ===");
    console.log("Request Body:", req.body);

    // Validation
    if (!userId || !question) {
      return res.status(400).json({
        success: false,
        message: "User ID and question are required",
      });
    }

    if (!answers || !Array.isArray(answers) || answers.length !== 4) {
      return res.status(400).json({
        success: false,
        message: "Exactly 4 answer options are required",
      });
    }

    if (correctAnswerIndex === null || correctAnswerIndex === undefined) {
      return res.status(400).json({
        success: false,
        message: "Correct answer index is required",
      });
    }

    if (correctAnswerIndex < 0 || correctAnswerIndex > 3) {
      return res.status(400).json({
        success: false,
        message: "Correct answer index must be between 0 and 3",
      });
    }

    console.log("✅ Validation passed");
    console.log("Processing data for studentquizzes collection...");

    // Create document for studentquizzes collection
    const questionDocument = {
      userId: userId,
      question: question.trim(),
      options: answers.map(ans => ans.trim()), // Array of strings
      correctAnswer: correctAnswerIndex, // Index number (0, 1, 2)
      category: category || null,
      subCategory: subCategory || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log("\n=== DOCUMENT TO BE SAVED ===");
    console.log(JSON.stringify(questionDocument, null, 2));

    // Save to studentquizzes collection
    const newQuestion = new Quiz(questionDocument);
    const savedQuestion = await newQuestion.save();

    console.log("\n✅ SUCCESSFULLY SAVED TO STUDENTQUIZZES COLLECTION");
    console.log("Document ID:", savedQuestion._id);
    console.log("Collection: studentquizzes");

    // Success response
    res.status(201).json({
      success: true,
      message: "Question added to studentquizzes collection successfully",
      data: {
        _id: savedQuestion._id,
        questionId: savedQuestion._id,
        question: savedQuestion.question,
        options: savedQuestion.options,
        correctAnswerIndex: savedQuestion.correctAnswer,
        correctAnswerText: savedQuestion.options[savedQuestion.correctAnswer],
        category: savedQuestion.category,
        subCategory: savedQuestion.subCategory,
        totalOptions: savedQuestion.options.length,
        collection: "studentquizzes",
        createdAt: savedQuestion.createdAt
      },
    });

    console.log("=== END PROCESSING ===\n");

  } catch (error) {
    console.error("\n❌ ERROR SAVING TO DATABASE:");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    res.status(500).json({
      success: false,
      message: "Failed to save to studentquizzes collection",
      error: error.message,
    });
  }
};

// Get questions from studentquizzes collection
const getQuestion = async (req, res) => {
  const userId = req.user?.userId;
  
  try {
    console.log("\n=== FETCHING FROM STUDENTQUIZZES COLLECTION ===");
    console.log("Current user ID:", userId);

    // Get questions from other users (not current user)
    const otherUserQuestions = await Quiz.find({
      userId: { $ne: userId } // Not equal to current user
    }).select('question options correctAnswer category subCategory createdAt userId');

    console.log("Found questions:", otherUserQuestions.length);

    return res.status(200).json({
      success: true,
      message: "Questions fetched from studentquizzes collection",
      data: {
        questions: otherUserQuestions,
        total: otherUserQuestions.length,
        collection: "studentquizzes"
      }
    });
    
  } catch (error) {
    console.error("Error fetching questions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch from studentquizzes collection",
      error: error.message,
    });
  }
};

// Get all questions (for testing)
const getAllQuestions = async (req, res) => {
  try {
    console.log("\n=== FETCHING ALL FROM STUDENTQUIZZES ===");
    
    const allQuestions = await Quiz.find({}).sort({ createdAt: -1 });
    
    console.log("Total questions in studentquizzes:", allQuestions.length);

    return res.status(200).json({
      success: true,
      message: "All questions from studentquizzes collection",
      data: {
        questions: allQuestions,
        total: allQuestions.length,
        collection: "studentquizzes"
      }
    });
    
  } catch (error) {
    console.error("Error fetching all questions:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch all questions",
      error: error.message,
    });
  }
};

// Update question with category (optional)
const addCategory = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { category, subCategory } = req.body;

    console.log("\n=== UPDATING CATEGORY IN STUDENTQUIZZES ===");
    console.log("Question ID:", questionId);
    console.log("Category:", category);
    console.log("Sub-Category:", subCategory);

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
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedQuestion) {
      return res.status(404).json({
        success: false,
        message: "Question not found in studentquizzes collection",
      });
    }

    console.log("✅ Category updated successfully");

    res.json({
      success: true,
      message: "Category updated in studentquizzes collection",
      data: {
        _id: updatedQuestion._id,
        question: updatedQuestion.question,
        category: updatedQuestion.category,
        subCategory: updatedQuestion.subCategory,
        options: updatedQuestion.options,
        correctAnswer: updatedQuestion.correctAnswer,
        collection: "studentquizzes"
      },
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update category",
      error: error.message,
    });







  }
};

export { addQuestion, addCategory, getQuestion, getAllQuestions };




