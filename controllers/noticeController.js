const Notice = require('../models/Notice');
const { sendNotificationToAll } = require('../services/notificationService');

// @desc    Get all notices
// @route   GET /api/notices
// @access  Public
exports.getNotices = async (req, res) => {
    try {
        let query = {};

        // For non-admins, only show active notices
        if (!req.user || req.user.role !== 'admin') {
            query.status = 'active';
        }

        const notices = await Notice.find(query)
            .sort({ createdAt: -1 })
            .populate('createdBy', 'fullName');

        res.status(200).json({
            success: true,
            count: notices.length,
            data: notices
        });
    } catch (error) {
        console.error('Error fetching notices:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notices',
            error: error.message
        });
    }
};

// @desc    Get single notice
// @route   GET /api/notices/:id
// @access  Public
exports.getNotice = async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id).populate('createdBy', 'fullName');

        if (!notice) {
            return res.status(404).json({
                success: false,
                message: 'Notice not found'
            });
        }

        // Status check for non-admins
        if (notice.status === 'inactive' && (!req.user || req.user.role !== 'admin')) {
            return res.status(404).json({
                success: false,
                message: 'Notice not found'
            });
        }

        res.status(200).json({
            success: true,
            data: notice
        });
    } catch (error) {
        console.error('Error fetching notice:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notice',
            error: error.message
        });
    }
};

// @desc    Create new notice
// @route   POST /api/notices
// @access  Private/Admin
exports.createNotice = async (req, res) => {
    try {
        // Add user to req.body
        req.body.createdBy = req.user.id;

        const notice = await Notice.create(req.body);

        // Send push notification to all users if notice is active
        if (notice.status === 'active') {
            try {
                await sendNotificationToAll(
                    notice.title,
                    notice.content.substring(0, 100) + (notice.content.length > 100 ? '...' : ''),
                    {
                        noticeId: notice._id.toString(),
                        type: notice.type,
                        priority: notice.priority,
                    }
                );
                console.log('✅ Push notification sent for notice:', notice.title);
            } catch (notifError) {
                console.error('⚠️  Failed to send push notification:', notifError.message);
                // Don't fail the request if notification fails
            }
        }

        res.status(201).json({
            success: true,
            message: 'Notice created successfully',
            data: notice
        });
    } catch (error) {
        console.error('Error creating notice:', error);
        res.status(400).json({
            success: false,
            message: 'Failed to create notice',
            error: error.message
        });
    }
};

// @desc    Update notice
// @route   PUT /api/notices/:id
// @access  Private/Admin
exports.updateNotice = async (req, res) => {
    try {
        const notice = await Notice.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!notice) {
            return res.status(404).json({
                success: false,
                message: 'Notice not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Notice updated successfully',
            data: notice
        });
    } catch (error) {
        console.error('Error updating notice:', error);
        res.status(400).json({
            success: false,
            message: 'Failed to update notice',
            error: error.message
        });
    }
};

// @desc    Delete notice
// @route   DELETE /api/notices/:id
// @access  Private/Admin
exports.deleteNotice = async (req, res) => {
    try {
        const notice = await Notice.findByIdAndDelete(req.params.id);

        if (!notice) {
            return res.status(404).json({
                success: false,
                message: 'Notice not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Notice deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting notice:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notice',
            error: error.message
        });
    }
};
