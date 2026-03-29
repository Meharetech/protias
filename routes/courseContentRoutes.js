const express = require('express');
const router = express.Router();
const {
    addTutorialVideo,
    updateTutorialVideo,
    deleteTutorialVideo,
    getCourseVideos,
    uploadCourseMaterial,
    deleteCourseMaterial,
    deleteVideoMaterial,
    getCourseMaterials
} = require('../controllers/courseContentController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/fileUpload');

// Tutorial Videos Routes
router.post('/:id/videos', protect, authorize('admin'), upload.array('materials', 5), addTutorialVideo);
router.put('/:id/videos/:videoId', protect, authorize('admin'), upload.array('materials', 5), updateTutorialVideo);
router.delete('/:id/videos/:videoId', protect, authorize('admin'), deleteTutorialVideo);
router.delete('/:id/videos/:videoId/materials/:materialId', protect, authorize('admin'), deleteVideoMaterial);
router.get('/:id/videos', optionalAuth, getCourseVideos);

// Course Materials Routes
router.post('/:id/materials', protect, authorize('admin'), upload.array('files', 10), uploadCourseMaterial);
router.delete('/:id/materials/:materialId', protect, authorize('admin'), deleteCourseMaterial);
router.get('/:id/materials', protect, getCourseMaterials);

module.exports = router;
