const express = require('express');
const router = express.Router();
const {
    getNotices,
    getNotice,
    createNotice,
    updateNotice,
    deleteNotice
} = require('../controllers/noticeController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

// Public/User routes (optionalAuth to allow admin to see inactive ones)
router.get('/', optionalAuth, getNotices);
router.get('/:id', optionalAuth, getNotice);

// Admin routes
router.post('/', protect, authorize('admin'), createNotice);
router.put('/:id', protect, authorize('admin'), updateNotice);
router.delete('/:id', protect, authorize('admin'), deleteNotice);

module.exports = router;
