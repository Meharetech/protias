const PurchaseLog = require('../models/PurchaseLog');

// @desc    Get all purchase logs
// @route   GET /api/purchase-logs
// @access  Private/Admin
exports.getAllLogs = async (req, res) => {
    try {
        const { attemptType, userId, courseId, startDate, endDate } = req.query;

        let query = {};

        if (attemptType && attemptType !== 'All') query.attemptType = attemptType;
        if (userId) query.userId = userId;
        if (courseId) query.courseId = courseId;

        // Date range filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        let logs = await PurchaseLog.find(query)
            .populate('userId', 'fullName email phone')
            .populate('courseId', 'courseName salePrice')
            .populate('orderId', 'status finalAmount')
            .sort({ createdAt: -1 })
            .limit(1000);

        // Filter: If filtering by "initiated", only show logs where order status is "draft"
        // This hides attempts that eventually resulted in a submitted payment (pending/approved)
        if (attemptType === 'initiated') {
            logs = logs.filter(log => {
                if (!log.orderId) return true; // No order link

                // If the order associated with this "initiated" attempt is already
                // pending, approved, or rejected, it means the user proceeded past 
                // the "just initiated" phase. Hide it.
                return log.orderId.status === 'draft';
            });
        }

        res.status(200).json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (error) {
        console.error('Error fetching purchase logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch purchase logs',
            error: error.message
        });
    }
};

// @desc    Get logs by user
// @route   GET /api/purchase-logs/user/:userId
// @access  Private/Admin
exports.getLogsByUser = async (req, res) => {
    try {
        const logs = await PurchaseLog.find({ userId: req.params.userId })
            .populate('courseId', 'courseName salePrice')
            .populate('orderId', 'status finalAmount')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (error) {
        console.error('Error fetching user logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user logs',
            error: error.message
        });
    }
};

// @desc    Get logs by course
// @route   GET /api/purchase-logs/course/:courseId
// @access  Private/Admin
exports.getLogsByCourse = async (req, res) => {
    try {
        const logs = await PurchaseLog.find({ courseId: req.params.courseId })
            .populate('userId', 'fullName email')
            .populate('orderId', 'status finalAmount')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (error) {
        console.error('Error fetching course logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch course logs',
            error: error.message
        });
    }
};

// @desc    Get purchase analytics
// @route   GET /api/purchase-logs/analytics
// @access  Private/Admin
exports.getAnalytics = async (req, res) => {
    try {
        // Total attempts
        const totalAttempts = await PurchaseLog.countDocuments();

        // Attempts by type
        const attemptsByType = await PurchaseLog.aggregate([
            {
                $group: {
                    _id: '$attemptType',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Success rate
        const successCount = await PurchaseLog.countDocuments({ attemptType: 'success' });
        const failedCount = await PurchaseLog.countDocuments({ attemptType: 'failed' });
        const cancelledCount = await PurchaseLog.countDocuments({ attemptType: 'cancelled' });
        const successRate = totalAttempts > 0 ? ((successCount / totalAttempts) * 100).toFixed(2) : 0;

        // Total revenue from successful purchases
        const revenueData = await PurchaseLog.aggregate([
            { $match: { attemptType: 'success' } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$amount' }
                }
            }
        ]);

        const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

        // Most popular courses
        const popularCourses = await PurchaseLog.aggregate([
            { $match: { attemptType: { $in: ['initiated', 'success'] } } },
            {
                $group: {
                    _id: '$courseId',
                    attempts: { $sum: 1 },
                    successful: {
                        $sum: { $cond: [{ $eq: ['$attemptType', 'success'] }, 1, 0] }
                    }
                }
            },
            { $sort: { attempts: -1 } },
            { $limit: 10 }
        ]);

        // Populate course details
        await PurchaseLog.populate(popularCourses, {
            path: '_id',
            select: 'courseName salePrice'
        });

        // Coupon usage
        const couponUsage = await PurchaseLog.aggregate([
            { $match: { couponCode: { $exists: true, $ne: null } } },
            {
                $group: {
                    _id: '$couponCode',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Attempts over time (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const attemptsOverTime = await PurchaseLog.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        type: '$attemptType'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.date': 1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalAttempts,
                    successCount,
                    failedCount,
                    cancelledCount,
                    successRate: `${successRate}%`,
                    totalRevenue
                },
                attemptsByType,
                popularCourses,
                couponUsage,
                attemptsOverTime
            }
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics',
            error: error.message
        });
    }
};

// @desc    Get recent logs
// @route   GET /api/purchase-logs/recent
// @access  Private/Admin
exports.getRecentLogs = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;

        const logs = await PurchaseLog.find()
            .populate('userId', 'fullName email')
            .populate('courseId', 'courseName')
            .populate('orderId', 'status')
            .sort({ createdAt: -1 })
            .limit(limit);

        res.status(200).json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (error) {
        console.error('Error fetching recent logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent logs',
            error: error.message
        });
    }
};
