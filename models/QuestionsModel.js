import mongoose from 'mongoose';

const questionsSchema = new mongoose.Schema({
  // Question content in multiple languages
  question: {
    type: String,
    required: true,
    trim: true
  },
  
  // Language of the question
  language: {
    type: String,
    required: true,
    enum: ['english', 'spanish', 'french', 'urdu', 'arabic'],
    default: 'english'
  },
  
  // Answer options array
  options: [{
    type: String,
    required: true,
    trim: true
  }],
  
  // Index of correct answer (0-based)
  correctAnswer: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Correct answer text (for reference)
  correctAnswerText: {
    type: String,
    required: true,
    trim: true
  },
  
  // Category information
  category: {
    type: String,
    required: true,
    trim: true
  },
  
  subCategory: {
    type: String,
    trim: true
  },
  
  // Additional metadata
  examType: {
    type: String,
    trim: true,
    default: 'MCAT'
  },
  
  wikipediaLink: {
    type: String,
    trim: true
  },
  
  // Approval status
  approved: {
    type: Boolean,
    default: false
  },
  
  // Index from original data
  originalIndex: {
    type: Number
  },
  
  // Difficulty level
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  
  // Status for admin management
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active'
  },
  
  // Import metadata
  importSource: {
    type: String,
    default: 'excel_import'
  },
  
  importDate: {
    type: Date,
    default: Date.now
  },
  
  // Reference to creator/admin who imported
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true // This adds createdAt and updatedAt automatically
});

// Indexes for better performance
questionsSchema.index({ language: 1, category: 1 });
questionsSchema.index({ approved: 1, status: 1 });
questionsSchema.index({ examType: 1 });
questionsSchema.index({ createdAt: -1 });

// Virtual for getting question ID
questionsSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
questionsSchema.set('toJSON', {
  virtuals: true
});

// Pre-save middleware to validate options array
questionsSchema.pre('save', function(next) {
  if (this.options.length < 2) {
    return next(new Error('Question must have at least 2 options'));
  }
  
  if (this.correctAnswer >= this.options.length) {
    return next(new Error('Correct answer index is out of range'));
  }
  
  // Set correct answer text based on index
  this.correctAnswerText = this.options[this.correctAnswer];
  
  next();
});

// Static method to find questions by language
questionsSchema.statics.findByLanguage = function(language) {
  return this.find({ language: language, status: 'active', approved: true });
};

// Static method to find questions by category
questionsSchema.statics.findByCategory = function(category, language = 'english') {
  return this.find({ 
    category: new RegExp(category, 'i'), 
    language: language,
    status: 'active' 
  });
};

// Instance method to get formatted question for quiz
questionsSchema.methods.toQuizFormat = function() {
  return {
    _id: this._id,
    question: this.question,
    options: this.options,
    correctAnswer: this.correctAnswer,
    category: this.category,
    subCategory: this.subCategory,
    language: this.language,
    difficulty: this.difficulty
  };
};

// Static method for bulk import
questionsSchema.statics.bulkImportQuestions = async function(questionsArray, userId) {
  try {
    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    for (const questionData of questionsArray) {
      try {
        // Check if question already exists (by question text and language)
        const existingQuestion = await this.findOne({
          question: questionData.question,
          language: questionData.language
        });

        if (existingQuestion) {
          results.skipped++;
          continue;
        }

        // Create new question
        const newQuestion = new this({
          ...questionData,
          creator: userId,
          importDate: new Date()
        });

        await newQuestion.save();
        results.imported++;
        
      } catch (error) {
        results.errors.push(`Question "${questionData.question?.substring(0, 50)}...": ${error.message}`);
        results.skipped++;
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Bulk import failed: ${error.message}`);
  }
};

const Questions = mongoose.model('Questions', questionsSchema);

export default Questions;