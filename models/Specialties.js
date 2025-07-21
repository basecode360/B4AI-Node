import mongoose from "mongoose";

const specialtySchema = new mongoose.Schema({
  specialtyId: {
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
  category: {
    type: String,
    required: true,
    enum: ['physician', 'resident', 'healthcare']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

specialtySchema.index({ label: 'text' });
specialtySchema.index({ value: 1 });
specialtySchema.index({ category: 1 });

export const specialtyModel = mongoose.models.Specialty || mongoose.model("Specialty", specialtySchema);
