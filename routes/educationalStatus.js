import express from "express";
import { educationalStatusModel } from "../models/EducationalStatus.js";

const router = express.Router();

// ✅ GET /api/educational-status - Get all educational statuses
router.get("/", async (req, res) => {
  try {
    
    const statuses = await educationalStatusModel
      .find({ isActive: true })
      .select('statusId label value requiresSpecialty specialtyType')
      .sort({ statusId: 1 })
      .lean();
    
    
    res.status(200).json({
      success: true,
      message: "Educational statuses fetched successfully",
      data: statuses,
      count: statuses.length
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch educational statuses",
      error: error.message
    });
  }
});

// ✅ GET /api/educational-status/:value - Get single status by value
router.get("/:value", async (req, res) => {
  try {
    const { value } = req.params;
    
    
    const status = await educationalStatusModel
      .findOne({ value })
      .select('statusId label value requiresSpecialty specialtyType')
      .lean();
    
    if (!status) {
      return res.status(404).json({
        success: false,
        message: "Educational status not found"
      });
    }
    
    
    res.status(200).json({
      success: true,
      message: "Educational status fetched successfully",
      data: status
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch educational status",
      error: error.message
    });
  }
});

export default router;