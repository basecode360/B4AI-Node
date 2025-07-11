import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { 
  getProfile, 
  login, 
  logout, 
  register, 
  resendVerificationCode, 
  updateProfile, 
  verifyEmail,
  forgotPassword,
  verifyResetCode,
  resetPassword,
} from "../controllers/user.controller.js";
import { singleUpload } from "../middleware/multer.js";
import { userModel } from "../models/userModel.js"; // ✅ Using your existing model

const router = express.Router();

// Public routes (no authentication required)
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationCode);

// Forgot Password Routes
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-code", verifyResetCode);
router.post("/reset-password", resetPassword);

// ✅ DATABASE INTEGRATED: USERS LIST ENDPOINT - Using your userModel
router.get("/users", async (req, res) => {
  try {
    console.log("👥 Fetching users from MongoDB database...");
    
    // Fetch all users from database using your existing userModel
    const users = await userModel.find({})
      .select('-password -refreshToken -emailVerificationCode -passwordResetCode')
      .sort({ createdAt: -1 }); // Latest first
    
    console.log(`📊 Found ${users.length} users in MongoDB database`);
    console.log('📋 Sample user structure:', users[0] ? {
      _id: users[0]._id,
      email: users[0].email,
      role: users[0].role,
      profile: users[0].profile,
      isVerified: users[0].isVerified,
      createdAt: users[0].createdAt
    } : 'No users found');
    
    // Transform data for frontend compatibility
    const transformedUsers = users.map(user => ({
      _id: user._id,
      email: user.email,
      role: user.role || 'student',
      profile: user.profile || {},
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      isVerified: user.isVerified || false,
      lastActive: user.lastActive,
    }));

    res.json({
      success: true,
      message: "Users fetched successfully from MongoDB database",
      users: transformedUsers,
      count: transformedUsers.length
    });
    
  } catch (error) {
    console.error("❌ MongoDB users fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users from database",
      error: error.message
    });
  }
});

// ✅ DATABASE INTEGRATED: USER STATS ENDPOINT (for dashboard)
router.get("/stats", async (req, res) => {
  try {
    console.log("📊 Fetching user statistics from MongoDB database...");
    
    // Get user statistics using your userModel
    const totalUsers = await userModel.countDocuments();
    const activeUsers = await userModel.countDocuments({ isVerified: true });
    const adminUsers = await userModel.countDocuments({ role: 'admin' });
    
    // Users registered this month
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const newThisMonth = await userModel.countDocuments({
      createdAt: { $gte: currentMonth }
    });
    
    console.log('📊 Database statistics:', {
      totalUsers,
      activeUsers,
      adminUsers,
      newThisMonth
    });
    
    res.json({
      success: true,
      message: "User statistics fetched successfully from MongoDB",
      stats: {
        totalUsers,
        activeUsers,
        adminUsers,
        newThisMonth,
        inactiveUsers: totalUsers - activeUsers
      }
    });
    
  } catch (error) {
    console.error("❌ MongoDB stats fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user statistics from database",
      error: error.message
    });
  }
});

// ✅ DATABASE INTEGRATED: CHANGE PASSWORD ENDPOINT
router.put("/change-password", authenticateToken, async (req, res) => {
  try {
    console.log("🔐 Password change request for user:", req.user?.userId);
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required"
      });
    }
    
    // Use bcrypt import (same as your controller)
    const bcrypt = await import("bcryptjs");
    
    // Find user using your userModel
    const user = await userModel.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect"
      });
    }
    
    // Hash new password (same salt rounds as your controller)
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password in database
    await userModel.findByIdAndUpdate(req.user.userId, {
      password: hashedNewPassword,
      updatedAt: new Date()
    });
    
    console.log("✅ Password updated successfully in MongoDB");
    
    res.json({
      success: true,
      message: "Password updated successfully"
    });
    
  } catch (error) {
    console.error("❌ Password change error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change password",
      error: error.message
    });
  }
});

// ✅ DATABASE INTEGRATED: UPLOAD AVATAR ENDPOINT
router.put("/upload-avatar", authenticateToken, async (req, res) => {
  try {
    console.log("📷 Avatar upload request for user:", req.user?.userId);
    const { imageData } = req.body;
    
    if (!imageData) {
      return res.status(400).json({
        success: false,
        message: "Image data is required"
      });
    }
    
    // Update user's profile picture in database using your userModel
    const updatedUser = await userModel.findByIdAndUpdate(
      req.user.userId,
      {
        $set: {
          'profile.profilePic': imageData,
          updatedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    console.log("✅ Avatar updated successfully in MongoDB");
    
    res.json({
      success: true,
      message: "Avatar uploaded successfully",
      data: {
        user: updatedUser
      },
      profilePic: imageData
    });
    
  } catch (error) {
    console.error("❌ Avatar upload error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload avatar",
      error: error.message
    });
  }
});

// Protected routes (authentication required) - Your existing routes
router.get("/profile/:id", authenticateToken, getProfile);
router.put("/update-profile", authenticateToken, singleUpload, updateProfile);

// Test protected route
router.get("/protected", authenticateToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Protected route accessed successfully",
    data: {
      user: req.user,
    },
  });
});

export default router;