import mongoose from "mongoose";

const quizSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  options: [
    {
      type: String,
      required: true,
    },
  ],
  correctAnswer: {
    type: Number,
    required: true,
    min: 0,
    max: 3, // 0, 1, 2 (3 options)
  },
  category: {
    type: String,
    default: null,
  },
  subCategory: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
quizSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export const Quiz = mongoose.models.Quiz || mongoose.model("Quiz", quizSchema);
