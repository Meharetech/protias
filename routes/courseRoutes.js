const express = require('express');
const router = express.Router();
const {
    getAllCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse,
    toggleCourseStatus,
    getCourseStats
} = require('../controllers/courseController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

// Public routes (with optional auth to detect admin users)
router.get('/', optionalAuth, getAllCourses);
router.get('/:id', optionalAuth, getCourseById);

const upload = require('../middleware/fileUpload');

// Admin routes
router.post('/',
    protect,
    authorize('admin'),
    upload.fields([
        { name: 'courseImages', maxCount: 5 },
        { name: 'materials', maxCount: 10 }
    ]),
    createCourse
);

router.put('/:id',
    protect,
    authorize('admin'),
    upload.fields([
        { name: 'courseImages', maxCount: 5 },
        { name: 'materials', maxCount: 10 }
    ]),
    updateCourse
);
router.delete('/:id', protect, authorize('admin'), deleteCourse);
router.patch('/:id/status', protect, authorize('admin'), toggleCourseStatus);
router.get('/admin/stats', protect, authorize('admin'), getCourseStats);

module.exports = router;
