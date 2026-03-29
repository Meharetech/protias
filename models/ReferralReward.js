const mongoose = require('mongoose');

const referralRewardSchema = new mongoose.Schema({
    referrerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    referredId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true // A user can only be referred once
    },
    signupRewardGiven: {
        type: Boolean,
        default: false
    },
    purchaseRewardGiven: {
        type: Boolean,
        default: false
    },
    signupRewardAmount: {
        type: Number,
        default: 100
    },
    purchaseRewardAmount: {
        type: Number,
        default: 200
    },
    firstPurchaseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const ReferralReward = mongoose.model('ReferralReward', referralRewardSchema);
module.exports = ReferralReward;
