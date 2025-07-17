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
import { userModel } from "../models/userModel.js";
import PerformanceAnalytics from "../models/PerformanceAnalytics.js"; // 🆕 Import for cleanup
import { Quiz } from "../models/quizModel.js"; // 🆕 Import for cleanup
import mongoose from "mongoose";

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

// 🆕 DELETE ACCOUNT FUNCTIONALITY ===========================================

// Get Account Deletion Info
router.get("/deletion-info", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log("🔍 GET DELETION INFO REQUEST for user:", userId);
    
    // Get user stats
    const user = await userModel.findById(userId).select('email profile.firstName profile.lastName createdAt');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    // Get analytics data
    const analytics = await PerformanceAnalytics.findOne({ userId });
    
    // Get quiz count
    const quizCount = await Quiz.countDocuments({ userId });
    
    const deletionInfo = {
      accountInfo: {
        email: user.email,
        name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || user.email.split('@')[0],
        memberSince: user.createdAt
      },
      dataToDelete: {
        quizzesCreated: quizCount,
        totalQuizzesTaken: analytics?.totalQuizzesTaken || 0,
        totalQuestions: analytics?.totalQuestionsAttempted || 0,
        bbPoints: analytics?.cumulativeScore || 0,
        analyticsData: analytics ? true : false
      }
    };
    
    console.log("✅ Deletion info retrieved successfully");
    
    res.json({
      success: true,
      message: "Account deletion information retrieved",
      info: deletionInfo
    });
    
  } catch (error) {
    console.error("❌ Get deletion info error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get deletion info",
      error: error.message
    });
  }
});

// Delete Account
router.delete("/delete-account", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { password, confirmationText } = req.body;
    
    console.log("🗑️ DELETE ACCOUNT REQUEST");
    console.log("👤 User ID:", userId);
    console.log("✅ Confirmation Text:", confirmationText);
    
    // Validation
    if (!password || !password.trim()) {
      return res.status(400).json({
        success: false,
        message: "Password is required for account deletion"
      });
    }
    
    if (confirmationText !== "DELETE") {
      return res.status(400).json({
        success: false,
        message: "Please type 'DELETE' to confirm account deletion"
      });
    }
    
    // Find user in database
    const user = await userModel.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    // Verify password
    const bcrypt = await import("bcryptjs");
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid password. Account deletion cancelled."
      });
    }
    
    // Prevent admin deletion (optional security measure)
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot be deleted"
      });
    }
    
    console.log("🔐 Password verified. Starting account deletion process...");
    
    // Delete related data (analytics, quiz submissions, etc.)
    let cleanupResults = {
      analytics: 0,
      quizzes: 0,
      errors: []
    };
    
    try {
      // Delete user analytics
      const analyticsResult = await PerformanceAnalytics.deleteMany({ userId: userId });
      cleanupResults.analytics = analyticsResult.deletedCount;
      console.log(`✅ Deleted ${analyticsResult.deletedCount} analytics records`);
      
      // Delete user quizzes created by this user
      const quizzesResult = await Quiz.deleteMany({ userId: userId });
      cleanupResults.quizzes = quizzesResult.deletedCount;
      console.log(`✅ Deleted ${quizzesResult.deletedCount} user quizzes`);
      
      // Add more cleanup here if you have other related models
      // Example: await StudentQuiz.deleteMany({ userId: userId });
      
    } catch (cleanupError) {
      console.error("⚠️ Error during cleanup:", cleanupError);
      cleanupResults.errors.push(cleanupError.message);
      // Continue with user deletion even if cleanup fails partially
    }
    
    // Delete user account
    const deletedUser = await userModel.findByIdAndDelete(userId);
    
    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found during deletion"
      });
    }
    
    console.log("✅ Account deleted successfully");
    console.log("📊 Cleanup Summary:", cleanupResults);
    
    res.json({
      success: true,
      message: "Your account has been permanently deleted. We're sorry to see you go!",
      deletionSummary: {
        accountDeleted: true,
        analyticsRecordsDeleted: cleanupResults.analytics,
        quizzesDeleted: cleanupResults.quizzes,
        cleanupErrors: cleanupResults.errors.length > 0 ? cleanupResults.errors : null
      }
    });
    
  } catch (error) {
    console.error("❌ Delete account error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete account. Please try again.",
      error: error.message
    });
  }
});

// 🆕 END DELETE ACCOUNT FUNCTIONALITY =======================================

// ✅ DATABASE INTEGRATED: USERS LIST ENDPOINT - Using your existing model
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

// ✅ DELETE SPECIFIC USER ENDPOINT  ===================================================

// ✅ DELETE USER BY EMAIL
router.delete("/users/email/:email", authenticateToken, async (req, res) => {
  try {
    const { email } = req.params;
    const decodedEmail = decodeURIComponent(email); // Handle encoded emails
    
    console.log("🗑️ DELETE BY EMAIL REQUEST:", decodedEmail);
    console.log("🔍 Requested by user ID:", req.user?.userId);
    
    // Find user by email
    const userToDelete = await userModel.findOne({ 
      email: decodedEmail.toLowerCase() 
    });
    
    if (!userToDelete) {
      console.log("❌ User not found with email:", decodedEmail);
      return res.status(404).json({
        success: false,
        message: `User with email ${decodedEmail} not found`
      });
    }
    
    console.log("✅ User found for deletion:", {
      _id: userToDelete._id,
      email: userToDelete.email,
      name: `${userToDelete.profile?.firstName || ''} ${userToDelete.profile?.lastName || ''}`.trim(),
      role: userToDelete.role
    });
    
    // Prevent deleting admin users (optional)
    if (userToDelete.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: "Cannot delete admin users"
      });
    }
    
    // Prevent users from deleting themselves
    if (userToDelete._id.toString() === req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Cannot delete your own account"
      });
    }
    
    // Delete the user
    const deletedUser = await userModel.findOneAndDelete({ 
      email: decodedEmail.toLowerCase() 
    });
    
    console.log("✅ User deleted successfully by email:", {
      email: deletedUser.email,
      name: `${deletedUser.profile?.firstName || ''} ${deletedUser.profile?.lastName || ''}`.trim()
    });
    
    res.json({
      success: true,
      message: `User ${deletedUser.email} deleted successfully`,
      deletedUser: {
        _id: deletedUser._id,
        email: deletedUser.email,
        name: `${deletedUser.profile?.firstName || ''} ${deletedUser.profile?.lastName || ''}`.trim()
      }
    });
    
  } catch (error) {
    console.error("❌ DELETE BY EMAIL ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message
    });
  }
});

// ✅ UPDATE USER BY EMAIL
router.put("/users/email/:email", authenticateToken, async (req, res) => {
  try {
    const { email } = req.params;
    const decodedEmail = decodeURIComponent(email);
    const updateData = req.body;
    
    console.log("✏️ UPDATE BY EMAIL REQUEST:", decodedEmail);
    console.log("📝 Update data:", updateData);
    console.log("🔍 Requested by user ID:", req.user?.userId);
    
    // Find user by email
    const existingUser = await userModel.findOne({ 
      email: decodedEmail.toLowerCase() 
    });
    
    if (!existingUser) {
      console.log("❌ User not found with email:", decodedEmail);
      return res.status(404).json({
        success: false,
        message: `User with email ${decodedEmail} not found`
      });
    }
    
    console.log("✅ User found for update:", {
      _id: existingUser._id,
      email: existingUser.email,
      name: `${existingUser.profile?.firstName || ''} ${existingUser.profile?.lastName || ''}`.trim()
    });
    
    // Prepare update object
    const updateFields = {
      updatedAt: new Date()
    };
    
    // Handle email update (if changing to a different email)
    if (updateData.email && updateData.email.toLowerCase() !== existingUser.email.toLowerCase()) {
      // Check if new email already exists
      const emailExists = await userModel.findOne({ 
        email: updateData.email.toLowerCase(),
        _id: { $ne: existingUser._id }
      });
      
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already exists"
        });
      }
      
      updateFields.email = updateData.email.toLowerCase();
    }
    
    // Handle role update
    if (updateData.role) {
      updateFields.role = updateData.role;
    }
    
    // Handle isVerified update
    if (updateData.isVerified !== undefined) {
      updateFields.isVerified = updateData.isVerified;
    }
    
    // Handle profile updates
    if (updateData.profile) {
      updateFields.profile = {
        ...existingUser.profile?.toObject?.() || existingUser.profile || {},
        ...updateData.profile
      };
    }
    
    console.log("📋 Final update fields:", updateFields);
    
    // Update user by email
    const updatedUser = await userModel.findOneAndUpdate(
      { email: decodedEmail.toLowerCase() },
      { $set: updateFields },
      { 
        new: true, 
        runValidators: true 
      }
    ).select('-password -refreshToken -emailVerificationCode -passwordResetCode');
    
    console.log("✅ User updated successfully by email");
    
    res.json({
      success: true,
      message: "User updated successfully",
      user: updatedUser
    });
    
  } catch (error) {
    console.error("❌ UPDATE BY EMAIL ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error.message
    });
  }
});

// ✅ GET USER BY EMAIL
router.get("/users/email/:email", authenticateToken, async (req, res) => {
  try {
    const { email } = req.params;
    const decodedEmail = decodeURIComponent(email);
    
    console.log("👁️ GET BY EMAIL REQUEST:", decodedEmail);
    
    // Find user by email
    const user = await userModel.findOne({ 
      email: decodedEmail.toLowerCase() 
    }).select('-password -refreshToken -emailVerificationCode -passwordResetCode');
    
    if (!user) {
      console.log("❌ User not found with email:", decodedEmail);
      return res.status(404).json({
        success: false,
        message: `User with email ${decodedEmail} not found`
      });
    }
    
    console.log("✅ User details fetched successfully by email");
    
    res.json({
      success: true,
      message: "User details retrieved successfully",
      data: {
        user
      }
    });
    
  } catch (error) {
    console.error("❌ GET BY EMAIL ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get user details",
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