// Update your models/quizModel.js to include language support

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
    max: 3,
  },
  category: {
    type: String,
    default: null,
  },
  subCategory: {
    type: String,
    default: null,
  },
  // ✅ NEW: Language support
  language: {
    type: String,
    enum: ["english", "french", "spanish", "german"],
    default: "english",
    required: true,
  },
  // ✅ NEW: Difficulty level
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    default: "medium",
  },
  // ✅ NEW: Status for admin quizzes
  status: {
    type: String,
    enum: ["active", "inactive", "archived"],
    default: "active",
  },
  // ✅ NEW: Tags for better organization
  tags: [{
    type: String,
  }],
  // ✅ NEW: Usage statistics
  usageCount: {
    type: Number,
    default: 0,
  },
  successRate: {
    type: Number,
    min: 0,
    max: 100,
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

// Indexes for better performance
quizSchema.index({ category: 1, language: 1 });
quizSchema.index({ status: 1, createdAt: -1 });
quizSchema.index({ userId: 1, status: 1 });

// Update timestamp on save
quizSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Static method for bulk operations
quizSchema.statics.bulkUpdateCategory = async function(quizIds, category, subCategory) {
  return this.updateMany(
    { _id: { $in: quizIds } },
    {
      $set: {
        category: category,
        subCategory: subCategory,
        updatedAt: new Date()
      }
    }
  );
};

// Static method for bulk status update
quizSchema.statics.bulkUpdateStatus = async function(quizIds, status) {
  return this.updateMany(
    { _id: { $in: quizIds } },
    {
      $set: {
        status: status,
        updatedAt: new Date()
      }
    }
  );
};

// Static method for bulk delete
quizSchema.statics.bulkDelete = async function(quizIds) {
  return this.deleteMany({ _id: { $in: quizIds } });
};

// Static method for getting category/language stats
quizSchema.statics.getCategoryStats = async function() {
  return this.aggregate([
    {
      $group: {
        _id: {
          category: "$category",
          language: "$language"
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

export const Quiz = mongoose.models.Quiz || mongoose.model("Quiz", quizSchema);