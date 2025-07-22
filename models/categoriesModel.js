import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
});

const Category = mongoose.model('Category', categorySchema);

export default Category;
