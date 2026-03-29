const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Coupon code is required'],
        unique: true,
        uppercase: true,
        trim: true,
        minlength: [3, 'Coupon code must be at least 3 characters']
    },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed'],
        required: [true, 'Discount type is required']
    },
    discountValue: {
        type: Number,
        required: [true, 'Discount value is required'],
        min: [0, 'Discount value cannot be negative']
    },
    applicableCourses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course'
    }],
    expiryDate: {
        type: Date,
        required: [true, 'Expiry date is required']
    },
    usageLimit: {
        type: Number,
        default: null // null means unlimited
    },
    usedCount: {
        type: Number,
        default: 0,
        min: [0, 'Used count cannot be negative']
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Creator ID is required']
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

// Update timestamp before saving
couponSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Validate percentage discount
couponSchema.pre('save', function (next) {
    if (this.discountType === 'percentage' && this.discountValue > 100) {
        next(new Error('Percentage discount cannot exceed 100%'));
    }
    next();
});

// Method to check if coupon is valid
couponSchema.methods.isValid = function () {
    // Check if active
    if (this.status !== 'active') {
        return { valid: false, message: 'Coupon is inactive' };
    }

    // Check if expired
    if (new Date() > this.expiryDate) {
        return { valid: false, message: 'Coupon has expired' };
    }

    // Check usage limit
    if (this.usageLimit && this.usedCount >= this.usageLimit) {
        return { valid: false, message: 'Coupon usage limit reached' };
    }

    return { valid: true, message: 'Coupon is valid' };
};

// Method to check if coupon is applicable to a course
couponSchema.methods.isApplicableToCourse = function (courseId) {
    // If no courses specified, applicable to all
    if (!this.applicableCourses || this.applicableCourses.length === 0) {
        return true;
    }

    // Check if course is in the list
    return this.applicableCourses.some(id => id.toString() === courseId.toString());
};

// Method to calculate discount
couponSchema.methods.calculateDiscount = function (amount) {
    if (this.discountType === 'percentage') {
        return Math.round((amount * this.discountValue) / 100);
    } else {
        return Math.min(this.discountValue, amount);
    }
};

// Index for faster queries
couponSchema.index({ status: 1, expiryDate: 1 });

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
