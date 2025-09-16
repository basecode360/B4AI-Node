// routes/countries.js - Countries API endpoints
import express from "express";
import { countryModel } from "../models/Countries.js";

const router = express.Router();

// ✅ GET /api/countries - Get all countries
router.get("/", async (req, res) => {
  try {
    
    const { search, limit = 250 } = req.query;
    
    let query = {};
    
    // Add search functionality
    if (search) {
      query.$or = [
        { label: { $regex: search, $options: 'i' } },
        { value: { $regex: search, $options: 'i' } }
      ];
    }
    
    const countries = await countryModel
      .find(query)
      .select('countryId label value flag')
      .sort({ countryId: 1 }) // USA and Canada will be first
      .limit(parseInt(limit))
      .lean();
    
    
    res.status(200).json({
      success: true,
      message: "Countries fetched successfully",
      data: countries,
      count: countries.length
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch countries",
      error: error.message
    });
  }
});

// ✅ GET /api/countries/search - Quick search for autocomplete
router.get("/search", async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    
    if (!q || q.length < 1) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 1 character long"
      });
    }
    
    const countries = await countryModel
      .find({
        $or: [
          { label: { $regex: q, $options: 'i' } },
          { value: { $regex: q, $options: 'i' } }
        ]
      })
      .select('countryId label value flag')
      .sort({ label: 1 })
      .limit(parseInt(limit))
      .lean();
    
    
    res.status(200).json({
      success: true,
      message: `Found ${countries.length} countries`,
      data: countries
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to search countries",
      error: error.message
    });
  }
});

export default router;
