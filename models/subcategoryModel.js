import mongoose from 'mongoose';

const subcategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
});

const Subcategory = mongoose.model('Subcategory', subcategorySchema);

export default Subcategory;
