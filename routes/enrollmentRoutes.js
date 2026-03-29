const express = require('express');
const router = express.Router();
const {
    enrollInCourse,
    getMyEnrollments,
    checkEnrollment,
    updateProgress,
    getAllEnrollments,
    getUserEnrollmentsForAdmin
} = require('../controllers/enrollmentController');
const { protect } = require('../middleware/auth');

// User routes
router.post('/enroll', protect, enrollInCourse);
router.get('/my-courses', protect, getMyEnrollments);
router.get('/check/:courseId', protect, checkEnrollment);
router.put('/:enrollmentId/progress', protect, updateProgress);

// Admin routes
router.get('/all', protect, getAllEnrollments); // TODO: Add admin middleware
router.get('/user/:userId', protect, getUserEnrollmentsForAdmin);

module.exports = router;
