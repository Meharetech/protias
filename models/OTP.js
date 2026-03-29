const mongoose = require('mongoose');
const crypto = require('crypto');

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    otp: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['registration', 'password-reset'],
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + parseInt(process.env.OTP_EXPIRY_TIME || 600000))
    },
    verified: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for automatic deletion of expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for faster queries
otpSchema.index({ email: 1, type: 1 });

// Generate OTP
otpSchema.statics.generateOTP = function () {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Hash OTP before saving
otpSchema.pre('save', function (next) {
    if (!this.isModified('otp')) {
        return next();
    }

    // Hash the OTP using crypto
    const hash = crypto.createHmac('sha256', process.env.OTP_SECRET || 'OtpSecretKey')
        .update(this.otp)
        .digest('hex');

    this.otp = hash;
    next();
});

// Method to verify OTP
otpSchema.methods.verifyOTP = function (candidateOTP) {
    const hash = crypto.createHmac('sha256', process.env.OTP_SECRET || 'OtpSecretKey')
        .update(candidateOTP)
        .digest('hex');

    return this.otp === hash;
};

const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP;
