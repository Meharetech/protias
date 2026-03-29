const express = require('express');
const router = express.Router();
const {
    getAllCoupons,
    getCouponById,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCouponStatus,
    validateCoupon,
    getCouponUsage,
    getCouponStats
} = require('../controllers/couponController');
const { protect, authorize } = require('../middleware/auth');

// User routes (authenticated)
router.post('/validate', protect, validateCoupon);

// Admin routes
router.get('/', protect, authorize('admin'), getAllCoupons);
router.get('/stats', protect, authorize('admin'), getCouponStats);
router.get('/:id', protect, authorize('admin'), getCouponById);
router.post('/', protect, authorize('admin'), createCoupon);
router.put('/:id', protect, authorize('admin'), updateCoupon);
router.delete('/:id', protect, authorize('admin'), deleteCoupon);
router.patch('/:id/status', protect, authorize('admin'), toggleCouponStatus);
router.get('/:id/usage', protect, authorize('admin'), getCouponUsage);

module.exports = router;
