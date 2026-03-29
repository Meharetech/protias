const PushNotification = require('../models/PushNotification');
const User = require('../models/User');
const { sendNotificationToAll, sendNotificationToMultipleUsers } = require('../services/notificationService');

// @desc    Get all push notifications
// @route   GET /api/push-notifications
// @access  Private/Admin
exports.getPushNotifications = async (req, res) => {
    try {
        const { status, messageType, sendTo } = req.query;
        let query = {};

        if (status) query.status = status;
        if (messageType) query.messageType = messageType;
        if (sendTo) query.sendTo = sendTo;

        const notifications = await PushNotification.find(query)
            .sort({ createdAt: -1 })
            .populate('createdBy', 'fullName email');

        res.status(200).json({
            success: true,
            count: notifications.length,
            data: notifications
        });
    } catch (error) {
        console.error('Error fetching push notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch push notifications',
            error: error.message
        });
    }
};

// @desc    Get single push notification
// @route   GET /api/push-notifications/:id
// @access  Private/Admin
exports.getPushNotification = async (req, res) => {
    try {
        const notification = await PushNotification.findById(req.params.id)
            .populate('createdBy', 'fullName email')
            .populate('userIds', 'fullName email');

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Push notification not found'
            });
        }

        res.status(200).json({
            success: true,
            data: notification
        });
    } catch (error) {
        console.error('Error fetching push notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch push notification',
            error: error.message
        });
    }
};

// @desc    Create and send push notification
// @route   POST /api/push-notifications
// @access  Private/Admin
exports.createPushNotification = async (req, res) => {
    try {
        req.body.createdBy = req.user.id;

        // Create notification record
        const notification = await PushNotification.create(req.body);

        // Send notification if sendNow is true and status is active
        if (notification.sendNow && notification.status === 'active') {
            await sendPushNotification(notification);
        } else if (notification.scheduleDate && !notification.sendNow) {
            // Schedule for later (you can implement a job queue like Bull or Agenda)
            notification.status = 'scheduled';
            await notification.save();
        }

        res.status(201).json({
            success: true,
            message: 'Push notification created successfully',
            data: notification
        });
    } catch (error) {
        console.error('Error creating push notification:', error);
        res.status(400).json({
            success: false,
            message: 'Failed to create push notification',
            error: error.message
        });
    }
};

// @desc    Update push notification
// @route   PUT /api/push-notifications/:id
// @access  Private/Admin
exports.updatePushNotification = async (req, res) => {
    try {
        let notification = await PushNotification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Push notification not found'
            });
        }

        // Don't allow updating sent notifications
        if (notification.status === 'sent') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update sent notifications'
            });
        }

        notification = await PushNotification.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Push notification updated successfully',
            data: notification
        });
    } catch (error) {
        console.error('Error updating push notification:', error);
        res.status(400).json({
            success: false,
            message: 'Failed to update push notification',
            error: error.message
        });
    }
};

// @desc    Delete push notification
// @route   DELETE /api/push-notifications/:id
// @access  Private/Admin
exports.deletePushNotification = async (req, res) => {
    try {
        const notification = await PushNotification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Push notification not found'
            });
        }

        await notification.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Push notification deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting push notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete push notification',
            error: error.message
        });
    }
};

// @desc    Send push notification manually
// @route   POST /api/push-notifications/:id/send
// @access  Private/Admin
exports.sendPushNotificationManually = async (req, res) => {
    try {
        const notification = await PushNotification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Push notification not found'
            });
        }

        if (notification.status === 'sent') {
            return res.status(400).json({
                success: false,
                message: 'Notification already sent'
            });
        }

        await sendPushNotification(notification);

        res.status(200).json({
            success: true,
            message: 'Push notification sent successfully',
            data: notification
        });
    } catch (error) {
        console.error('Error sending push notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send push notification',
            error: error.message
        });
    }
};

// Helper function to send push notification
async function sendPushNotification(notification) {
    try {
        let targetUsers = [];

        // Determine target users based on sendTo setting
        if (notification.sendTo === 'all') {
            // Send to all users via topic
            await sendNotificationToAll(
                notification.title,
                notification.body,
                {
                    messageType: notification.messageType,
                    priority: notification.priority,
                    notificationId: notification._id.toString(),
                    actionUrl: notification.actionUrl || '',
                    imageUrl: notification.imageUrl || '',
                }
            );

            // Get total user count for tracking
            const userCount = await User.countDocuments({ role: { $ne: 'admin' } });
            notification.sentCount = userCount;
        } else if (notification.sendTo === 'group') {
            // Find users by group criteria
            const query = {};

            // This is a simplified example - you'd need to add user group fields to User model
            if (notification.userGroups && notification.userGroups.length > 0) {
                // Example: query.userType = { $in: notification.userGroups };
            }

            targetUsers = await User.find(query).select('fcmToken');

            const fcmTokens = targetUsers
                .map(user => user.fcmToken)
                .filter(token => token); // Remove null/undefined tokens

            if (fcmTokens.length > 0) {
                await sendNotificationToMultipleUsers(
                    fcmTokens,
                    notification.title,
                    notification.body,
                    {
                        messageType: notification.messageType,
                        priority: notification.priority,
                        notificationId: notification._id.toString(),
                        actionUrl: notification.actionUrl || '',
                        imageUrl: notification.imageUrl || '',
                    }
                );
            }

            notification.sentCount = fcmTokens.length;
        } else if (notification.sendTo === 'selected' && notification.userIds.length > 0) {
            // Send to specific users
            targetUsers = await User.find({ _id: { $in: notification.userIds } }).select('fcmToken');

            const fcmTokens = targetUsers
                .map(user => user.fcmToken)
                .filter(token => token);

            if (fcmTokens.length > 0) {
                await sendNotificationToMultipleUsers(
                    fcmTokens,
                    notification.title,
                    notification.body,
                    {
                        messageType: notification.messageType,
                        priority: notification.priority,
                        notificationId: notification._id.toString(),
                        actionUrl: notification.actionUrl || '',
                        imageUrl: notification.imageUrl || '',
                    }
                );
            }

            notification.sentCount = fcmTokens.length;
        }

        // Update notification status
        notification.status = 'sent';
        notification.sentAt = new Date();
        await notification.save();

        console.log(`✅ Push notification sent: ${notification.title} (${notification.sentCount} users)`);
    } catch (error) {
        console.error('❌ Error sending push notification:', error);
        throw error;
    }
}

module.exports = {
    getPushNotifications: exports.getPushNotifications,
    getPushNotification: exports.getPushNotification,
    createPushNotification: exports.createPushNotification,
    updatePushNotification: exports.updatePushNotification,
    deletePushNotification: exports.deletePushNotification,
    sendPushNotificationManually: exports.sendPushNotificationManually,
};
