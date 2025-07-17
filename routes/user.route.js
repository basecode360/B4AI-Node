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
import bcrypt from "bcryptjs"; // Add this import
import { sendEmail } from "../utils/emailService.js"; // Add this import

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

// ✅ ADMIN CREATE USER ENDPOINT WITH EMAIL
router.post("/admin/create-user", authenticateToken, async (req, res) => {
  try {
    console.log("🔧 DEBUG: Admin create user endpoint hit");
    console.log("🔧 DEBUG: req.user from middleware:", req.user);
    console.log("🔧 DEBUG: req.user.userId:", req.user?.userId);

    // ✅ FIRST: Get the requesting user from database to check their role
    const requestingUser = await userModel.findById(req.user.userId);
    console.log("🔧 DEBUG: Found requesting user:", {
      _id: requestingUser?._id,
      email: requestingUser?.email,
      role: requestingUser?.role,
      exists: !!requestingUser
    });

    // Check if the requester exists
    if (!requestingUser) {
      console.log("❌ DEBUG: Requesting user not found in database");
      return res.status(404).json({
        success: false,
        message: "Requesting user not found"
      });
    }

    // ✅ NOW check if the requester is an admin
    if (requestingUser.role !== 'admin') {
      console.log("❌ DEBUG: Role check failed - Expected: admin, Got:", requestingUser.role);
      return res.status(403).json({
        success: false,
        message: `Only admins can create users. Your role: ${requestingUser.role}`,
        debug: {
          userId: req.user.userId,
          userRole: requestingUser.role,
          requiredRole: 'admin'
        }
      });
    }

    console.log("✅ DEBUG: Admin role verified successfully");

    const { email, password, role, profile, sendWelcomeEmail } = req.body;

    console.log("👤 Admin creating new user:", email);

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Check if user already exists
    const existingUser = await userModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists"
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = new userModel({
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'student',
      isVerified: true, // Auto-verify users created by admin
      profile: {
        firstName: profile?.firstName || '',
        lastName: profile?.lastName || '',
        dateOfBirth: profile?.dateOfBirth || '',
        gender: profile?.gender || 'not_specified',
        institute: profile?.institute || '',
        countryOfResidence: profile?.countryOfResidence || '',
        educationStatus: profile?.educationStatus || 'student',
        residence: profile?.residence || '',
        dateOfGraduation: profile?.dateOfGraduation || '',
        specialty: profile?.specialty || '',
        facebookUrl: profile?.facebookUrl || '',
        twitterUrl: profile?.twitterUrl || '',
        instagramUrl: profile?.instagramUrl || '',
        profilePic: profile?.profilePic || ''
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newUser.save();
    console.log("✅ User created successfully:", newUser.email);

    // Send welcome email if requested
    if (sendWelcomeEmail && sendEmail) {
      try {
        const emailContent = {
          to: email,
          subject: 'Welcome to B4AI - Your Account Has Been Created',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                .credentials { background-color: #e5e7eb; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Welcome to B4AI!</h1>
                </div>
                <div class="content">
                  <h2>Hello ${profile?.firstName || 'User'},</h2>
                  
                  <p>Your account has been successfully created by an administrator. You can now access the B4AI platform with the following credentials:</p>
                  
                  <div class="credentials">
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Password:</strong> ${password}</p>
                    <p><strong>Role:</strong> ${role || 'student'}</p>
                  </div>
                  
                  <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
                  
                  <p>You can log in to your account using the button below:</p>
                  
                  <div style="text-align: center;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">Log In to Your Account</a>
                  </div>
                  
                  <h3>What's Next?</h3>
                  <ul>
                    <li>Complete your profile information</li>
                    <li>Explore available quizzes and learning materials</li>
                    <li>Start your learning journey with B4AI</li>
                  </ul>
                  
                  <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                  
                  <div class="footer">
                    <p>Best regards,<br>The B4AI Team</p>
                    <p style="color: #9ca3af; font-size: 12px;">This email was sent because an administrator created an account for you. If you believe this was done in error, please contact support.</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `
        };

        await sendEmail(emailContent);
        console.log("✉️ Welcome email sent to:", email);
      } catch (emailError) {
        console.error("❌ Failed to send welcome email:", emailError);
        // Don't fail the user creation if email fails
      }
    }

    // Remove sensitive data before sending response
    const userResponse = {
      _id: newUser._id,
      email: newUser.email,
      role: newUser.role,
      profile: newUser.profile,
      isVerified: newUser.isVerified,
      createdAt: newUser.createdAt
    };

    // Return success response
    res.status(201).json({
      success: true,
      message: "User created successfully" + (sendWelcomeEmail ? " and welcome email sent" : ""),
      user: userResponse
    });

  } catch (error) {
    console.error("❌ Error creating user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message
    });
  }
});

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