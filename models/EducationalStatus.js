import mongoose from "mongoose";

const educationalStatusSchema = new mongoose.Schema({
  statusId: {
    type: Number,
    required: true,
    unique: true
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  value: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  requiresSpecialty: {
    type: Boolean,
    default: false
  },
  specialtyType: {
    type: String,
    enum: ['physician', 'resident', 'healthcare', null],
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

educationalStatusSchema.index({ label: 'text' });
educationalStatusSchema.index({ value: 1 });

export const educationalStatusModel = mongoose.models.EducationalStatus || mongoose.model("EducationalStatus", educationalStatusSchema);
