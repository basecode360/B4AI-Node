import mongoose from "mongoose";

const countrySchema = new mongoose.Schema({
  countryId: {
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
  flag: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for faster searches
countrySchema.index({ label: 'text' });
countrySchema.index({ value: 1 });

export const countryModel = mongoose.models.Country || mongoose.model("Country", countrySchema);
