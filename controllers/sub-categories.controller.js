import Subcategory from "../models/subcategoryModel.js";

export const getSubCategories = async (req, res) => {
    try {
        const language = req.query.language || "english";

        const subcategories = await Subcategory.find({ language }).sort({ name: 1 });

        res.status(200).json({
            success: true,
            message: 'Subcategories fetched successfully',
            data: subcategories,
            count: subcategories.length
        });
    } catch (error) {
        console.error('❌ Error fetching subcategories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subcategories',
            error: error.message
        });
    }
}