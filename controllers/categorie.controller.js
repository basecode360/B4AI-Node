import Category from "../models/categoriesModel.js";

export const getCategories = async (req, res) => {
    try {
    const language = req.query.language || 'english'; // Default language is 'english'
    
    const categories = await Category.find({ language }).sort({ name: 1 });
      
      res.status(200).json({
        success: true,
        message: 'Categories fetched successfully',
        data: categories,
        count: categories.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories',
        error: error.message
      });
    }
  }

