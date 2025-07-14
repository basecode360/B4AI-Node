import mongoose from "mongoose";

const studentQuizSchema = new mongoose.Schema({
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
  language: {
    type: String,
    enum: ["english", "urdu", "arabic", "french", "spanish", "german"],
    default: "english",
    required: true,
  },
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    default: "medium",
  },
  // Moderation fields
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "flagged"],
    default: "pending",
    required: true,
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  moderatedAt: {
    type: Date,
    default: null,
  },
  moderationNotes: {
    type: String,
    default: "",
  },
  // Submission details
  submissionSource: {
    type: String,
    enum: ["android_app", "web_app", "api"],
    default: "android_app",
  },
  submissionIP: {
    type: String,
    default: null,
  },
  deviceInfo: {
    type: String,
    default: null,
  },
  // Quality metrics
  qualityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
  },
  reportCount: {
    type: Number,
    default: 0,
  },
  approvalVotes: {
    type: Number,
    default: 0,
  },
  rejectionVotes: {
    type: Number,
    default: 0,
  },
  // Tracking
  viewCount: {
    type: Number,
    default: 0,
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
  tags: [{
    type: String,
  }],
}, {
  timestamps: true,
});

// Indexes for better performance
studentQuizSchema.index({ status: 1, createdAt: -1 });
studentQuizSchema.index({ category: 1, language: 1 });
studentQuizSchema.index({ userId: 1, status: 1 });
studentQuizSchema.index({ moderatedBy: 1, moderatedAt: -1 });

// Update timestamp on save
studentQuizSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for submission age
studentQuizSchema.virtual('submissionAge').get(function() {
  return Date.now() - this.createdAt;
});

// Static method for bulk operations
studentQuizSchema.statics.bulkUpdateStatus = async function(quizIds, status, moderatorId, notes = '') {
  return this.updateMany(
    { _id: { $in: quizIds } },
    {
      $set: {
        status: status,
        moderatedBy: moderatorId,
        moderatedAt: new Date(),
        moderationNotes: notes,
        updatedAt: new Date()
      }
    }
  );
};

// Static method for bulk delete
studentQuizSchema.statics.bulkDelete = async function(quizIds) {
  return this.deleteMany({ _id: { $in: quizIds } });
};

// Static method for getting moderation stats
studentQuizSchema.statics.getModerationStats = async function() {
  return this.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]);
};

export const StudentQuiz = mongoose.models.StudentQuiz || mongoose.model("StudentQuiz", studentQuizSchema);