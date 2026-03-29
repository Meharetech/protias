const express = require('express');
const router = express.Router();
const {
    getPushNotifications,
    getPushNotification,
    createPushNotification,
    updatePushNotification,
    deletePushNotification,
    sendPushNotificationManually
} = require('../controllers/pushNotificationController');

const { protect, authorize } = require('../middleware/auth');

// All routes require admin authentication
router.use(protect);
router.use(authorize('admin'));

router.route('/')
    .get(getPushNotifications)
    .post(createPushNotification);

router.route('/:id')
    .get(getPushNotification)
    .put(updatePushNotification)
    .delete(deletePushNotification);

router.post('/:id/send', sendPushNotificationManually);

module.exports = router;
