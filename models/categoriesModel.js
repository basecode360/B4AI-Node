import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  language: {
    type: String,
    required: true,
    enum: ['english', 'spanish', 'french', 'urdu', 'arabic'],
    default: 'english',
  }
});

const Category = mongoose.model('Category', categorySchema);

export default Category;
