const express = require('express');
const router = express.Router();
const {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getUserStats,
    resetDeviceId
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// User statistics
router.get('/stats', getUserStats);

// CRUD operations
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.put('/:id/reset-device', resetDeviceId);
router.delete('/:id', deleteUser);

module.exports = router;
