const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        minlength: [3, 'Name must be at least 3 characters long']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        match: [/^[6-9]\d{9}$/, 'Please enter a valid Indian phone number']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
        select: false // Don't include password in queries by default
    },
    role: {
        type: String,
        enum: ['student', 'admin', 'user'],
        default: 'student'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    fcmToken: {
        type: String,
        trim: true
    },
    deviceType: {
        type: String,
        enum: ['android', 'ios', 'web', 'unknown'],
        default: 'unknown'
    },
    appVersion: {
        type: String,
        trim: true
    },
    userGroup: {
        type: String,
        enum: ['free', 'paid', 'premium', 'admin'],
        default: 'free'
    },
    lastLogin: {
        type: Date
    },
    referralCode: {
        type: String,
        unique: true,
        uppercase: true,
        trim: true
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    profilePic: {
        type: String,
        trim: true,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware to generate a unique referral code before saving if not already present
userSchema.pre('save', async function (next) {
    if (this.isNew && !this.referralCode) {
        // Simple generation: first 4 chars of name + 4 random digits
        const cleanName = this.fullName.replace(/\s+/g, '').substring(0, 4).toUpperCase();
        let code;
        let isUnique = false;
        
        while (!isUnique) {
            code = `${cleanName}${Math.floor(1000 + Math.random() * 9000)}`;
            const existingUser = await mongoose.models.User.findOne({ referralCode: code }).session(this.$session());
            if (!existingUser) {
                isUnique = true;
            }
        }
        this.referralCode = code;
    }
    next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Update the updatedAt timestamp before saving
userSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Password comparison failed');
    }
};

// Method to get user without sensitive data
userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
