const mongoose = require('mongoose');

const couponUsageSchema = new mongoose.Schema({
    couponId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
        required: [true, 'Coupon ID is required']
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: [true, 'Course ID is required']
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: [true, 'Order ID is required']
    },
    discountAmount: {
        type: Number,
        required: [true, 'Discount amount is required'],
        min: [0, 'Discount cannot be negative']
    },
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true
    }
});

// Index for analytics and queries
couponUsageSchema.index({ couponId: 1, createdAt: -1 });
couponUsageSchema.index({ userId: 1, createdAt: -1 });
couponUsageSchema.index({ courseId: 1, createdAt: -1 });
couponUsageSchema.index({ orderId: 1 });

// Compound index for checking if user already used coupon for a course
couponUsageSchema.index({ userId: 1, couponId: 1, courseId: 1 });

const CouponUsage = mongoose.model('CouponUsage', couponUsageSchema);

module.exports = CouponUsage;
