const mongoose = require('mongoose');

const pushNotificationSchema = new mongoose.Schema({
    // Basic Message Details
    title: {
        type: String,
        required: [true, 'Please add a notification title'],
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    body: {
        type: String,
        required: [true, 'Please add notification body'],
        maxlength: [500, 'Body cannot be more than 500 characters']
    },
    messageType: {
        type: String,
        enum: ['info', 'warning', 'alert', 'promotion'],
        default: 'info'
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high'],
        default: 'normal'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'sent', 'scheduled', 'expired'],
        default: 'active'
    },

    // Target Audience
    sendTo: {
        type: String,
        enum: ['all', 'selected', 'group'],
        default: 'all'
    },
    userGroups: [{
        type: String,
        enum: ['free', 'paid', 'admin', 'premium']
    }],
    userIds: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    }],
    deviceTypes: [{
        type: String,
        enum: ['android', 'ios', 'web']
    }],
    minAppVersion: {
        type: String,
        trim: true
    },

    // Delivery Method
    deliveryType: {
        type: String,
        enum: ['push', 'in-app', 'both'],
        default: 'push'
    },
    notificationChannel: {
        type: String,
        enum: ['general', 'alerts', 'live_class', 'courses'],
        default: 'general'
    },
    headsUpNotification: {
        type: Boolean,
        default: true
    },
    sound: {
        type: String,
        enum: ['default', 'silent'],
        default: 'default'
    },

    // Schedule & Timing
    sendNow: {
        type: Boolean,
        default: true
    },
    scheduleDate: {
        type: Date
    },
    expiryDate: {
        type: Date
    },

    // Additional Data
    imageUrl: {
        type: String,
        trim: true
    },
    actionUrl: {
        type: String,
        trim: true
    },
    customData: {
        type: Map,
        of: String
    },

    // Tracking
    sentCount: {
        type: Number,
        default: 0
    },
    deliveredCount: {
        type: Number,
        default: 0
    },
    clickedCount: {
        type: Number,
        default: 0
    },
    sentAt: {
        type: Date
    },

    // Metadata
    createdBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
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
pushNotificationSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('PushNotification', pushNotificationSchema);
