import mongoose from 'mongoose';

const subcategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});

const Subcategory = mongoose.model('Subcategory', subcategorySchema);

export default Subcategory;
