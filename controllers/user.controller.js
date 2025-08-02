import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userModel } from '../models/userModel.js';
import {
  generateCode,
  isValidEmail,
  sendVerificationEmail,
} from '../methods/methods.js';
import { schemaForVerify } from '../models/verifyModel.js';
import getDataUri from '../utils/datauri.js';
import cloudinary from '../utils/cloudinary.js';
import { SessionService } from '../services/sessionService.js';
import { JWTService } from '../services/jwtService.js';

const register = async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      confirmPassword,
      gender,
      educationalStatus, // Frontend sends this
      specialty, // Frontend sends this
      institution, // Frontend sends this
      country, // Frontend sends this
      dateOfBirth, // Frontend sends this
      dateOfGraduation, // Frontend sends this
      address, // Frontend sends this
    } = req.body;

    console.log('📝 Registration data received from frontend:', {
      email,
      firstName,
      lastName,
      gender,
      educationalStatus,
      specialty,
      institution,
      country,
      dateOfBirth,
      dateOfGraduation,
      address,
    });

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password do not matched',
      });
    }

    // Check if user already exists
    const existingUser = await userModel.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      // If user exists but not verified, allow resending verification
      if (!existingUser.isVerified) {
        // Delete any existing verification codes for this user
        await schemaForVerify.deleteMany({ userId: existingUser._id });

        // Generate new verification code
        const verificationCode = generateCode();

        // Create new verification entry
        const newVerification = new schemaForVerify({
          userId: existingUser._id,
          verificationCode,
        });
        await newVerification.save();

        console.log(
          'first ==>',
          existingUser.email,
          verificationCode,
          existingUser.profile.firstName
        );

        // Send verification email
        await sendVerificationEmail(
          existingUser.email,
          verificationCode,
          existingUser.profile.firstName
        );

        return res.status(200).json({
          success: true,
          message: 'Verification code resent to your email',
          email: existingUser.email,
        });
      }

      return res.status(409).json({
        success: false,
        message: 'User with this email already exists and is verified',
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // ✅ FIXED: Map frontend field names to backend model field names
    const profileData = {
      firstName: firstName || '',
      lastName: lastName || '',
      // ✅ Frontend: dateOfBirth -> Backend: dateOfBirth
      dateOfBirth: dateOfBirth || '',
      // ✅ Frontend: dateOfGraduation -> Backend: dateOfGraduation
      dateOfGraduation: dateOfGraduation || '',
      // ✅ Frontend: country -> Backend: countryOfResidence
      countryOfResidence: country || '',
      // ✅ Frontend: institution -> Backend: institute
      institute: institution || '',
      // ✅ Frontend: address -> Backend: residence
      residence: address || '',
      // ✅ Frontend: educationalStatus -> Backend: educationStatus
      educationStatus: educationalStatus || 'student',
      // ✅ Frontend: specialty -> Backend: speciality
      specialty: specialty || "",
      // ✅ Gender mapping
      gender: gender || 'not_specified',
      // ✅ Initialize social media fields
      facebookUrl: '',
      twitterUrl: '',
      instagramUrl: '',
    };

    console.log('🔄 Mapped profile data for backend model:', profileData);

    // Create new user
    const newUser = new userModel({
      email: email.toLowerCase(),
      password: hashedPassword,
      isVerified: false,
      profile: profileData,
    });

    console.log(
      '🔍 User object before save:',
      JSON.stringify(newUser.toObject(), null, 2)
    );

    // Save user to database
    await newUser.save();

    console.log('✅ User saved to database successfully with profile data');

    // Generate verification code
    const verificationCode = generateCode();

    // Create verification entry
    const newVerification = new schemaForVerify({
      userId: newUser._id,
      verificationCode,
    });
    await newVerification.save();

    console.log(
      'second ==>',
      newUser.email,
      verificationCode,
      newUser.profile.firstName
    );

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationCode, firstName);
    } catch (emailError) {
      // If email fails, delete the user and verification entry
      await userModel.findByIdAndDelete(newUser._id);
      await schemaForVerify.deleteOne({ userId: newUser._id });

      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.',
      });
    }

    // Return success response (don't send token until verified)
    return res.status(201).json({
      success: true,
      message:
        'Registration successful! Please check your email for verification code.',
      email: newUser.email,
      verificationRequired: true,
    });
  } catch (error) {
    console.error('Register error:', error);

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // ✅ Enhanced error logging for validation issues
    if (error.name === 'ValidationError') {
      console.error('❌ Validation Error Details:', error.errors);
      const errorMessages = Object.keys(error.errors).map(
        (key) => `${key}: ${error.errors[key].message}`
      );
      return res.status(400).json({
        success: false,
        message: 'Validation failed: ' + errorMessages.join(', '),
        errors: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
// Verify Email Code Controller
const verifyEmail = async (req, res) => {
  try {
    const { email, verificationCode } = req.body;

    // Validation
    if (!email || !verificationCode) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required',
      });
    }

    // Find user
    const user = await userModel.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user is already verified
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'User is already verified',
      });
    }

    // Find verification entry
    const verification = await schemaForVerify.findOne({
      userId: user._id,
      verificationCode: verificationCode,
    });

    if (!verification) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code or code has expired',
      });
    }

    // Mark user as verified
    user.isVerified = true;
    await user.save();

    // Delete verification entry after successful verification
    await schemaForVerify.deleteOne({ _id: verification._id });

     // Generate JWT token
     const tokenData = { userId: user._id };
     const token = jwt.sign(tokenData, process.env.JWT_SECRET, {
       expiresIn: '1m',
     });
    

    // Remove password from response
    const userResponse = {
      _id: user._id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      profile: user.profile,
      createdAt: user.createdAt,
    };

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during verification',
      error: error.message || undefined,
    });
  }
};

// Resend Verification Code Controller
const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Find user
    const user = await userModel.findOne({
      email: email.toLowerCase(),
      isVerified: false,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found or already verified',
      });
    }

    // Delete any existing verification codes for this user
    await schemaForVerify.deleteMany({ userId: user._id });

    // Generate new verification code
    const verificationCode = generateCode();

    // Create new verification entry
    const newVerification = new schemaForVerify({
      userId: user._id,
      verificationCode,
    });
    await newVerification.save();

    // Send verification email
    await sendVerificationEmail(
      user.email,
      verificationCode,
      user.profile.firstName
    );

    return res.status(200).json({
      success: true,
      message: 'New verification code sent to your email',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification code',
      error: error.message || undefined,
    });
  }
};

// Enhanced Login API
// Helper function to set secure session cookie
const setSessionCookie = (res, sessionId) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const sessionTTLDays = parseInt(process.env.SESSION_TTL_DAYS || '7');
  const maxAge = sessionTTLDays * 24 * 60 * 60 * 1000; // Convert to milliseconds

  res.cookie('session_id', sessionId, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: maxAge,
    path: '/',
  });
};

// Helper function to clear session cookie
const clearSessionCookie = (res) => {
  res.clearCookie('session_id', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
};

/**
 * ENHANCED LOGIN - Now creates session + issues JWT
 */
const loginEnhanced = async (req, res) => {
  try {
    const { email, password } = req.body; // Removed rememberMe for now

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    // Find user by email (must be verified)
    const user = await userModel.findOne({
      email: email.toLowerCase(),
      isVerified: true,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Get client information
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || req.connection.remoteAddress || '';

    // Create new session (your existing method works fine)
    const session = await SessionService.createSession(
      user._id,
      userAgent,
      ipAddress
    );

    // Update user's last login
    user.lastLogin = new Date();
    await user.save();

    // Generate short-lived access token (15 minutes)
    const tokenPayload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      sessionId: session.sessionId,
    };

    const accessToken = JWTService.generateAccessToken(tokenPayload);

    // Set session cookie (for web clients)
    setSessionCookie(res, session.sessionId);

    // Prepare user response (remove sensitive data)
    const userResponse = {
      _id: user._id,
      email: user.email,
      role: user.role,
      profile: user.profile,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    };

    console.log(`✅ Enhanced login successful for user: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      token: accessToken,
      accessToken,
      sessionId: session.sessionId,
      tokenExpiration: JWTService.getTokenExpiration(accessToken),
    });
  } catch (error) {
    console.error('❌ Enhanced login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
/**
 * NEW: REFRESH TOKEN ENDPOINT
 */
const refreshToken = async (req, res) => {
  try {
    // Session ID extracted by middleware
    const sessionId = req.sessionId;

    console.log(`🔄 Refresh token attempt for session: ${sessionId}`);

    // Find and refresh the session (sliding window)
    const session = await SessionService.refreshSession(sessionId);

    if (!session) {
      clearSessionCookie(res);
      return res.status(401).json({
        success: false,
        message: 'Session expired or invalid. Please login again.',
        code: 'SESSION_EXPIRED',
      });
    }

    // Generate new access token
    const tokenPayload = {
      userId: session.userId._id,
      email: session.userId.email,
      role: session.userId.role,
      sessionId: session.sessionId,
    };

    const newAccessToken = JWTService.generateAccessToken(tokenPayload);

    console.log(`✅ Token refreshed for user: ${session.userId.email}`);

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      accessToken: newAccessToken,
      token: newAccessToken,
      tokenExpiration: JWTService.getTokenExpiration(newAccessToken),
      sessionExpiration: session.expireAt,
    });
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during token refresh',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * ENHANCED LOGOUT - Now deletes session
 */
const logoutEnhanced = async (req, res) => {
  try {
    const sessionId = req.sessionId || req.cookies?.session_id;

    if (sessionId) {
      const deleted = await SessionService.deleteSession(sessionId);
      if (deleted) {
        console.log(`✅ Session logged out: ${sessionId}`);
      }
    }

    clearSessionCookie(res);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('❌ Enhanced logout error:', error);
    clearSessionCookie(res);
    res.status(500).json({
      success: false,
      message: 'Logout completed with errors',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * NEW - Revoke all sessions (logout from all devices)
 */
const revokeAllSessions = async (req, res) => {
  try {
    const userId = req.user.userId;

    const revokedCount = await SessionService.revokeAllUserSessions(userId);

    clearSessionCookie(res);

    console.log(`✅ Revoked ${revokedCount} sessions for user: ${userId}`);

    return res.status(200).json({
      success: true,
      message: `Logged out from all devices. ${revokedCount} sessions revoked.`,
      revokedSessions: revokedCount,
    });
  } catch (error) {
    console.error('❌ Revoke all sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error revoking sessions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * NEW - Get user's active sessions
 */
const getUserSessions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const sessions = await SessionService.getUserSessions(userId);

    const sessionData = sessions.map((session) => ({
      sessionId: session.sessionId,
      lastAccessed: session.lastAccessed,
      createdAt: session.createdAt,
      expireAt: session.expireAt,
      deviceInfo: session.deviceInfo,
      ipAddress: session.ipAddress,
    }));

    return res.status(200).json({
      success: true,
      sessions: sessionData,
      totalSessions: sessionData.length,
    });
  } catch (error) {
    console.error('❌ Get user sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sessions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Get User Profile API (Bonus)
const getProfile = async (req, res) => {
  try {
    const userId = req.params.id; // From auth middleware

    const user = await userModel.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// Forgot Password - Send OTP
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    console.log('🔍 Forgot password request for email:', email);

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    // Find user by email (must be verified user)
    const user = await userModel.findOne({
      email: email.toLowerCase(),
      isVerified: true, // Only verified users can reset password
    });

    if (!user) {
      // Don't reveal if user exists for security
      return res.status(200).json({
        success: true,
        message:
          'If this email is registered, you will receive a password reset code.',
        email: email.toLowerCase(),
      });
    }

    console.log('✅ User found for password reset:', user.email);

    // Delete any existing verification codes for this user
    await schemaForVerify.deleteMany({ userId: user._id });

    // Generate new verification code
    const resetCode = generateCode();

    // Create new verification entry
    const newVerification = new schemaForVerify({
      userId: user._id,
      verificationCode: resetCode,
    });
    await newVerification.save();

    console.log('✅ Reset code generated and saved:', resetCode);

    // Send forgot password email
    try {
      await sendVerificationEmail(
        user.email,
        resetCode,
        user.profile?.firstName || 'User'
      );

      console.log('✅ Forgot password email sent successfully');

      return res.status(200).json({
        success: true,
        message: 'Password reset code sent to your email',
        email: user.email,
      });
    } catch (emailError) {
      console.error('❌ Failed to send forgot password email:', emailError);

      // Delete the verification entry if email fails
      await schemaForVerify.deleteOne({ userId: user._id });

      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email. Please try again.',
      });
    }
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Verify Reset Code (Optional - for added security)
const verifyResetCode = async (req, res) => {
  try {
    const { email, resetCode } = req.body;

    console.log('🔍 Verifying reset code for:', email);

    // Validation
    if (!email || !resetCode) {
      return res.status(400).json({
        success: false,
        message: 'Email and reset code are required',
      });
    }

    // Find user
    const user = await userModel.findOne({
      email: email.toLowerCase(),
      isVerified: true,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request',
      });
    }

    // Find verification entry
    const verification = await schemaForVerify.findOne({
      userId: user._id,
      verificationCode: resetCode,
    });

    if (!verification) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code',
      });
    }

    console.log('✅ Reset code verified successfully');

    return res.status(200).json({
      success: true,
      message: 'Reset code verified successfully',
      email: user.email,
    });
  } catch (error) {
    console.error('❌ Verify reset code error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Reset Password with OTP
const resetPassword = async (req, res) => {
  try {
    const { email, resetCode, newPassword, confirmPassword } = req.body;

    console.log('🔍 Password reset attempt for:', email);

    // Validation
    if (!email || !resetCode || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    // Find user
    const user = await userModel.findOne({
      email: email.toLowerCase(),
      isVerified: true,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request',
      });
    }

    // Find and verify reset code
    const verification = await schemaForVerify.findOne({
      userId: user._id,
      verificationCode: resetCode,
    });

    if (!verification) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code',
      });
    }

    console.log('✅ Reset code verified, updating password');

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    // Delete verification entry after successful password reset
    await schemaForVerify.deleteOne({ _id: verification._id });

    console.log('✅ Password reset successfully');

    return res.status(200).json({
      success: true,
      message:
        'Password reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID not found in token',
      });
    }

    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      institute,
      residence,
      countryOfResidence,
      dateOfGraduation,
      specialty,        
      educationStatus,  
      facebookUrl,
      twitterUrl,
      instagramUrl,
    } = req.body;

    const profilePic = req.file;

    console.log("🔍 Extracted fields:", {
      firstName, lastName, dateOfBirth, gender, institute, residence, dateOfGraduation, specialty,countryOfResidence
    });
    console.log('🔍 Social Media URLs:', {
      facebookUrl,
      twitterUrl,
      instagramUrl,
    });
    console.log('🔍 Profile Pic:', profilePic ? 'Present' : 'Not present');

    // ✅ Enhanced validation with detailed error messages
    if (!firstName) {
      return res.status(400).json({
        success: false,
        message: 'First name is required',
      });
    }

    if (!lastName) {
      return res.status(400).json({
        success: false,
        message: 'Last name is required',
      });
    }

    if (!dateOfBirth) {
      return res.status(400).json({
        success: false,
        message: 'Date of birth is required',
      });
    }

    if (!gender) {
      return res.status(400).json({
        success: false,
        message: 'Gender is required',
      });
    }

    // ✅ Date validation
    if (dateOfBirth) {
      const dateOfBirthYear = new Date(dateOfBirth).getFullYear();
      const currentYear = new Date().getFullYear();
      console.log(
        '🔍 dateOfBirth Year:',
        dateOfBirthYear,
        'Current Year:',
        currentYear
      );

      if (dateOfBirthYear >= currentYear) {
        console.log('❌ dateOfBirth validation failed - returning 400');
        return res.status(400).json({
          success: false,
          message: 'Date of Birth cannot be from current or future years',
        });
      }
    }

    if (dateOfGraduation) {
      const dateOfGraduationYear = new Date(dateOfGraduation).getFullYear();
      const currentYear = new Date().getFullYear();
      console.log(
        '🔍 dateOfGraduation Year:',
        dateOfGraduationYear,
        'Current Year:',
        currentYear
      );

      if (dateOfGraduationYear >= currentYear) {
        console.log('❌ dateOfGraduation validation failed - returning 400');
        return res.status(400).json({
          success: false,
          message: 'Date of Graduation cannot be from current or future years',
        });
      }
    }

    // Get current user to preserve existing profile data
    const currentUser = await userModel.findById(userId);

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Merge with existing profile data
    const updatedProfile = {
      ...currentUser.profile, // Preserve existing fields
      firstName,
      lastName,
      dateOfBirth,
      gender,
    };

    // Add optional fields if provided
    if (institute) updatedProfile.institute = institute;
    if (residence) updatedProfile.residence = residence;
    if (countryOfResidence)
      updatedProfile.countryOfResidence = countryOfResidence;
    if (dateOfGraduation) updatedProfile.dateOfGraduation = dateOfGraduation;
    if (specialty) updatedProfile.specialty = specialty;
    if (educationStatus) updatedProfile.educationStatus = educationStatus; 


    // Add social media URLs (even if empty, to allow clearing)
    updatedProfile.facebookUrl = facebookUrl || '';
    updatedProfile.twitterUrl = twitterUrl || '';
    updatedProfile.instagramUrl = instagramUrl || '';

    // Handle profile picture
    if (profilePic) {
      try {
        const getUrl = await getDataUri(profilePic);
        const cloudResponse = await cloudinary.uploader.upload(getUrl.content);
        updatedProfile.profilePic = cloudResponse?.secure_url || '';
      } catch (uploadError) {
        console.error('❌ Profile picture upload failed:', uploadError);
        return res.status(400).json({
          success: false,
          message: 'Failed to upload profile picture',
          error: uploadError.message,
        });
      }
    }

    // Update user with merged profile
    const updatedUser = await userModel
      .findByIdAndUpdate(
        userId,
        { $set: { profile: updatedProfile } },
        { new: true, runValidators: true }
      )
      .select('-password');

    console.log('✅ Profile updated successfully');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Simple Logout API
const logout = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during logout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export {
  register,
  verifyEmail,
  resendVerificationCode,
  loginEnhanced, // New enhanced login
  refreshToken, // New
  logoutEnhanced, // New enhanced logout
  revokeAllSessions, // New
  getUserSessions, // New
  getProfile,
  updateProfile,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  // Keep existing login/logout for backward compatibility if needed
  logout, // Original logout function
  setSessionCookie, // Helper function
  clearSessionCookie, // Helper function
};
