const mongoose = require('mongoose');
const User = require('../models/User');

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.aggregate([
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: 'wallets',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'walletInfo'
                }
            },
            {
                $lookup: {
                    from: 'orders',
                    let: { userId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$userId', '$$userId'] }, status: 'approved' } },
                        {
                            $lookup: {
                                from: 'courses',
                                localField: 'courseId',
                                foreignField: '_id',
                                as: 'course'
                            }
                        },
                        {
                            $lookup: {
                                from: 'liveclasses',
                                localField: 'liveClassId',
                                foreignField: '_id',
                                as: 'liveClass'
                            }
                        },
                        { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
                        { $unwind: { path: '$liveClass', preserveNullAndEmptyArrays: true } }
                    ],
                    as: 'enrollments'
                }
            },
            {
                $addFields: {
                    wallet: { $arrayElemAt: ['$walletInfo', 0] }
                }
            },
            {
                $project: {
                    password: 0,
                    walletInfo: 0
                }
            }
        ]);

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: error.message
        });
    }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
    try {
        const results = await User.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
            {
                $lookup: {
                    from: 'wallets',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'walletInfo'
                }
            },
            {
                $lookup: {
                    from: 'orders',
                    let: { userId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$userId', '$$userId'] }, status: 'approved' } },
                        { $lookup: { from: 'courses', localField: 'courseId', foreignField: '_id', as: 'course' } },
                        { $lookup: { from: 'liveclasses', localField: 'liveClassId', foreignField: '_id', as: 'liveClass' } },
                        { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
                        { $unwind: { path: '$liveClass', preserveNullAndEmptyArrays: true } }
                    ],
                    as: 'enrollments'
                }
            },
            {
                $addFields: {
                    wallet: { $arrayElemAt: ['$walletInfo', 0] }
                }
            },
            {
                $project: {
                    password: 0,
                    walletInfo: 0
                }
            }
        ]);

        if (!results.length) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, data: results[0] });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ success: false, message: 'Error fetching user', error: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { fullName, email, phone, role, isActive } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (fullName) user.fullName = fullName;
        if (email) user.email = email;
        if (phone) user.phone = phone;
        if (role) user.role = role;
        if (typeof isActive !== 'undefined') user.isActive = isActive;

        await user.save();
        
        // Return populated user for UI sync
        return exports.getUserById(req, res);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ success: false, message: 'Error updating user', error: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        await user.deleteOne();

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting user',
            error: error.message
        });
    }
};

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private/Admin
exports.getUserStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const inactiveUsers = await User.countDocuments({ isActive: false });
        const adminUsers = await User.countDocuments({ role: 'admin' });
        const studentUsers = await User.countDocuments({ role: 'student' });

        // Get recent registrations (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentRegistrations = await User.countDocuments({
            createdAt: { $gte: sevenDaysAgo }
        });

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                activeUsers,
                inactiveUsers,
                adminUsers,
                studentUsers,
                recentRegistrations
            }
        });
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user statistics',
            error: error.message
        });
    }
};
