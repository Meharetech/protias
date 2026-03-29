const Wallet = require('../models/Wallet');
const ReferralReward = require('../models/ReferralReward');
const User = require('../models/User');

// @desc    Get user wallet balance and transactions
// @route   GET /api/wallet
// @access  Private
exports.getWallet = async (req, res) => {
    try {
        let wallet = await Wallet.findOne({ userId: req.user._id });
        
        if (!wallet) {
            wallet = await Wallet.create({ userId: req.user._id });
        }

        res.status(200).json({
            success: true,
            data: wallet
        });
    } catch (error) {
        console.error('Get wallet error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch wallet info'
        });
    }
};

// @desc    Get referral statistics and list of referred users
// @route   GET /api/wallet/referrals
// @access  Private
exports.getReferralStats = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId).select('referralCode');

        const referrals = await ReferralReward.find({ referrerId: userId })
            .populate('referredId', 'fullName email createdAt')
            .sort({ createdAt: -1 });

        const totalReferrals = referrals.length;
        const successfulPurchases = referrals.filter(r => r.purchaseRewardGiven).length;
        
        res.status(200).json({
            success: true,
            data: {
                referralCode: user.referralCode,
                totalReferrals,
                successfulPurchases,
                referralList: referrals
            }
        });
    } catch (error) {
        console.error('Get referral stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch referral statistics'
        });
    }
};
