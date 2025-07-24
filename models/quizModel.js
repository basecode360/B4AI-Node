import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
  // ✅ FIXED: Single language field
  language: {
    type: String,
    enum: ['english', 'french', 'spanish', 'german', 'urdu', 'arabic'],
    default: 'english',
    required: true,
  },
  // ✅ FIXED: Difficulty level
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
  // ✅ Status for admin quizzes
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active',
  },
  // ✅ Exam type support
  examType: {
    type: String,
    enum: ['MCAT', 'USMLE', 'NEET', 'General', 'Custom'],
    default: 'General',
  },
  // ✅ Usage statistics
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
  // ✅ Question metadata
  approved: {
    type: Boolean,
    default: true,
  },
  originalIndex: {
    type: Number,
    default: 0,
  },
  importSource: {
    type: String,
    default: 'manual',
  },
  importDate: {
    type: Date,
    default: Date.now,
  },
  creator: {
    type: String,
    default: 'admin',
  },
  wikipediaLink: {
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

// ✅ IMPROVED: Better indexes for filtering
quizSchema.index({ category: 1, subCategory: 1, language: 1, difficulty: 1 });
quizSchema.index({ status: 1, approved: 1 });
quizSchema.index({ language: 1, difficulty: 1 });
quizSchema.index({ category: 1, language: 1 });
quizSchema.index({ createdAt: -1 });

// Update timestamp on save
quizSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// ✅ IMPROVED: Static methods for better filtering
quizSchema.statics.getFilteredQuestions = async function (filters = {}) {
  const {
    category,
    subCategory,
    language = 'english',
    difficulty,
    examType,
    limit = 20,
    random = true,
    status = 'active',
  } = filters;

  // Build filter object
  const filter = { status, approved: true };

  if (language) filter.language = language;
  if (category) filter.category = new RegExp(category, 'i');
  if (subCategory) filter.subCategory = new RegExp(subCategory, 'i');
  if (difficulty) filter.difficulty = difficulty;
  if (examType) filter.examType = examType;

  let query = this.find(filter)
    .select(
      'question options correctAnswer category subCategory language difficulty examType'
    )
    .lean();

  // Random sampling
  if (random) {
    const count = await this.countDocuments(filter);
    if (count > limit) {
      const randomSkip = Math.floor(Math.random() * Math.max(0, count - limit));
      query = query.skip(randomSkip);
    }
  }

  return query.limit(parseInt(limit));
};

// ✅ Get categories with counts
quizSchema.statics.getCategoriesWithCounts = async function () {
  return this.aggregate([
    {
      $match: {
        status: 'active',
        approved: true,
        category: { $ne: null, $ne: '' },
      },
    },
    {
      $group: {
        _id: '$category',
        subCategories: {
          $addToSet: {
            $cond: [
              {
                $and: [
                  { $ne: ['$subCategory', null] },
                  { $ne: ['$subCategory', ''] },
                ],
              },
              '$subCategory',
              '$$REMOVE',
            ],
          },
        },
        count: { $sum: 1 },
        languages: { $addToSet: '$language' },
        difficulties: { $addToSet: '$difficulty' },
      },
    },
    {
      $project: {
        category: '$_id',
        subCategories: 1,
        count: 1,
        languages: 1,
        difficulties: 1,
        _id: 0,
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

// ✅ Get available languages
quizSchema.statics.getAvailableLanguages = async function () {
  return this.distinct('language', { status: 'active', approved: true });
};

// ✅ Get available difficulties
quizSchema.statics.getAvailableDifficulties = async function () {
  return this.distinct('difficulty', { status: 'active', approved: true });
};

// Static method for bulk operations
quizSchema.statics.bulkUpdateCategory = async function (
  quizIds,
  category,
  subCategory
) {
  return this.updateMany(
    { _id: { $in: quizIds } },
    {
      $set: {
        category: category,
        subCategory: subCategory,
        updatedAt: new Date(),
      },
    }
  );
};

export const Quiz = mongoose.models.Quiz || mongoose.model('Quiz', quizSchema);
