// routes/universities.js - Add this new file to your routes folder
import express from "express";
import mongoose from "mongoose";

const router = express.Router();

// ✅ University Schema - matches your existing MongoDB collection structure
const universitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  country: {
    type: String,
    required: true,
    trim: true,
  },
  website: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    default: "University",
  },
  medicalPrograms: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for faster searches
universitySchema.index({ name: "text", country: "text" });
universitySchema.index({ country: 1 });
universitySchema.index({ name: 1 });

// ✅ Use existing collection name "universities" 
const universityModel = mongoose.models.University || mongoose.model("University", universitySchema, "universities");

// ✅ GET /api/universities - Get all universities with optional search and pagination
router.get("/", async (req, res) => {
  try {
    console.log("🏫 Fetching universities from MongoDB collection 'universities'...");
    
    const { 
      search, 
      country, 
      page = 1, 
      limit = 50,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    // Build query object
    let query = {};

    // Add search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by country if specified
    if (country) {
      query.country = { $regex: country, $options: 'i' };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination and sorting
    const universities = await universityModel
      .find(query)
      .select('name country website type medicalPrograms')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalCount = await universityModel.countDocuments(query);
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    console.log(`📊 Found ${universities.length} universities (Total: ${totalCount})`);

    res.status(200).json({
      success: true,
      message: "Universities fetched successfully from MongoDB",
      data: universities,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      }
    });

  } catch (error) {
    console.error("❌ Error fetching universities:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch universities",
      error: error.message
    });
  }
});

// ✅ GET /api/universities/search - Quick search for autocomplete (used by your frontend)
router.get("/search", async (req, res) => {
  try {
    const { q, limit = 15 } = req.query;
    
    console.log(`🔍 Searching universities with query: "${q}"`);

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters long"
      });
    }

    // Search in your existing universities collection
    const universities = await universityModel
      .find({
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { country: { $regex: q, $options: 'i' } }
        ]
      })
      .select('name country website type')
      .sort({ name: 1 })
      .limit(parseInt(limit))
      .lean();

    console.log(`✅ Search results: ${universities.length} universities found`);

    res.status(200).json({
      success: true,
      message: `Found ${universities.length} universities`,
      data: universities
    });

  } catch (error) {
    console.error("❌ Error searching universities:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search universities",
      error: error.message
    });
  }
});

// ✅ GET /api/universities/countries - Get list of countries from your data
router.get("/countries", async (req, res) => {
  try {
    console.log("🌍 Fetching countries list from universities collection...");
    
    const countries = await universityModel
      .distinct('country')
      .sort();

    console.log(`✅ Found ${countries.length} countries`);

    res.status(200).json({
      success: true,
      message: "Countries fetched successfully",
      data: countries
    });

  } catch (error) {
    console.error("❌ Error fetching countries:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch countries",
      error: error.message
    });
  }
});

// ✅ GET /api/universities/stats - Get universities statistics
router.get("/stats", async (req, res) => {
  try {
    console.log("📊 Fetching universities statistics...");
    
    const totalUniversities = await universityModel.countDocuments();
    const totalCountries = await universityModel.distinct('country');
    const withMedicalPrograms = await universityModel.countDocuments({ 
      medicalPrograms: true 
    });
    
    const stats = {
      totalUniversities,
      totalCountries: totalCountries.length,
      withMedicalPrograms,
      withoutMedicalPrograms: totalUniversities - withMedicalPrograms
    };
    
    console.log("📊 Universities statistics:", stats);
    
    res.status(200).json({
      success: true,
      message: "Universities statistics fetched successfully",
      data: stats
    });
    
  } catch (error) {
    console.error("❌ Error fetching universities statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch universities statistics",
      error: error.message
    });
  }
});

// ✅ Test endpoint to check collection structure
router.get("/test", async (req, res) => {
  try {
    console.log("🧪 Testing universities collection...");
    
    // Get a sample of universities to see the structure
    const sampleUniversities = await universityModel
      .find()
      .limit(5)
      .lean();
    
    // Get collection info
    const totalCount = await universityModel.countDocuments();
    const fieldsExample = sampleUniversities[0] || {};
    
    console.log("🔍 Collection test results:");
    console.log("Total universities:", totalCount);
    console.log("Sample structure:", fieldsExample);
    
    res.status(200).json({
      success: true,
      message: "Universities collection test completed",
      data: {
        totalCount,
        sampleUniversities,
        fieldsExample,
        collectionName: "universities"
      }
    });
    
  } catch (error) {
    console.error("❌ Error testing universities collection:", error);
    res.status(500).json({
      success: false,
      message: "Failed to test universities collection",
      error: error.message
    });
  }
});

export default router;