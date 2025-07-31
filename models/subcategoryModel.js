import mongoose from 'mongoose';

const subcategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  language: {
    type: String,
    required: true,
    enum: ['english', 'spanish', 'french', 'urdu', 'arabic'],
    default: 'english',
  }
});

const Subcategory = mongoose.model('Subcategory', subcategorySchema);

export default Subcategory;
