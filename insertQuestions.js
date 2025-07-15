import mongoose from "mongoose";

// MongoDB URI (Replace with your actual MongoDB URI)
const mongoURI = "mongodb+srv://danie123123:danie123123@cluster0.orbixvd.mongodb.net/";

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.log(err));

// Define the schema for the questions
const questionSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  question: String,
  options: [String],
  correctAnswer: Number,
  category: { type: String, default: null },
  subCategory: { type: String, default: null },
  language: { type: String, default: 'english' },
  difficulty: { type: String, default: 'medium' },
  status: { type: String, default: 'active' },
  tags: [String],
  usageCount: { type: Number, default: 0 },
  successRate: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Question = mongoose.model('quizzes', questionSchema);

// Sample quiz questions data (20 questions)
const quizQuestions = [
  {
    userId: new mongoose.Types.ObjectId(), // Replace with actual userId
    question: "What is the primary focus of active recall quizzes in medical education?",
    options: ["A method of passive learning", "Increasing memory retention", "Memorization of terms", "None of the above"],
    correctAnswer: 1,
    category: "Medical Education",
    difficulty: "medium",
    language: "english",
  },
  {
    userId: new mongoose.Types.ObjectId(), // Replace with actual userId
    question: "Which of the following is the main benefit of using timed quizzes for healthcare professionals?",
    options: ["Increases retention under pressure", "Makes the quiz easier", "Doesn't allow for review", "None of the above"],
    correctAnswer: 0,
    category: "Learning Techniques",
    difficulty: "medium",
    language: "english",
  },
  {
    userId: new mongoose.Types.ObjectId(), // Replace with actual userId
    question: "What is the importance of tracking demographic data in medical education platforms?",
    options: ["Helps in tailoring content", "Monitors progress", "Improves learning outcomes", "All of the above"],
    correctAnswer: 3,
    category: "Data Analytics",
    difficulty: "medium",
    language: "english",
  },
  {
    userId: new mongoose.Types.ObjectId(), // Replace with actual userId
    question: "Which of these is considered an active recall technique in learning?",
    options: ["Reading notes", "Writing flashcards", "Spaced repetition", "All of the above"],
    correctAnswer: 2,
    category: "Study Techniques",
    difficulty: "medium",
    language: "english",
  },
  {
    userId: new mongoose.Types.ObjectId(), // Replace with actual userId
    question: "In a medical quiz app, what does the success rate measure?",
    options: ["Percentage of questions answered correctly", "Average time spent on each question", "Frequency of quiz attempts", "None of the above"],
    correctAnswer: 0,
    category: "Performance Metrics",
    difficulty: "medium",
    language: "english",
  },
  {
    userId: new mongoose.Types.ObjectId(), // Replace with actual userId
    question: "What is the role of analytics in healthcare education apps?",
    options: ["Improving content", "Tracking progress", "Providing insights into learning", "All of the above"],
    correctAnswer: 3,
    category: "Analytics",
    difficulty: "medium",
    language: "english",
  },
  {
    userId: new mongoose.Types.ObjectId(), // Replace with actual userId
    question: "Which demographic information is most useful for improving medical quiz content?",
    options: ["Education level", "Specialty", "Country of residence", "All of the above"],
    correctAnswer: 3,
    category: "Data Collection",
    difficulty: "medium",
    language: "english",
  },
  {
    userId: new mongoose.Types.ObjectId(), // Replace with actual userId
    question: "What is the benefit of displaying a 'question progress bar' during a quiz?",
    options: ["Helps users manage their time", "Encourages quiz completion", "Shows the number of questions answered", "All of the above"],
    correctAnswer: 3,
    category: "UI/UX",
    difficulty: "medium",
    language: "english",
  },
  {
    userId: new mongoose.Types.ObjectId(), // Replace with actual userId
    question: "Which healthcare specialty would most benefit from a quick decision-making quiz format?",
    options: ["Dermatology", "Emergency Medicine", "Psychiatry", "Pediatrics"],
    correctAnswer: 1,
    category: "Specialties",
    difficulty: "medium",
    language: "english",
  },
  {
    userId: new mongoose.Types.ObjectId(), // Replace with actual userId
    question: "In which scenario is untimed mode preferred for quizzes?",
    options: ["Emergency situations", "When practicing specific knowledge", "During assessments", "None of the above"],
    correctAnswer: 1,
    category: "Quiz Mode",
    difficulty: "medium",
    language: "english",
  },
  {
    userId: new mongoose.Types.ObjectId(), // Replace with actual userId
    question: "What is the purpose of a 'timed mode' in active recall quizzes?",
    options: ["To simulate real-world pressure", "To limit review time", "To make quizzes more competitive", "None of the above"],
    correctAnswer: 0,
    category: "Quiz Design",
    difficulty: "medium",
    language: "english",
  },
  {
    userId: new mongoose.Types.ObjectId(), // Replace with actual userId
    question: "What would be the best way to implement a 'Review Mode' in quizzes for medical professionals?",
    options: ["Users can review all their answers at the end", "Answers are shown immediately after each question", "Users can skip questions", "None of the above"],
    correctAnswer: 0,
    category: "Review Mode",
    difficulty: "medium",
    language: "english",
  },
  {
    userId: new mongoose.Types.ObjectId(), // Replace with actual userId
    question: "Which type of medical professional is least likely to benefit from basic recall quizzes?",
    options: ["Medical students", "Resident physicians", "Practicing physicians", "All medical professionals benefit equally"],
    correctAnswer: 2,
    category: "Audience",
    difficulty: "medium",
    language: "english",
  },
  {
    userId: new mongoose.Types.ObjectId(), // Replace with actual userId
    question: "What should be tracked for analytics purposes in a quiz platform focused on healthcare professionals?",
    options: ["Total time spent on quizzes", "User demographics", "Quiz category breakdown", "All of the above"],
    correctAnswer: 3,
    category: "Analytics",
    difficulty: "medium",
    language: "english",
  },
  {
    userId: new mongoose.Types.ObjectId(), // Replace with actual userId
    question: "What is the ideal approach to designing quiz questions for healthcare professionals?",
    options: ["Simple and direct", "Detailed and comprehensive", "Based on real-life scenarios", "All of the above"],
    correctAnswer: 2,
    category: "Question Design",
    difficulty: "medium",
    language: "english",
  },
  {
    userId: new mongoose.Types.ObjectId(), // Replace with actual userId
    question: "Why is it important to have a category-level breakdown in quiz performance analysis?",
    options: ["To identify strengths and weaknesses", "To compare performance across users", "To make quizzes more challenging", "None of the above"],
    correctAnswer: 0,
    category: "Performance Analysis",
    difficulty: "medium",
    language: "english",
  },
  {
    userId: new mongoose.Types.ObjectId(), // Replace with actual userId
    question: "What would be a crucial feature in the admin panel for managing medical quiz content?",
    options: ["Bulk question approval", "Exporting user performance reports", "Question tagging by specialty", "All of the above"],
    correctAnswer: 3,
    category: "Admin Features",
    difficulty: "medium",
    language: "english",
  },
  {
    userId: new mongoose.Types.ObjectId(), // Replace with actual userId
    question: "What is the importance of tracking performance trends over time in a healthcare quiz platform?",
    options: ["To measure improvements or declines", "To generate more questions", "To change quiz difficulty", "None of the above"],
    correctAnswer: 0,
    category: "Analytics",
    difficulty: "medium",
    language: "english",
  },
  {
    userId: new mongoose.Types.ObjectId(), // Replace with actual userId
    question: "How can medical quiz apps improve retention rates among healthcare professionals?",
    options: ["By offering rewards", "By using spaced repetition", "By including motivational feedback", "All of the above"],
    correctAnswer: 3,
    category: "Retention Strategies",
    difficulty: "medium",
    language: "english",
  }
];

// Insert multiple questions into the database
Question.insertMany(quizQuestions)
  .then((docs) => {
    console.log('Inserted quiz questions:', docs);
    mongoose.connection.close(); // Close connection after insertion
  })
  .catch((err) => {
    console.error('Error inserting questions:', err);
    mongoose.connection.close(); // Close connection on error
  });
