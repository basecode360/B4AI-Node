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

    // Create new user
    const newUser = new userModel({
      email: email.toLowerCase(),
      password: hashedPassword,
      isVerified: false,
      profile: profileData,
    });

    // Save user to database
    await newUser.save();

    // Generate verification code
    const verificationCode = generateCode();

    // Create verification entry
    const newVerification = new schemaForVerify({
      userId: newUser._id,
      verificationCode,
    });
    await newVerification.save();

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
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // ✅ Enhanced error logging for validation issues
    if (error.name === 'ValidationError') {
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
    const { email, password } = req.body;

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

    // Find user by email (regardless of verification status)
    const user = await userModel.findOne({
      email: email.toLowerCase(),
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

    // Create new session
    const session = await SessionService.createSession(
      user._id,
      userAgent,
      ipAddress
    );

    // Update user's last login AND set isVerified to true
    user.lastLogin = new Date();
    user.isVerified = true; // ✅ Set to true on login
    await user.save();

    // Generate access token
    const tokenPayload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      sessionId: session.sessionId,
    };

    const accessToken = JWTService.generateAccessToken(tokenPayload);

    // Set session cookie
    setSessionCookie(res, session.sessionId);

    // Prepare user response
    const userResponse = {
      _id: user._id,
      email: user.email,
      role: user.role,
      profile: user.profile,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      isVerified: user.isVerified, // Will be true
    };

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

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      accessToken: newAccessToken,
      token: newAccessToken,
      tokenExpiration: JWTService.getTokenExpiration(newAccessToken),
      sessionExpiration: session.expireAt,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error during token refresh',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const logoutEnhanced = async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    // Get sessionId from request body (sent from frontend) or fallback to other sources
    const sessionId = req.body.sessionId || req.sessionId || req.cookies?.session_id;
    
    let userId = null;

    // First try to get userId from JWT token in Authorization header
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace('Bearer ', '');
        // Use the imported jwt instead of require
        const decoded = jwt.decode(token);
        if (decoded && decoded.userId) {
          userId = decoded.userId;
        }
      } catch (tokenError) {
      }
    }

    // If we have sessionId and still no userId, try to find the session
    if (sessionId && !userId) {
      try {
        // Try to find session using SessionService methods
        let foundSession = null;
        
        // Method 1: Try getAllSessions and find matching sessionId
        try {
          const sessions = await SessionService.getAllSessions();
          foundSession = sessions.find(s => 
            s.sessionId === sessionId || 
            s._id.toString() === sessionId ||
            (s.sessionId && s.sessionId.toString() === sessionId)
          );
          if (foundSession) {
          }
        } catch (e) {
        }
        
        if (foundSession) {
          userId = foundSession.userId._id || foundSession.userId;
        } else {
        }
      } catch (sessionError) {
      }
    }

    // Fallback to auth middleware
    if (!userId) {
      userId = req.user?.userId || req.user?._id || req.userId;
    }

    if (userId) {
      try {
        const updateResult = await userModel.findByIdAndUpdate(
          userId,
          { 
            isVerified: false,
            lastActive: new Date()
          },
          { new: true }
        );
      } catch (updateError) {
      }
    } else {
    }

    if (sessionId) {
      try {
        const deleted = await SessionService.deleteSession(sessionId);
      } catch (sessionError) {
      }
    }

    clearSessionCookie(res);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    
    // Always clear cookie on error too
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


    return res.status(200).json({
      success: true,
      message: `Logged out from all devices. ${revokedCount} sessions revoked.`,
      revokedSessions: revokedCount,
    });
  } catch (error) {
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
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};


// Forgot Password - Send OTP with 5-minute Timer Protection
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;


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

    // Check if email exists in userModel
    const userExists = await userModel.findOne({
      email: email.toLowerCase(),
      // isVerified: true, 
    });

    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: 'This email address is not registered. Please check your email or create a new account.',
        email: email.toLowerCase(),
      });
    }

    // 🚀 NEW: Check password reset cooldown timer (5 minutes for testing)
    const COOLDOWN_MINUTES = 5; // 5 minutes cooldown for testing
    const MIN_TIME_BEFORE_NEXT_RESET_MINUTES = 1; // Must have at least 1 minute left before allowing new reset

    if (userExists.lastPasswordReset) {
      const timeSinceLastReset = Date.now() - new Date(userExists.lastPasswordReset).getTime();
      const minutesElapsed = timeSinceLastReset / (1000 * 60);
      const remainingMinutes = COOLDOWN_MINUTES - minutesElapsed;

      if (remainingMinutes > MIN_TIME_BEFORE_NEXT_RESET_MINUTES) {
        
        const remainingTime = {
          minutes: Math.floor(remainingMinutes),
          seconds: Math.floor((remainingMinutes % 1) * 60),
          totalSeconds: Math.floor(remainingMinutes * 60)
        };

        return res.status(429).json({
          success: false,
          message: `Password reset is temporarily blocked. Please wait ${remainingTime.minutes}m ${remainingTime.seconds}s before requesting another reset.`,
          cooldownInfo: {
            isActive: true,
            remainingMinutes: parseFloat(remainingMinutes.toFixed(1)),
            remainingTime,
            nextAllowedTime: new Date(Date.now() + (remainingMinutes * 60 * 1000)),
            lastResetTime: userExists.lastPasswordReset,
            testingMode: true // Indicator for frontend
          }
        });
      }
    }


    // Delete any existing verification codes for this user
    await schemaForVerify.deleteMany({ userId: userExists._id });

    // Generate new verification code
    const resetCode = generateCode();

    // Create new verification entry
    const newVerification = new schemaForVerify({
      userId: userExists._id,
      verificationCode: resetCode,
    });
    await newVerification.save();


    // Send forgot password email
    try {
      await sendVerificationEmail(
        userExists.email,
        resetCode,
        userExists.profile?.firstName || 'User'
      );


      return res.status(200).json({
        success: true,
        message: 'Password reset code sent to your email',
        email: userExists.email,
        cooldownInfo: {
          isActive: false,
          nextResetAllowedAfter: new Date(Date.now() + (COOLDOWN_MINUTES * 60 * 1000)),
          testingMode: true
        }
      });
    } catch (emailError) {

      // Delete the verification entry if email fails
      await schemaForVerify.deleteOne({ userId: userExists._id });

      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email. Please try again.',
      });
    }
  } catch (error) {
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


    return res.status(200).json({
      success: true,
      message: 'Reset code verified successfully',
      email: user.email,
    });
  } catch (error) {
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


    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // 🚀 NEW: Update user password and set lastPasswordReset timestamp
    user.password = hashedPassword;
    user.lastPasswordReset = new Date(); // Set the cooldown timer
    await user.save();

    // Delete verification entry after successful password reset
    await schemaForVerify.deleteOne({ _id: verification._id });


    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
      cooldownInfo: {
        message: 'Password reset cooldown is now active for 5 minutes (testing mode)',
        nextResetAllowedAfter: new Date(Date.now() + (5 * 60 * 1000)), // 5 minutes from now
        testingMode: true
      }
    });
  } catch (error) {
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

      if (dateOfBirthYear >= currentYear) {
        return res.status(400).json({
          success: false,
          message: 'Date of Birth cannot be from current or future years',
        });
      }
    }

    if (dateOfGraduation) {
      const dateOfGraduationYear = new Date(dateOfGraduation).getFullYear();
      const currentYear = new Date().getFullYear();
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


    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
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
  setSessionCookie, // Helper function
  clearSessionCookie, // Helper function
};
