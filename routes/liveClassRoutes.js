const express = require('express');
const router = express.Router();
const {
    createLiveClass,
    getAllLiveClasses,
    getLiveClassById,
    updateLiveClass,
    forceEndLiveClass,
    deleteLiveClass,
    getUpcomingLiveClasses,
    upload,
} = require('../controllers/liveClassController');
const {
    getComments,
    addComment,
    deleteComment,
} = require('../controllers/liveClassCommentController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

// Public routes (for students)
router.get('/upcoming', getUpcomingLiveClasses);
router.get('/:id', optionalAuth, getLiveClassById);

// Comment routes (protected)
router.get('/:liveClassId/comments', getComments);
router.post('/:liveClassId/comments', protect, addComment);
router.delete('/comments/:commentId', protect, deleteComment);

// Admin routes
router.post('/', protect, authorize('admin'), upload.single('thumbnail'), createLiveClass);
router.get('/', protect, authorize('admin'), getAllLiveClasses);
router.put('/:id', protect, authorize('admin'), upload.single('thumbnail'), updateLiveClass);
router.put('/:id/force-end', protect, authorize('admin'), forceEndLiveClass);
router.delete('/:id', protect, authorize('admin'), deleteLiveClass);

module.exports = router;
