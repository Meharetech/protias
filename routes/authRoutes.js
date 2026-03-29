const express = require('express');
const router = express.Router();
const {
    register,
    login,
    getMe,
    logout,
    updateProfile,
    sendRegistrationOTP,
    verifyRegistrationOTP,
    forgotPassword,
    verifyResetOTP,
    resetPassword,
    updateDeviceInfo
} = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

// Public routes - Registration with OTP
router.post('/send-registration-otp', sendRegistrationOTP);
router.post('/verify-registration-otp', verifyRegistrationOTP);

// Public routes - Legacy registration (without OTP)
router.post('/register', register);

// Public routes - Login
router.post('/login', login);

// Public routes - Password Reset with OTP
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOTP);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/device-info', protect, updateDeviceInfo);
router.post('/logout', protect, logout);

module.exports = router;
