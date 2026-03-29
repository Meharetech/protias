const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: false
    },
    liveClassId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LiveClass',
        required: false
    },
    originalAmount: {
        type: Number,
        required: [true, 'Original amount is required'],
        min: [0, 'Amount cannot be negative']
    },
    discountAmount: {
        type: Number,
        default: 0,
        min: [0, 'Discount cannot be negative']
    },
    finalAmount: {
        type: Number,
        required: [true, 'Final amount is required'],
        min: [0, 'Amount cannot be negative']
    },
    couponCode: {
        type: String,
        uppercase: true,
        trim: true
    },
    walletAmount: {
        type: Number,
        default: 0,
        min: [0, 'Wallet amount cannot be negative']
    },
    isWalletUsed: {
        type: Boolean,
        default: false
    },
    paymentProof: {
        type: String // URL to uploaded image
    },
    transactionId: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['draft', 'pending', 'approved', 'rejected', 'cancelled'],
        default: 'draft'
    },
    paymentMethod: {
        type: String,
        default: 'manual'
    },
    adminNotes: {
        type: String
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: {
        type: Date
    },
    rejectedAt: {
        type: Date
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
orderSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Set approvedAt when status changes to approved
orderSchema.pre('save', function (next) {
    if (this.isModified('status')) {
        if (this.status === 'approved' && !this.approvedAt) {
            this.approvedAt = Date.now();
        } else if (this.status === 'rejected' && !this.rejectedAt) {
            this.rejectedAt = Date.now();
        }
    }
    next();
});

// Index for faster queries
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ courseId: 1 });
orderSchema.index({ liveClassId: 1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
