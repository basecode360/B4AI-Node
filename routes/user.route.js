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

// ✅ DATABASE INTEGRATED: USERS LIST ENDPOINT - Using your userModel
router.get("/users", async (req, res) => {
  try {
    console.log("👥 Fetching users from MongoDB database...");
    
    // Fetch all users from database using your existing userModel
    const users = await userModel.find({})
      .select('-password -refreshToken -emailVerificationCode -passwordResetCode')
      .sort({ createdAt: -1 }); // Latest first
    
    console.log(`📊 Found ${users.length} users in MongoDB database`);
    
    // ✅ Transform data for frontend compatibility - map backend fields to frontend expectations
    const transformedUsers = users.map(user => ({
      _id: user._id,
      email: user.email,
      role: user.role || 'student',
      profile: {
        ...user.profile,
        // ✅ Map backend field names to what frontend expects (if needed for display)
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        // Keep both for compatibility
        DOB: user.profile?.dateOfBirth,          // Legacy field
        dateOfBirth: user.profile?.dateOfBirth,  // New field
        DOG: user.profile?.dateOfGraduation,     // Legacy field  
        dateOfGraduation: user.profile?.dateOfGraduation, // New field
        institute: user.profile?.institute,
        institution: user.profile?.institute,    // For frontend compatibility
        countryOfResidence: user.profile?.countryOfResidence,
        country: user.profile?.countryOfResidence, // For frontend compatibility
        educationStatus: user.profile?.educationStatus,
        educationalStatus: user.profile?.educationStatus, // For frontend compatibility
        residence: user.profile?.residence,
        address: user.profile?.residence,        // For frontend compatibility
        specialty: user.profile?.specialty,
        specialty: user.profile?.specialty,     // For frontend compatibility
      },
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

// ✅ DATABASE INTEGRATED: DELETE USER ENDPOINT
// router.delete("/users/:userId", authenticateToken, async (req, res) => {
//   try {
//     const { userId } = req.params;
//     console.log("🗑️ Delete user request for ID:", userId);
    
//     // Check if user exists
//     const userToDelete = await userModel.findById(userId);
//     if (!userToDelete) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found"
//       });
//     }
    
//     // Prevent deleting admin users (optional security measure)
//     if (userToDelete.role === 'admin') {
//       return res.status(403).json({
//         success: false,
//         message: "Cannot delete admin users"
//       });
//     }
    
//     // Delete user from database
//     await userModel.findByIdAndDelete(userId);
    
//     console.log("✅ User deleted successfully from MongoDB:", userToDelete.email);
    
//     res.json({
//       success: true,
//       message: `User ${userToDelete.email} deleted successfully`,
//       deletedUser: {
//         _id: userToDelete._id,
//         email: userToDelete.email
//       }
//     });
    
//   } catch (error) {
//     console.error("❌ Delete user error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to delete user",
//       error: error.message
//     });
//   }
// });

// ✅ DATABASE INTEGRATED: UPDATE USER ENDPOINT
// router.put("/users/:userId", authenticateToken, async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const updateData = req.body;
    
//     console.log("✏️ Update user request for ID:", userId);
//     console.log("📝 Update data:", updateData);
    
//     // Check if user exists
//     const existingUser = await userModel.findById(userId);
//     if (!existingUser) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found"
//       });
//     }
    
//     // Prepare update object
//     const updateFields = {
//       updatedAt: new Date()
//     };
    
//     // Handle email update
//     if (updateData.email && updateData.email !== existingUser.email) {
//       // Check if email already exists
//       const emailExists = await userModel.findOne({ 
//         email: updateData.email.toLowerCase(),
//         _id: { $ne: userId } // Exclude current user
//       });
      
//       if (emailExists) {
//         return res.status(400).json({
//           success: false,
//           message: "Email already exists"
//         });
//       }
      
//       updateFields.email = updateData.email.toLowerCase();
//     }
    
//     // Handle role update
//     if (updateData.role) {
//       updateFields.role = updateData.role;
//     }
    
//     // Handle profile updates
//     if (updateData.profile) {
//       updateFields.profile = {
//         ...existingUser.profile,
//         ...updateData.profile
//       };
//     }
    
//     // Handle verification status
//     if (updateData.isVerified !== undefined) {
//       updateFields.isVerified = updateData.isVerified;
//     }
    
//     // Update user in database
//     const updatedUser = await userModel.findByIdAndUpdate(
//       userId,
//       { $set: updateFields },
//       { 
//         new: true, 
//         runValidators: true 
//       }
//     ).select('-password -refreshToken -emailVerificationCode -passwordResetCode');
    
//     console.log("✅ User updated successfully in MongoDB:", updatedUser.email);
    
//     res.json({
//       success: true,
//       message: "User updated successfully",
//       user: updatedUser
//     });
    
//   } catch (error) {
//     console.error("❌ Update user error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to update user",
//       error: error.message
//     });
//   }
// });

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
    console.log("📝 Update data received:", updateData);
    
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
    
    // Prepare update object
    const updateFields = {
      updatedAt: new Date()
    };
    
    // Handle email update
    if (updateData.email && updateData.email.toLowerCase() !== existingUser.email.toLowerCase()) {
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
    
    // ✅ Handle profile updates with field mapping
    if (updateData.profile) {
      const existingProfile = existingUser.profile?.toObject?.() || existingUser.profile || {};
      
      // ✅ Map frontend fields to backend model fields
      const mappedProfile = { ...existingProfile };
      
      // Direct field updates
      if (updateData.profile.firstName !== undefined) mappedProfile.firstName = updateData.profile.firstName;
      if (updateData.profile.lastName !== undefined) mappedProfile.lastName = updateData.profile.lastName;
      if (updateData.profile.gender !== undefined) mappedProfile.gender = updateData.profile.gender;
      if (updateData.profile.profilePic !== undefined) mappedProfile.profilePic = updateData.profile.profilePic;
      
      // ✅ Field mapping updates
      if (updateData.profile.dateOfBirth !== undefined) mappedProfile.dateOfBirth = updateData.profile.dateOfBirth;
      if (updateData.profile.DOB !== undefined) mappedProfile.dateOfBirth = updateData.profile.DOB; // Legacy support
      
      if (updateData.profile.dateOfGraduation !== undefined) mappedProfile.dateOfGraduation = updateData.profile.dateOfGraduation;
      if (updateData.profile.DOG !== undefined) mappedProfile.dateOfGraduation = updateData.profile.DOG; // Legacy support
      
      if (updateData.profile.institute !== undefined) mappedProfile.institute = updateData.profile.institute;
      if (updateData.profile.institution !== undefined) mappedProfile.institute = updateData.profile.institution; // Frontend compatibility
      
      if (updateData.profile.countryOfResidence !== undefined) mappedProfile.countryOfResidence = updateData.profile.countryOfResidence;
      if (updateData.profile.country !== undefined) mappedProfile.countryOfResidence = updateData.profile.country; // Frontend compatibility
      
      if (updateData.profile.educationStatus !== undefined) mappedProfile.educationStatus = updateData.profile.educationStatus;
      if (updateData.profile.educationalStatus !== undefined) mappedProfile.educationStatus = updateData.profile.educationalStatus; // Frontend compatibility
      
      if (updateData.profile.residence !== undefined) mappedProfile.residence = updateData.profile.residence;
      if (updateData.profile.address !== undefined) mappedProfile.residence = updateData.profile.address; // Frontend compatibility
      
      if (updateData.profile.specialty !== undefined) mappedProfile.specialty = updateData.profile.specialty;
      if (updateData.profile.specialty !== undefined) mappedProfile.specialty = updateData.profile.specialty; // Frontend compatibility
      
      // Social media fields
      if (updateData.profile.facebookUrl !== undefined) mappedProfile.facebookUrl = updateData.profile.facebookUrl;
      if (updateData.profile.twitterUrl !== undefined) mappedProfile.twitterUrl = updateData.profile.twitterUrl;
      if (updateData.profile.instagramUrl !== undefined) mappedProfile.instagramUrl = updateData.profile.instagramUrl;
      
      updateFields.profile = mappedProfile;
    }
    
    console.log("📋 Final update fields with mapping:", updateFields);
    
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