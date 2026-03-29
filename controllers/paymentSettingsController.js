const PaymentSettings = require('../models/PaymentSettings');

// @desc    Get payment settings
// @route   GET /api/payment-settings
// @access  Public
exports.getPaymentSettings = async (req, res) => {
    try {
        const settings = await PaymentSettings.getSettings();

        res.status(200).json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Error fetching payment settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment settings',
            error: error.message
        });
    }
};

// @desc    Update payment settings
// @route   PUT /api/payment-settings
// @access  Private/Admin
exports.updatePaymentSettings = async (req, res) => {
    try {
        const {
            upiId,
            qrCodeImage,
            bankName,
            accountNumber,
            ifscCode,
            accountHolderName,
            paymentEnabled,
            instructions
        } = req.body;

        let settings = await PaymentSettings.findOne();

        if (!settings) {
            // Create new settings
            settings = await PaymentSettings.create(req.body);
        } else {
            // Update existing settings
            if (upiId !== undefined) settings.upiId = upiId;
            if (qrCodeImage !== undefined) settings.qrCodeImage = qrCodeImage;
            if (bankName !== undefined) settings.bankName = bankName;
            if (accountNumber !== undefined) settings.accountNumber = accountNumber;
            if (ifscCode !== undefined) settings.ifscCode = ifscCode;
            if (accountHolderName !== undefined) settings.accountHolderName = accountHolderName;
            if (paymentEnabled !== undefined) settings.paymentEnabled = paymentEnabled;
            if (instructions !== undefined) settings.instructions = instructions;

            settings.updatedAt = Date.now();
            await settings.save();
        }

        res.status(200).json({
            success: true,
            message: 'Payment settings updated successfully',
            data: settings
        });
    } catch (error) {
        console.error('Error updating payment settings:', error);
        res.status(400).json({
            success: false,
            message: 'Failed to update payment settings',
            error: error.message
        });
    }
};

// @desc    Toggle payment system
// @route   PATCH /api/payment-settings/toggle
// @access  Private/Admin
exports.togglePaymentSystem = async (req, res) => {
    try {
        const settings = await PaymentSettings.getSettings();

        settings.paymentEnabled = !settings.paymentEnabled;
        settings.updatedAt = Date.now();
        await settings.save();

        res.status(200).json({
            success: true,
            message: `Payment system ${settings.paymentEnabled ? 'enabled' : 'disabled'} successfully`,
            data: settings
        });
    } catch (error) {
        console.error('Error toggling payment system:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle payment system',
            error: error.message
        });
    }
};
