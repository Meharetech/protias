const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to add your service account key)
// For now, we'll use a placeholder - you need to add your Firebase credentials
let firebaseInitialized = false;

const initializeFirebase = () => {
    if (firebaseInitialized) return;

    try {
        // Check if Firebase credentials are available
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });

            firebaseInitialized = true;
            console.log('✅ Firebase Admin initialized successfully');
        } else {
            console.warn('⚠️  Firebase credentials not found. Push notifications disabled.');
        }
    } catch (error) {
        console.error('❌ Firebase initialization error:', error.message);
    }
};

// Send notification to all users
const sendNotificationToAll = async (title, body, data = {}) => {
    if (!firebaseInitialized) {
        console.log('Firebase not initialized. Skipping notification.');
        return { success: false, message: 'Firebase not configured' };
    }

    try {
        const message = {
            notification: {
                title,
                body,
            },
            data: {
                ...data,
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
            },
            topic: 'all_users', // All users subscribe to this topic
        };

        const response = await admin.messaging().send(message);
        console.log('✅ Notification sent successfully:', response);

        return {
            success: true,
            message: 'Notification sent successfully',
            response,
        };
    } catch (error) {
        console.error('❌ Error sending notification:', error);
        return {
            success: false,
            message: 'Failed to send notification',
            error: error.message,
        };
    }
};

// Send notification to specific user by FCM token
const sendNotificationToUser = async (fcmToken, title, body, data = {}) => {
    if (!firebaseInitialized) {
        console.log('Firebase not initialized. Skipping notification.');
        return { success: false, message: 'Firebase not configured' };
    }

    try {
        const message = {
            notification: {
                title,
                body,
            },
            data: {
                ...data,
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
            },
            token: fcmToken,
        };

        const response = await admin.messaging().send(message);
        console.log('✅ Notification sent to user:', response);

        return {
            success: true,
            message: 'Notification sent successfully',
            response,
        };
    } catch (error) {
        console.error('❌ Error sending notification to user:', error);
        return {
            success: false,
            message: 'Failed to send notification',
            error: error.message,
        };
    }
};

// Send notification to multiple users
const sendNotificationToMultipleUsers = async (fcmTokens, title, body, data = {}) => {
    if (!firebaseInitialized) {
        console.log('Firebase not initialized. Skipping notification.');
        return { success: false, message: 'Firebase not configured' };
    }

    try {
        const message = {
            notification: {
                title,
                body,
            },
            data: {
                ...data,
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
            },
            tokens: fcmTokens,
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log('✅ Notifications sent:', response.successCount, 'success,', response.failureCount, 'failed');

        return {
            success: true,
            message: `Sent to ${response.successCount} users`,
            response,
        };
    } catch (error) {
        console.error('❌ Error sending notifications:', error);
        return {
            success: false,
            message: 'Failed to send notifications',
            error: error.message,
        };
    }
};

module.exports = {
    initializeFirebase,
    sendNotificationToAll,
    sendNotificationToUser,
    sendNotificationToMultipleUsers,
};
