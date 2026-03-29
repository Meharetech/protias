const express = require('express');
const router = express.Router();
const {
    createEnquiry,
    getAllEnquiries,
    updateEnquiry,
    deleteEnquiry
} = require('../controllers/enquiryController');
const { protect, authorize } = require('../middleware/auth');

// Public route to submit enquiry
router.post('/', createEnquiry);

// Admin only routes
router.use(protect);
router.use(authorize('admin'));

router.route('/')
    .get(getAllEnquiries);

router.route('/:id')
    .put(updateEnquiry)
    .delete(deleteEnquiry);

module.exports = router;
