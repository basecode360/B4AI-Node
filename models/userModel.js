import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: [
      "admin",
  "high_school",
  "some_college",
  "associate_degree",
  "bachelors_degree",
  "post_baccalaureate",
  "masters_degree",
  "doctoral_degree",
  "medical_student",
  "img",
  "resident_physician",
  "practicing_physician",
  "other_healthcare",
  "other_education"
],
    required: true,
    default: "high_school",
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  profile: {
    profilePic: {
      type: String,
    },
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    // ✅ UPDATED: DOB -> dateOfBirth
    dateOfBirth: {
      type: String,
    },
    // ✅ UPDATED: Gender enum expanded to match frontend
    gender: {
      type: String,
      enum: ["male", "female", "other", "not_specified"],
      required: true,
      default: "not_specified",
    },
    // ✅ UPDATED: institution -> institute
    institute: {
      type: String,
    },
    countryOfResidence: {
      type: String,
    },
    educationStatus: {
      type: String,
    },
    residence: {
      type: String,
    },
    dateOfGraduation: {
      type: String,
    },
    specialty: {
      type: String,
    },
    // ✅ Social media fields
    facebookUrl: {
      type: String,
      default: "",
    },
    twitterUrl: {
      type: String,
      default: "",
    },
    instagramUrl: {
      type: String,
      default: "",
    },
  },
  hasPaid: {
    type: Boolean,
    default: false,
  },
  // Existing schema mein yeh add karo
  subscriptionDetails: {
    planType: {
      type: String,
      enum: ["monthly", "quarterly"],
    },
    period: String,
    amount: Number,
    currency: String,
    paymentDate: Date,
    stripeSessionId: String,
    expiryDate: Date,
  },
  // ✅ Added timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
  },
  lastActive: {
    type: Date,
  },
  freeQuizUsage: {
    totalQuestionsUsed: { type: Number, default: 0 },
    questionsUsedByMode: {
      TIMED: { type: Number, default: 0 },
      UNTIMED: { type: Number, default: 0 },
      'ON-THE-GO': { type: Number, default: 0 }
    },
    questionsUsedByLanguage: {
      type: Map,
      of: Number,
      default: {}
    },
    lastResetDate: { type: Date, default: Date.now },
    usageHistory: [{
      date: Date,
      questionsUsed: Number,
      mode: String,
      language: String
    }]
  }
});

// ✅ Update updatedAt on save
userSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

export const userModel =
  mongoose.models.Users || mongoose.model("User", userSchema);