const express = require('express');
const router = express.Router();
const {
    getAllLogs,
    getLogsByUser,
    getLogsByCourse,
    getAnalytics,
    getRecentLogs
} = require('../controllers/purchaseLogController');
const { protect, authorize } = require('../middleware/auth');

// All routes are admin-only
router.get('/', protect, authorize('admin'), getAllLogs);
router.get('/analytics', protect, authorize('admin'), getAnalytics);
router.get('/recent', protect, authorize('admin'), getRecentLogs);
router.get('/user/:userId', protect, authorize('admin'), getLogsByUser);
router.get('/course/:courseId', protect, authorize('admin'), getLogsByCourse);

module.exports = router;
