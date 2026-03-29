const User = require('../models/User');
const OTP = require('../models/OTP');
const Wallet = require('../models/Wallet');
const ReferralReward = require('../models/ReferralReward');
const walletService = require('../services/walletService');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { sendRegistrationOTP, sendPasswordResetOTP, sendWelcomeEmail } = require('../services/emailService');

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

// @desc    Send OTP for registration
// @route   POST /api/auth/send-registration-otp
// @access  Public
exports.sendRegistrationOTP = async (req, res) => {
    try {
        const { fullName, email, phone, password, confirmPassword } = req.body;

        // Validation
        if (!fullName || !email || !phone || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        // Password strength validation
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }

        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain uppercase, lowercase, and number'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Check if phone number already exists
        const existingPhone = await User.findOne({ phone });
        if (existingPhone) {
            return res.status(400).json({
                success: false,
                message: 'User with this phone number already exists'
            });
        }

        // Delete any existing OTPs for this email and type
        await OTP.deleteMany({ email, type: 'registration' });

        // Generate OTP
        const otp = OTP.generateOTP();

        // Save OTP to database
        await OTP.create({
            email,
            otp,
            type: 'registration'
        });

        // Send OTP email
        await sendRegistrationOTP(email, otp, fullName);

        res.status(200).json({
            success: true,
            message: 'OTP sent successfully to your email',
            data: {
                email,
                expiresIn: '10 minutes'
            }
        });
    } catch (error) {
        console.error('Send registration OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP. Please try again.'
        });
    }
};

// @desc    Verify OTP and register user
// @route   POST /api/auth/verify-registration-otp
// @access  Public
exports.verifyRegistrationOTP = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { fullName, email, phone, password, otp, referralCode } = req.body;

        // Validation
        if (!fullName || !email || !phone || !password || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        let responseData = null;

        await session.withTransaction(async () => {
            // Find OTP record
            const otpRecord = await OTP.findOne({
                email,
                type: 'registration',
                verified: false
            }).sort({ createdAt: -1 }).session(session);

            if (!otpRecord) {
                throw new Error('NOT_FOUND_OTP');
            }

            // Check if OTP is expired
            if (otpRecord.expiresAt < new Date()) {
                await OTP.deleteOne({ _id: otpRecord._id }).session(session);
                throw new Error('EXPIRED_OTP');
            }

            // Verify OTP
            const isOTPValid = otpRecord.verifyOTP(otp);
            if (!isOTPValid) {
                throw new Error('INVALID_OTP');
            }

            // Mark OTP as verified
            otpRecord.verified = true;
            await otpRecord.save({ session });

            // Referral Handling
            let referredBy = null;
            let referrer = null;
            if (referralCode) {
                referrer = await User.findOne({ 
                    referralCode: referralCode.trim().toUpperCase() 
                }).session(session);
                
                if (referrer) {
                    referredBy = referrer._id;
                }
            }

            // Create user
            const users = await User.create([{
                fullName,
                email,
                phone,
                password,
                referredBy
            }], { session });

            const newUser = users[0];

            // Registration Bonuses
            // 1. Give New User Sign-up Bonus (100 Rs)
            await walletService.addTransaction({
                userId: newUser._id,
                amount: 100,
                type: 'credit',
                category: 'signup_bonus',
                description: 'Welcome bonus for signing up',
                session
            });

            // 2. Give Referrer Bonus (100 Rs) if referred
            if (referrer) {
                await walletService.addTransaction({
                    userId: referrer._id,
                    amount: 100,
                    type: 'credit',
                    category: 'referral_signup',
                    description: `Referral bonus for inviting ${fullName}`,
                    referenceId: newUser._id,
                    session
                });

                // Track referral reward
                await ReferralReward.create([{
                    referrerId: referrer._id,
                    referredId: newUser._id,
                    signupRewardGiven: true,
                    signupRewardAmount: 100
                }], { session });
            } else {
                // Just initialize wallet for pure new user
                await walletService.getWallet(newUser._id, session);
            }

            // Generate token (outside transaction ideally, but we need ID)
            const token = generateToken(newUser._id);
            
            responseData = {
                success: true,
                message: 'Registration successful',
                data: {
                    user: {
                        id: newUser._id,
                        fullName: newUser.fullName,
                        email: newUser.email,
                        phone: newUser.phone,
                        role: newUser.role,
                        referralCode: newUser.referralCode
                    },
                    token
                }
            };
            
            // Cleanup cleanup OTP AFTER successful commit ideally, but inside transaction is also fine
            await OTP.deleteOne({ _id: otpRecord._id }).session(session);
        });

        // If we got here, transaction committed successfully
        // Send welcome email (non-blocking)
        sendWelcomeEmail(email, fullName).catch(err =>
            console.error('Welcome email error:', err)
        );

        return res.status(201).json(responseData);

    } catch (error) {
        console.error('Verify registration OTP error:', error);

        // Handle custom errors thrown inside withTransaction
        if (error.message === 'NOT_FOUND_OTP') {
            return res.status(400).json({ success: false, message: 'OTP expired or invalid. Please request a new one.' });
        }
        if (error.message === 'EXPIRED_OTP') {
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
        }
        if (error.message === 'INVALID_OTP') {
            return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
        }

        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: messages[0] || 'Validation error'
            });
        }

        // Duplicate error (likely email or referral code)
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Email or Phone number already registered'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    } finally {
        session.endSession();
    }
};

// @desc    Register a new user (Legacy - without OTP)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { fullName, email, phone, password, confirmPassword } = req.body;

        // Validation
        if (!fullName || !email || !phone || !password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        // Password strength validation
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }

        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain uppercase, lowercase, and number'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Check if phone number already exists
        const existingPhone = await User.findOne({ phone });
        if (existingPhone) {
            return res.status(400).json({
                success: false,
                message: 'User with this phone number already exists'
            });
        }

        // Create user
        const user = await User.create({
            fullName,
            email,
            phone,
            password
        });

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    phone: user.phone,
                    role: user.role
                },
                token
            }
        });
    } catch (error) {
        console.error('Registration error:', error);

        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: messages[0] || 'Validation error'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error during registration'
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Check if user exists (include password for comparison)
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Your account has been deactivated. Please contact support.'
            });
        }

        // Check password
        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update last login
        user.lastLogin = Date.now();
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    lastLogin: user.lastLogin
                },
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login'
        });
    }
};

// @desc    Send OTP for password reset
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Validation
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide your email address'
            });
        }

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if user exists or not for security
            return res.status(200).json({
                success: true,
                message: 'If an account exists with this email, you will receive a password reset OTP.'
            });
        }

        // Delete any existing password reset OTPs for this email
        await OTP.deleteMany({ email, type: 'password-reset' });

        // Generate OTP
        const otp = OTP.generateOTP();

        // Save OTP to database
        await OTP.create({
            email,
            otp,
            type: 'password-reset'
        });

        // Send OTP email
        await sendPasswordResetOTP(email, otp, user.fullName);

        res.status(200).json({
            success: true,
            message: 'Password reset OTP sent to your email',
            data: {
                email,
                expiresIn: '10 minutes'
            }
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send password reset OTP. Please try again.'
        });
    }
};

// @desc    Verify OTP for password reset
// @route   POST /api/auth/verify-reset-otp
// @access  Public
exports.verifyResetOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Validation
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and OTP'
            });
        }

        // Find OTP record
        const otpRecord = await OTP.findOne({
            email,
            type: 'password-reset',
            verified: false
        }).sort({ createdAt: -1 });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: 'OTP expired or invalid. Please request a new one.'
            });
        }

        // Check if OTP is expired
        if (otpRecord.expiresAt < new Date()) {
            await OTP.deleteOne({ _id: otpRecord._id });
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }

        // Verify OTP
        const isOTPValid = otpRecord.verifyOTP(otp);
        if (!isOTPValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP. Please try again.'
            });
        }

        // Mark OTP as verified (but don't delete yet - needed for password reset)
        otpRecord.verified = true;
        await otpRecord.save();

        res.status(200).json({
            success: true,
            message: 'OTP verified successfully. You can now reset your password.',
            data: {
                email
            }
        });
    } catch (error) {
        console.error('Verify reset OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during OTP verification'
        });
    }
};

// @desc    Reset password after OTP verification
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword, confirmPassword } = req.body;

        // Validation
        if (!email || !otp || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Check if passwords match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        // Password strength validation
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }

        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain uppercase, lowercase, and number'
            });
        }

        // Find verified OTP record
        const otpRecord = await OTP.findOne({
            email,
            type: 'password-reset',
            verified: true
        }).sort({ createdAt: -1 });

        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: 'Please verify OTP first'
            });
        }

        // Verify OTP again for security
        const isOTPValid = otpRecord.verifyOTP(otp);
        if (!isOTPValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        // Delete the OTP record
        await OTP.deleteOne({ _id: otpRecord._id });

        res.status(200).json({
            success: true,
            message: 'Password reset successful. You can now login with your new password.'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during password reset'
        });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                profilePic: user.profilePic,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update profile picture
// @route   PUT /api/auth/profile-pic
// @access  Private
exports.updateProfilePic = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload an image'
            });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Delete old profile pic if exists
        if (user.profilePic && !user.profilePic.startsWith('http')) {
            const oldPath = path.join(__dirname, '..', user.profilePic);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        // Save new path
        user.profilePic = req.file.path.replace(/\\/g, '/');
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Profile picture updated successfully',
            data: {
                profilePic: user.profilePic
            }
        });
    } catch (error) {
        console.error('Update profile pic error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile picture',
            error: error.message
        });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
    try {
        const { name, phone } = req.body;

        // Find user
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update fields
        if (name) user.fullName = name;
        if (phone) user.phone = phone;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                _id: user._id,
                name: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
};

// @desc    Update device info (FCM token, device type, etc)
// @route   PUT /api/auth/device-info
// @access  Private
exports.updateDeviceInfo = async (req, res) => {
    try {
        const { fcmToken, deviceType, appVersion } = req.body;

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (fcmToken) user.fcmToken = fcmToken;
        if (deviceType) user.deviceType = deviceType;
        if (appVersion) user.appVersion = appVersion;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Device info updated successfully'
        });
    } catch (error) {
        console.error('Update device info error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update device info'
        });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
    try {
        // In a JWT-based system, logout is typically handled on the client side
        // by removing the token. However, you can implement token blacklisting here if needed.

        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during logout'
        });
    }
};
