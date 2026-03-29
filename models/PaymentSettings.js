const mongoose = require('mongoose');

const paymentSettingsSchema = new mongoose.Schema({
    upiId: {
        type: String,
        required: [true, 'UPI ID is required'],
        trim: true
    },
    qrCodeImage: {
        type: String, // Base64 encoded image
        default: ''
    },
    bankName: {
        type: String,
        trim: true
    },
    accountNumber: {
        type: String,
        trim: true
    },
    ifscCode: {
        type: String,
        trim: true
    },
    accountHolderName: {
        type: String,
        trim: true
    },
    paymentEnabled: {
        type: Boolean,
        default: true
    },
    instructions: {
        type: String,
        default: 'Please make the payment and upload the screenshot for verification.'
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

// Update timestamp on save
paymentSettingsSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Ensure only one settings document exists
paymentSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        // Create default settings if none exist
        settings = await this.create({
            upiId: 'example@upi',
            qrCodeImage: '',
            paymentEnabled: false,
            instructions: 'Please make the payment and upload the screenshot for verification.'
        });
    }
    return settings;
};

module.exports = mongoose.model('PaymentSettings', paymentSettingsSchema);
