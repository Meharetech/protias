const express = require('express');
const router = express.Router();
const {
    getSettings,
    updateSettings,
    uploadLogo,
    uploadFavicon,
    resetSettings
} = require('../controllers/siteSettingsController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', getSettings);

// Admin routes
router.put('/', protect, authorize('admin'), updateSettings);
router.post('/upload-logo', protect, authorize('admin'), uploadLogo);
router.post('/upload-favicon', protect, authorize('admin'), uploadFavicon);
router.post('/reset', protect, authorize('admin'), resetSettings);

module.exports = router;
