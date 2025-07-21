import mongoose from "mongoose";

const universitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  country: {
    type: String,
    required: true,
    trim: true,
  },
  website: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    default: "University",
  },
  medicalPrograms: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for faster searches
universitySchema.index({ name: "text", country: "text" });
universitySchema.index({ country: 1 });
universitySchema.index({ name: 1 });

export const universityModel = mongoose.models.University || mongoose.model("University", universitySchema);