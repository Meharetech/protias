const express = require('express');
const router = express.Router();
const {
    getHeroSliders,
    createHeroSlider,
    updateHeroSlider,
    deleteHeroSlider
} = require('../controllers/heroSliderController');

const { protect, authorize, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/fileUpload');

// Public route to get sliders
router.get('/', optionalAuth, getHeroSliders);

// Admin routes
router.post('/', protect, authorize('admin'), upload.single('heroSlider'), createHeroSlider);
router.put('/:id', protect, authorize('admin'), upload.single('heroSlider'), updateHeroSlider);
router.delete('/:id', protect, authorize('admin'), deleteHeroSlider);

module.exports = router;
