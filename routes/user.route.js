import express from 'express';
import {
  authenticateToken,
  sessionOnlyAuth
} from '../middleware/authMiddleware.js'; 
import {
  getProfile,
  register,
  resendVerificationCode,
  updateProfile,
  verifyEmail,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  loginEnhanced, // 🆕 Enhanced login
  refreshToken, // 🆕 Refresh token
  logoutEnhanced, // 🆕 Enhanced logout
  revokeAllSessions, // 🆕 Revoke all sessions
  getUserSessions, // 🆕 Get user sessions


} from '../controllers/user.controller.js';
import { singleUpload } from '../middleware/multer.js';
import { userModel } from '../models/userModel.js';
import PerformanceAnalytics from '../models/PerformanceAnalytics.js'; // 🆕 Import for cleanup
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'; // Add this import
import { sendEmail } from '../utils/emailService.js'; // Add this import

const router = express.Router();
// Public routes (no authentication required)
router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationCode);

// Forgot Password Routes
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);

// Enhanced authentication routes (with session management)
router.post('/login-enhanced', loginEnhanced); // New enhanced login
router.post('/refresh', sessionOnlyAuth, refreshToken); // New refresh endpoint
router.post('/logout-enhanced', logoutEnhanced); // New enhanced logout

// Session management routes
router.post('/revoke-all', authenticateToken, revokeAllSessions);
router.get('/sessions', authenticateToken, getUserSessions);

// ✅ Get Account Deletion Info endpoint
router.get('/deletion-info', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find user
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user analytics to show what will be deleted
    const analytics = await PerformanceAnalytics.findOne({ userId });

    const deletionInfo = {
      accountInfo: {
        email: user.email,
        name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || 'User',
        memberSince: user.createdAt
      },
      dataToDelete: {
        quizzesCreated: 0, // If you have user-created quizzes
        totalQuizzesTaken: analytics?.totalQuizzesTaken || 0,
        totalQuestions: analytics?.totalQuestionsAttempted || 0,
        bbPoints: analytics?.cumulativeScore || 0,
        analyticsData: !!analytics,
        profileData: true,
        allPersonalData: true
      }
    };


    res.json({
      success: true,
      message: 'Account deletion info retrieved successfully',
      info: deletionInfo
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get deletion info',
      error: error.message
    });
  }
});

// ✅ Delete Account endpoint - COMPLETE IMPLEMENTATION
router.delete('/delete-account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { password, confirmationText } = req.body;


    // Validate required fields
    if (!password || !confirmationText) {
      return res.status(400).json({
        success: false,
        message: 'Password and confirmation are required'
      });
    }

    // Validate confirmation text
    if (confirmationText !== 'DELETE') {
      return res.status(400).json({
        success: false,
        message: 'You must type DELETE to confirm account deletion'
      });
    }

    // Find user and verify password
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Collect deletion summary before deletion
    const analytics = await PerformanceAnalytics.findOne({ userId });
    const deletionSummary = {
      email: user.email,
      name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || 'User',
      deletedData: {
        quizzesTaken: analytics?.totalQuizzesTaken || 0,
        questionsAnswered: analytics?.totalQuestionsAttempted || 0,
        bbPointsEarned: analytics?.cumulativeScore || 0,
        analyticsRecords: !!analytics,
        accountAge: Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)) + ' days'
      },
      deletionDate: new Date().toISOString()
    };


    // Start transaction for atomic deletion
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Delete user analytics
      if (analytics) {
        await PerformanceAnalytics.deleteOne({ userId }, { session });
      }
      // 4. Delete the user account
      await userModel.deleteOne({ _id: userId }, { session });

      // Commit transaction
      await session.commitTransaction();

      // Send deletion confirmation email (optional)
      try {
        if (sendEmail) {
          await sendEmail({
            to: user.email,
            subject: 'Account Deletion Confirmation - B4AI',
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background-color: #ff3b30; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                  .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                  .summary { background-color: #fee; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ff3b30; }
                  .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Account Deletion Confirmed</h1>
                  </div>
                  <div class="content">
                    <h2>Goodbye ${deletionSummary.name || 'User'},</h2>
                    
                    <p>Your B4AI account has been permanently deleted as requested on ${new Date().toLocaleDateString()}.</p>
                    
                    <div class="summary">
                      <h3>📊 Data Summary (Permanently Deleted):</h3>
                      <ul>
                        <li>🎯 Quiz attempts: ${deletionSummary.deletedData.quizzesTaken}</li>
                        <li>❓ Questions answered: ${deletionSummary.deletedData.questionsAnswered}</li>
                        <li>🏆 BB Points earned: ${deletionSummary.deletedData.bbPointsEarned}</li>
                        <li>📈 All analytics and performance data</li>
                        <li>👤 Complete profile information</li>
                        <li>📅 Account age: ${deletionSummary.deletedData.accountAge}</li>
                      </ul>
                    </div>
                    
                    <p><strong>This action was permanent and cannot be undone.</strong></p>
                    
                    <p>If you created this account again in the future, you will start fresh with no previous data.</p>
                    
                    <p>Thank you for using B4AI. We're sorry to see you go!</p>
                    
                    <div class="footer">
                      <p>Best regards,<br>The B4AI Team</p>
                      <p style="color: #9ca3af; font-size: 12px;">This email confirms the permanent deletion of your account. No further action is required.</p>
                    </div>
                  </div>
                </div>
              </body>
              </html>
            `
          });
        }
      } catch (emailError) {
        // Email failure shouldn't stop the deletion
      }

      res.json({
        success: true,
        message: 'Account deleted successfully',
        deletionSummary: deletionSummary
      });

    } catch (transactionError) {
      // Rollback transaction on error
      await session.abortTransaction();
      throw transactionError;
    } finally {
      session.endSession();
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: error.message
    });
  }
});

// ✅ ADMIN CREATE USER ENDPOINT WITH EMAIL
router.post('/admin/create-user', authenticateToken, async (req, res) => {
  try {

    // ✅ FIRST: Get the requesting user from database to check their role
    const requestingUser = await userModel.findById(req.user.userId);

    // Check if the requester exists
    if (!requestingUser) {
      return res.status(404).json({
        success: false,
        message: 'Requesting user not found',
      });
    }

    // ✅ NOW check if the requester is an admin
    if (requestingUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: `Only admins can create users. Your role: ${requestingUser.role}`,
        debug: {
          userId: req.user.userId,
          userRole: requestingUser.role,
          requiredRole: 'admin',
        },
      });
    }


    const { email, password, role, profile, sendWelcomeEmail } = req.body;


    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Check if user already exists
    const existingUser = await userModel.findOne({
      email: email.toLowerCase(),
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
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
        profilePic: profile?.profilePic || '',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newUser.save();

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
                    <a href="${
                      process.env.FRONTEND_URL || 'http://localhost:3000'
                    }/login" class="button">Log In to Your Account</a>
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
          `,
        };

        await sendEmail(emailContent);
      } catch (emailError) {
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
      createdAt: newUser.createdAt,
    };

    // Return success response
    res.status(201).json({
      success: true,
      message:
        'User created successfully' +
        (sendWelcomeEmail ? ' and welcome email sent' : ''),
      user: userResponse,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message,
    });
  }
});

// ✅ DATABASE INTEGRATED: USERS LIST ENDPOINT - Using your userModel
router.get('/users', async (req, res) => {
  try {

    // Fetch all users from database using your existing userModel
    const users = await userModel
      .find({})
      .select(
        '-password -refreshToken -emailVerificationCode -passwordResetCode'
      )
      .sort({ createdAt: -1 }); // Latest first


    // ✅ Transform data for frontend compatibility - map backend fields to frontend expectations
    const transformedUsers = users.map((user) => ({
      _id: user._id,
      email: user.email,
      role: user.role || 'student',
      profile: {
        ...user.profile,
        // ✅ Map backend field names to what frontend expects (if needed for display)
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        // Keep both for compatibility
        DOB: user.profile?.dateOfBirth, // Legacy field
        dateOfBirth: user.profile?.dateOfBirth, // New field
        DOG: user.profile?.dateOfGraduation, // Legacy field
        dateOfGraduation: user.profile?.dateOfGraduation, // New field
        institute: user.profile?.institute,
        institution: user.profile?.institute, // For frontend compatibility
        countryOfResidence: user.profile?.countryOfResidence,
        country: user.profile?.countryOfResidence, // For frontend compatibility
        educationStatus: user.profile?.educationStatus,
        educationalStatus: user.profile?.educationStatus, // For frontend compatibility
        residence: user.profile?.residence,
        address: user.profile?.residence, // For frontend compatibility
        specialty: user.profile?.specialty,
        specialty: user.profile?.specialty, // For frontend compatibility
      },
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      isVerified: user.isVerified || false,
      lastActive: user.lastActive,
    }));

    res.json({
      success: true,
      message: 'Users fetched successfully from MongoDB database',
      users: transformedUsers,
      count: transformedUsers.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users from database',
      error: error.message,
    });
  }
});

// ✅ DATABASE INTEGRATED: USER STATS ENDPOINT (for dashboard)
router.get('/stats', async (req, res) => {
  try {

    // Get user statistics using your userModel
    const totalUsers = await userModel.countDocuments();
    const activeUsers = await userModel.countDocuments({ isVerified: true });
    const adminUsers = await userModel.countDocuments({ role: 'admin' });

    // Users registered this month
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const newThisMonth = await userModel.countDocuments({
      createdAt: { $gte: currentMonth },
    });


    res.json({
      success: true,
      message: 'User statistics fetched successfully from MongoDB',
      stats: {
        totalUsers,
        activeUsers,
        adminUsers,
        newThisMonth,
        inactiveUsers: totalUsers - activeUsers,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics from database',
      error: error.message,
    });
  }
});

// ✅ DELETE USER BY EMAIL
router.delete('/users/email/:email', authenticateToken, async (req, res) => {
  try {
    const { email } = req.params;
    const decodedEmail = decodeURIComponent(email); // Handle encoded emails


    // Find user by email
    const userToDelete = await userModel.findOne({
      email: decodedEmail.toLowerCase(),
    });

    if (!userToDelete) {
      return res.status(404).json({
        success: false,
        message: `User with email ${decodedEmail} not found`,
      });
    }


    // Prevent deleting admin users (optional)
    /*if (userToDelete.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin users',
      });
    }*/

    // Prevent users from deleting themselves
    if (userToDelete._id.toString() === req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete your own account',
      });
    }

    // Delete the user
    const deletedUser = await userModel.findOneAndDelete({
      email: decodedEmail.toLowerCase(),
    });


    res.json({
      success: true,
      message: `User ${deletedUser.email} deleted successfully`,
      deletedUser: {
        _id: deletedUser._id,
        email: deletedUser.email,
        name: `${deletedUser.profile?.firstName || ''} ${
          deletedUser.profile?.lastName || ''
        }`.trim(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message,
    });
  }
});

// ✅ UPDATE USER BY EMAIL
router.put('/users/email/:email', authenticateToken, async (req, res) => {
  try {
    const { email } = req.params;
    const decodedEmail = decodeURIComponent(email);
    const updateData = req.body;


    // Find user by email
    const existingUser = await userModel.findOne({
      email: decodedEmail.toLowerCase(),
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: `User with email ${decodedEmail} not found`,
      });
    }

    // Prepare update object
    const updateFields = {
      updatedAt: new Date(),
    };

    // Handle email update
    if (
      updateData.email &&
      updateData.email.toLowerCase() !== existingUser.email.toLowerCase()
    ) {
      const emailExists = await userModel.findOne({
        email: updateData.email.toLowerCase(),
        _id: { $ne: existingUser._id },
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists',
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
      const existingProfile =
        existingUser.profile?.toObject?.() || existingUser.profile || {};

      // ✅ Map frontend fields to backend model fields
      const mappedProfile = { ...existingProfile };

      // Direct field updates
      if (updateData.profile.firstName !== undefined)
        mappedProfile.firstName = updateData.profile.firstName;
      if (updateData.profile.lastName !== undefined)
        mappedProfile.lastName = updateData.profile.lastName;
      if (updateData.profile.gender !== undefined)
        mappedProfile.gender = updateData.profile.gender;
      if (updateData.profile.profilePic !== undefined)
        mappedProfile.profilePic = updateData.profile.profilePic;

      // ✅ Field mapping updates
      if (updateData.profile.dateOfBirth !== undefined)
        mappedProfile.dateOfBirth = updateData.profile.dateOfBirth;
      if (updateData.profile.DOB !== undefined)
        mappedProfile.dateOfBirth = updateData.profile.DOB; // Legacy support

      if (updateData.profile.dateOfGraduation !== undefined)
        mappedProfile.dateOfGraduation = updateData.profile.dateOfGraduation;
      if (updateData.profile.DOG !== undefined)
        mappedProfile.dateOfGraduation = updateData.profile.DOG; // Legacy support

      if (updateData.profile.institute !== undefined)
        mappedProfile.institute = updateData.profile.institute;
      if (updateData.profile.institution !== undefined)
        mappedProfile.institute = updateData.profile.institution; // Frontend compatibility

      if (updateData.profile.countryOfResidence !== undefined)
        mappedProfile.countryOfResidence =
          updateData.profile.countryOfResidence;
      if (updateData.profile.country !== undefined)
        mappedProfile.countryOfResidence = updateData.profile.country; // Frontend compatibility

      if (updateData.profile.educationStatus !== undefined)
        mappedProfile.educationStatus = updateData.profile.educationStatus;
      if (updateData.profile.educationalStatus !== undefined)
        mappedProfile.educationStatus = updateData.profile.educationalStatus; // Frontend compatibility

      if (updateData.profile.residence !== undefined)
        mappedProfile.residence = updateData.profile.residence;
      if (updateData.profile.address !== undefined)
        mappedProfile.residence = updateData.profile.address; // Frontend compatibility

      if (updateData.profile.specialty !== undefined)
        mappedProfile.specialty = updateData.profile.specialty;
      if (updateData.profile.specialty !== undefined)
        mappedProfile.specialty = updateData.profile.specialty; // Frontend compatibility

      // Social media fields
      if (updateData.profile.facebookUrl !== undefined)
        mappedProfile.facebookUrl = updateData.profile.facebookUrl;
      if (updateData.profile.twitterUrl !== undefined)
        mappedProfile.twitterUrl = updateData.profile.twitterUrl;
      if (updateData.profile.instagramUrl !== undefined)
        mappedProfile.instagramUrl = updateData.profile.instagramUrl;

      updateFields.profile = mappedProfile;
    }


    // Update user by email
    const updatedUser = await userModel
      .findOneAndUpdate(
        { email: decodedEmail.toLowerCase() },
        { $set: updateFields },
        {
          new: true,
          runValidators: true,
        }
      )
      .select(
        '-password -refreshToken -emailVerificationCode -passwordResetCode'
      );


    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message,
    });
  }
});

//  GET USER BY EMAIL
router.get('/users/email/:email', authenticateToken, async (req, res) => {
  try {
    const { email } = req.params;
    const decodedEmail = decodeURIComponent(email);


    // Find user by email
    const user = await userModel
      .findOne({
        email: decodedEmail.toLowerCase(),
      })
      .select(
        '-password -refreshToken -emailVerificationCode -passwordResetCode'
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User with email ${decodedEmail} not found`,
      });
    }


    res.json({
      success: true,
      message: 'User details retrieved successfully',
      data: {
        user,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get user details',
      error: error.message,
    });
  }
});

// DATABASE INTEGRATED: CHANGE PASSWORD ENDPOINT
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    // Find user using your userModel
    const user = await userModel.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Hash new password (same salt rounds as your controller)
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await userModel.findByIdAndUpdate(req.user.userId, {
      password: hashedNewPassword,
      updatedAt: new Date(),
    });


    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message,
    });
  }
});

//  DATABASE INTEGRATED: UPLOAD AVATAR ENDPOINT
router.put('/upload-avatar', authenticateToken, async (req, res) => {
  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({
        success: false,
        message: 'Image data is required',
      });
    }

    // Update user's profile picture in database using your userModel
    const updatedUser = await userModel
      .findByIdAndUpdate(
        req.user.userId,
        {
          $set: {
            'profile.profilePic': imageData,
            updatedAt: new Date(),
          },
        },
        { new: true, runValidators: true }
      )
      .select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }


    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        user: updatedUser,
      },
      profilePic: imageData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to upload avatar',
      error: error.message,
    });
  }
});

//  TEST DELETE ACCOUNT ENDPOINT (for testing purposes)
router.post('/test-delete-account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Find user
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get analytics
    const analytics = await PerformanceAnalytics.findOne({ userId });

    const simulationResult = {
      user: {
        email: user.email,
        name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim()
      },
      dataToBeDeleted: {
        analyticsRecord: !!analytics,
        quizzesTaken: analytics?.totalQuizzesTaken || 0,
        questionsAnswered: analytics?.totalQuestionsAttempted || 0,
        bbPoints: analytics?.cumulativeScore || 0,
        accountAge: Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)) + ' days'
      },
      warningMessage: 'This is a simulation. Actual deletion would be permanent and irreversible.'
    };

    res.json({
      success: true,
      message: 'Delete account simulation completed',
      simulation: simulationResult
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to simulate account deletion',
      error: error.message
    });
  }
});

// Protected routes (authentication required) - Your existing routes
router.get('/profile/:id', authenticateToken, getProfile);
router.put('/update-profile', authenticateToken, singleUpload, updateProfile);



// Test protected route
router.get('/protected', authenticateToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Protected route accessed successfully',
    data: {
      user: req.user,
    },
  });
});

// Free usage limits endpoint
router.get('/free-usage-limits', authenticateToken, async (req, res) => {
  try {
    const user = await userModel.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize freeQuizUsage if not exists
    if (!user.freeQuizUsage) {
      user.freeQuizUsage = {
        totalQuestionsUsed: 0,
        questionsUsedByMode: { TIMED: 0, UNTIMED: 0, 'ON-THE-GO': 0 },
        questionsUsedByLanguage: new Map(),
        lastResetDate: new Date(),
        usageHistory: []
      };
      await user.save();
    }

    res.json({
      success: true,
      usage: {
        totalQuestionsUsed: user.freeQuizUsage.totalQuestionsUsed || 0,
        questionsUsedByMode: user.freeQuizUsage.questionsUsedByMode || { TIMED: 0, UNTIMED: 0, 'ON-THE-GO': 0 },
        questionsUsedByLanguage: Object.fromEntries(user.freeQuizUsage.questionsUsedByLanguage || new Map()),
        lastResetDate: user.freeQuizUsage.lastResetDate || new Date().toDateString()
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get usage limits',
      error: error.message 
    });
  }
});

// Update free usage - WITH AUTH
router.post('/update-free-usage', authenticateToken, async (req, res) => {
  try {
    const { questionsAnswered, mode, language, timestamp } = req.body;
    const userId = req.user.userId;


    const user = await userModel.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize if not exists
    if (!user.freeQuizUsage) {
      user.freeQuizUsage = {
        totalQuestionsUsed: 0,
        questionsUsedByMode: { TIMED: 0, UNTIMED: 0, 'ON-THE-GO': 0 },
        questionsUsedByLanguage: new Map(),
        lastResetDate: new Date(),
        usageHistory: []
      };
    }

    // Update totals
    user.freeQuizUsage.totalQuestionsUsed += questionsAnswered;
    user.freeQuizUsage.questionsUsedByMode[mode] = (user.freeQuizUsage.questionsUsedByMode[mode] || 0) + questionsAnswered;
    
    // Update language usage
    const currentLangUsage = user.freeQuizUsage.questionsUsedByLanguage.get(language) || 0;
    user.freeQuizUsage.questionsUsedByLanguage.set(language, currentLangUsage + questionsAnswered);

    // Add to history for analytics
    user.freeQuizUsage.usageHistory.push({
      date: new Date(timestamp || Date.now()),
      questionsUsed: questionsAnswered,
      mode,
      language
    });

    // Keep only last 100 history entries to avoid bloat
    if (user.freeQuizUsage.usageHistory.length > 100) {
      user.freeQuizUsage.usageHistory = user.freeQuizUsage.usageHistory.slice(-100);
    }

    await user.save();


    res.json({
      success: true,
      message: 'Usage updated successfully',
      usage: {
        totalQuestionsUsed: user.freeQuizUsage.totalQuestionsUsed,
        questionsUsedByMode: user.freeQuizUsage.questionsUsedByMode,
        questionsUsedByLanguage: Object.fromEntries(user.freeQuizUsage.questionsUsedByLanguage),
        lastResetDate: user.freeQuizUsage.lastResetDate
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update usage',
      error: error.message 
    });
  }
});

export default router;
//routes/user.route.js