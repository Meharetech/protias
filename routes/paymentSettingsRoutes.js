const express = require('express');
const router = express.Router();
const {
    getPaymentSettings,
    updatePaymentSettings,
    togglePaymentSystem
} = require('../controllers/paymentSettingsController');
const { protect, authorize } = require('../middleware/auth');

// Public route
router.get('/', getPaymentSettings);

// Admin routes
router.put('/', protect, authorize('admin'), updatePaymentSettings);
router.patch('/toggle', protect, authorize('admin'), togglePaymentSystem);

module.exports = router;
