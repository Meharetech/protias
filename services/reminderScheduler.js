const LiveClass = require('../models/LiveClass');
const User = require('../models/User');
const { sendNotificationToUser } = require('./notificationService');

/**
 * Sends notifications to users who have set reminders for a live class.
 *
 * @param {Object} liveClass - The LiveClass document
 * @param {string} stage     - '30min' or '10min'
 * @param {string} title     - Notification title
 * @param {string} body      - Notification body
 */
const sendStageNotifications = async (liveClass, stage, title, body) => {
    const notifiedField = stage === '30min' ? 'notifiedAt30min' : 'notifiedAt10min';

    // Convert already-notified IDs to strings for reliable comparison
    const alreadyNotified = liveClass[notifiedField].map(id => id.toString());

    // Find users who haven't received this stage's notification yet
    const pendingIds = liveClass.reminders
        .map(id => id.toString())
        .filter(id => !alreadyNotified.includes(id));

    if (pendingIds.length === 0) {
        console.log(`[Scheduler][${stage}] All users already notified for "${liveClass.title}". Skipping.`);
        return;
    }

    // Fetch their FCM tokens
    const users = await User.find({
        _id: { $in: pendingIds },
        fcmToken: { $exists: true, $ne: null, $ne: '' }
    });

    if (users.length === 0) {
        console.log(`[Scheduler][${stage}] No users with FCM tokens for "${liveClass.title}".`);
        return;
    }

    console.log(`[Scheduler][${stage}] Sending to ${users.length} users for "${liveClass.title}".`);

    for (const user of users) {
        const result = await sendNotificationToUser(
            user.fcmToken,
            title,
            body,
            {
                type: 'live_class_reminder',
                stage,
                liveClassId: liveClass._id.toString(),
                screen: '/upcoming-live'
            }
        );

        if (result.success) {
            liveClass[notifiedField].push(user._id);
            console.log(`[Scheduler][${stage}] ✅ Notified ${user.email || user._id}`);
        } else {
            console.error(`[Scheduler][${stage}] ❌ Failed for ${user._id}: ${result.message}`);
        }
    }

    // Persist the updated tracking list
    await liveClass.save();
};

/**
 * Main scheduler function — runs every minute.
 * 
 * Notification schedule:
 *   Stage 1 — Sent when class is 25–35 minutes away (≈ 30-min reminder)
 *   Stage 2 — Sent when class is 5–15 minutes away  (≈ 10-min reminder)
 */
const checkAndSendReminders = async () => {
    try {
        const now = new Date();

        // --- Stage 1: 30-minute reminder window (25 to 35 mins before class) ---
        const stage1Min = new Date(now.getTime() + 25 * 60000); // 25 mins from now
        const stage1Max = new Date(now.getTime() + 35 * 60000); // 35 mins from now

        const stage1Classes = await LiveClass.find({
            status: 'scheduled',
            scheduledTime: { $gt: stage1Min, $lte: stage1Max },
            reminders: { $exists: true, $not: { $size: 0 } }
        });

        for (const liveClass of stage1Classes) {
            await sendStageNotifications(
                liveClass,
                '30min',
                '⏰ Class in 30 Minutes!',
                `"${liveClass.title}" by ${liveClass.tutorName} starts in about 30 minutes. Get ready!`
            );
        }

        // --- Stage 2: 10-minute reminder window (5 to 15 mins before class) ---
        const stage2Min = new Date(now.getTime() + 5 * 60000);  // 5 mins from now
        const stage2Max = new Date(now.getTime() + 15 * 60000); // 15 mins from now

        const stage2Classes = await LiveClass.find({
            status: 'scheduled',
            scheduledTime: { $gt: stage2Min, $lte: stage2Max },
            reminders: { $exists: true, $not: { $size: 0 } }
        });

        for (const liveClass of stage2Classes) {
            await sendStageNotifications(
                liveClass,
                '10min',
                '🔴 Starting in 10 Minutes!',
                `"${liveClass.title}" by ${liveClass.tutorName} is starting very soon. Tap to join now!`
            );
        }

    } catch (error) {
        console.error('[Scheduler] Error in checkAndSendReminders:', error);
    }
};

/**
 * Starts the reminder scheduler.
 * @param {number} intervalMs - Check frequency (default: every 60 seconds)
 */
const startReminderScheduler = (intervalMs = 60000) => {
    console.log('⏰ Live Class Reminder Scheduler started (2-stage: 30min + 10min)');

    // Run immediately on server start
    checkAndSendReminders();

    // Then run every minute
    setInterval(checkAndSendReminders, intervalMs);
};

module.exports = { startReminderScheduler };
