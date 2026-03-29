const mongoose = require('mongoose');

const purchaseLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null // Nullable for guest attempts
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
    attemptType: {
        type: String,
        enum: ['initiated', 'success', 'failed', 'cancelled'],
        required: [true, 'Attempt type is required']
    },
    couponCode: {
        type: String,
        uppercase: true,
        trim: true
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    amount: {
        type: Number,
        min: [0, 'Amount cannot be negative']
    },
    status: {
        type: String
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true // Cannot be changed
    }
});

// Make logs immutable - prevent updates and deletes
purchaseLogSchema.pre('remove', function (next) {
    next(new Error('Purchase logs cannot be deleted'));
});

purchaseLogSchema.pre('findOneAndDelete', function (next) {
    next(new Error('Purchase logs cannot be deleted'));
});

purchaseLogSchema.pre('findOneAndUpdate', function (next) {
    next(new Error('Purchase logs cannot be updated'));
});

purchaseLogSchema.pre('updateOne', function (next) {
    next(new Error('Purchase logs cannot be updated'));
});

purchaseLogSchema.pre('updateMany', function (next) {
    next(new Error('Purchase logs cannot be updated'));
});

// Index for analytics
purchaseLogSchema.index({ courseId: 1, createdAt: -1 });
purchaseLogSchema.index({ liveClassId: 1, createdAt: -1 });
purchaseLogSchema.index({ userId: 1, createdAt: -1 });
purchaseLogSchema.index({ attemptType: 1, createdAt: -1 });

const PurchaseLog = mongoose.model('PurchaseLog', purchaseLogSchema);

module.exports = PurchaseLog;
