const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        default: 0,
        min: 0
    },
    totalEarned: {
        type: Number,
        default: 0
    },
    totalWithdrawn: {
        type: Number,
        default: 0
    },
    transactions: [{
        amount: {
            type: Number,
            required: true
        },
        type: {
            type: String,
            enum: ['credit', 'debit'],
            required: true
        },
        category: {
            type: String,
            enum: ['signup_bonus', 'referral_signup', 'referral_purchase', 'purchase', 'withdrawal', 'admin_adjustment'],
            required: true
        },
        description: String,
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed'],
            default: 'completed'
        },
        referenceId: mongoose.Schema.Types.ObjectId, // Order ID or Referral ID
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Ensure balance doesn't go negative on save
walletSchema.pre('save', function(next) {
    if (this.balance < 0) {
        return next(new Error('Insufficient wallet balance'));
    }
    this.updatedAt = Date.now();
    next();
});

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet;
