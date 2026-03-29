const express = require('express');
const router = express.Router();
const {
    createOrder,
    getMyOrders,
    getMyCourses,
    getAllOrders,
    getOrderById,
    updateOrderStatus,
    uploadPaymentProof,
    getOrderStats,
    checkCourseOrderStatus,
    checkLiveClassOrderStatus,
    cancelOrder
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const upload = require('../middleware/fileUpload');

// User routes (authenticated)
router.get('/check/:courseId', protect, checkCourseOrderStatus);
router.get('/check-live/:liveClassId', protect, checkLiveClassOrderStatus);
router.post('/', protect, upload.single('paymentProof'), createOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/my-courses', protect, getMyCourses);
router.get('/:id', protect, getOrderById);
router.post('/:id/payment-proof', protect, upload.single('paymentProof'), uploadPaymentProof);
router.post('/:id/cancel', protect, cancelOrder);

// Admin routes
router.get('/', protect, authorize('admin'), getAllOrders);
router.patch('/:id/status', protect, authorize('admin'), updateOrderStatus);
router.get('/admin/stats', protect, authorize('admin'), getOrderStats);

module.exports = router;
