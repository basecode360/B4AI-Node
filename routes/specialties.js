import express from "express";
import { specialtyModel } from "../models/Specialties.js";

const router = express.Router();

// ✅ GET /api/specialties - Get all specialties or by category
router.get("/", async (req, res) => {
  try {
    const { category, search } = req.query;
    
    console.log("⚕️ Fetching specialties...", { category, search });
    
    let query = { isActive: true };
    
    // Filter by category if provided
    if (category) {
      query.category = category;
    }
    
    // Add search functionality
    if (search) {
      query.$and = [
        query,
        {
          $or: [
            { label: { $regex: search, $options: 'i' } },
            { value: { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }
    
    const specialties = await specialtyModel
      .find(query)
      .select('specialtyId label value category')
      .sort({ label: 1 })
      .lean();
    
    console.log(`✅ Found ${specialties.length} specialties`);
    
    res.status(200).json({
      success: true,
      message: "Specialties fetched successfully",
      data: specialties,
      count: specialties.length
    });
    
  } catch (error) {
    console.error("❌ Error fetching specialties:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch specialties",
      error: error.message
    });
  }
});

// ✅ GET /api/specialties/by-category/:category - Get specialties by specific category
router.get("/by-category/:category", async (req, res) => {
  try {
    const { category } = req.params;
    
    console.log(`🔍 Fetching specialties for category: "${category}"`);
    
    const validCategories = ['physician', 'resident', 'healthcare'];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category. Must be one of: physician, resident, healthcare"
      });
    }
    
    const specialties = await specialtyModel
      .find({ category, isActive: true })
      .select('specialtyId label value')
      .sort({ label: 1 })
      .lean();
    
    console.log(`✅ Found ${specialties.length} ${category} specialties`);
    
    res.status(200).json({
      success: true,
      message: `${category} specialties fetched successfully`,
      data: specialties,
      count: specialties.length
    });
    
  } catch (error) {
    console.error("❌ Error fetching specialties by category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch specialties",
      error: error.message
    });
  }
});

export default router;