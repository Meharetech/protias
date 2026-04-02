const LiveClass = require('../models/LiveClass');
const Enrollment = require('../models/Enrollment');
const Order = require('../models/Order');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = 'uploads/live-classes/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for thumbnail upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'live-class-' + uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {  // Fixed: was || (allowed bad files); now && enforces BOTH
            return cb(null, true);
        }
        cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed!'));
    },
});

// Create a new live class
exports.createLiveClass = async (req, res) => {
    try {
        const {
            title,
            description,
            tutorName,
            youtubeUrl,
            scheduledTime,
            endTime,
            classType,
            price,
            courseId,
            recurrence
        } = req.body;

        if (!title || !description || !tutorName || !youtubeUrl || !scheduledTime) {
            return res.status(400).json({ message: 'All required fields must be provided' });
        }

        const liveClass = new LiveClass({
            title,
            description,
            tutorName,
            youtubeUrl,
            scheduledTime,
            endTime: endTime || null,
            classType: classType || 'free',
            price: price || 0,
            courseId: courseId || null,
            recurrence: recurrence || 'none',
            thumbnail: req.file ? `/uploads/live-classes/${req.file.filename}` : '',
            createdBy: req.user.id,
        });

        await liveClass.save();

        res.status(201).json({
            message: 'Live class created successfully',
            liveClass,
        });
    } catch (error) {
        console.error('Error creating live class:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get all live classes (with status filtering) — Admin
exports.getAllLiveClasses = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};

        if (status) {
            filter.status = status;
        }

        const liveClasses = await LiveClass.find(filter)
            .populate('createdBy', 'name email')
            .sort({ scheduledTime: -1 });

        // Only save classes whose status actually changed (parallel, not sequential)
        const savePromises = [];
        for (const liveClass of liveClasses) {
            const oldStatus = liveClass.status;
            liveClass.updateStatus();
            if (liveClass.status !== oldStatus) {
                savePromises.push(liveClass.save());
            }
        }
        if (savePromises.length > 0) {
            await Promise.all(savePromises);
        }

        res.status(200).json(liveClasses);
    } catch (error) {
        console.error('Error fetching live classes:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get single live class
// @route   GET /api/live-classes/:id
// @access  Public (free) / Private (paid/course-linked)
exports.getLiveClassById = async (req, res) => {
    try {
        const liveClass = await LiveClass.findById(req.params.id).populate('courseId', 'courseName');

        if (!liveClass) {
            return res.status(404).json({ message: 'Live class not found' });
        }

        // Update status
        const oldStatus = liveClass.status;
        liveClass.updateStatus();
        if (liveClass.status !== oldStatus) {
            await liveClass.save();
        }

        // Access Control Logic
        if ((liveClass.classType === 'paid' || liveClass.courseId) && req.user) {
            if (req.user.role === 'admin') {
                return res.status(200).json(liveClass);
            }

            if (liveClass.courseId) {
                const enrollment = await Enrollment.findOne({
                    user: req.user.id,
                    course: liveClass.courseId,
                    isActive: true
                });

                const approvedOrder = await Order.findOne({
                    userId: req.user.id,
                    courseId: liveClass.courseId,
                    status: 'approved'
                });

                if (!enrollment && !approvedOrder) {
                    return res.status(403).json({
                        message: 'Access denied. You must be enrolled in the associated course to view this live class.',
                        requiresEnrollment: true,
                        courseId: liveClass.courseId._id
                    });
                }
            } else if (liveClass.classType === 'paid') {
                const approvedOrder = await Order.findOne({
                    userId: req.user.id,
                    liveClassId: liveClass._id,
                    status: 'approved'
                });

                if (!approvedOrder) {
                    return res.status(403).json({
                        message: 'Access denied. You must purchase this live class to join.',
                        requiresPurchase: true,
                        price: liveClass.price
                    });
                }
            }
        } else if ((liveClass.classType === 'paid' || liveClass.courseId) && !req.user) {
            return res.status(401).json({ message: 'Authentication required to access this live class' });
        }

        res.status(200).json(liveClass);
    } catch (error) {
        console.error('Error fetching live class:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update a live class
exports.updateLiveClass = async (req, res) => {
    try {
        const {
            title,
            description,
            tutorName,
            youtubeUrl,
            scheduledTime,
            endTime,
            classType,
            price,
            courseId,
            recurrence
        } = req.body;

        const liveClass = await LiveClass.findById(req.params.id);

        if (!liveClass) {
            return res.status(404).json({ message: 'Live class not found' });
        }

        // Update fields
        if (title) liveClass.title = title;
        if (description) liveClass.description = description;
        if (tutorName) liveClass.tutorName = tutorName;
        if (youtubeUrl) liveClass.youtubeUrl = youtubeUrl;
        if (scheduledTime) liveClass.scheduledTime = scheduledTime;
        if (req.body.endTime !== undefined) liveClass.endTime = req.body.endTime || null;
        if (classType) liveClass.classType = classType;
        if (price !== undefined) liveClass.price = price;
        if (req.body.courseId !== undefined) liveClass.courseId = req.body.courseId || null;
        if (recurrence) liveClass.recurrence = recurrence;
        if (req.file) {
            liveClass.thumbnail = `/uploads/live-classes/${req.file.filename}`;
        }

        await liveClass.save();

        res.status(200).json({
            message: 'Live class updated successfully',
            liveClass,
        });
    } catch (error) {
        console.error('Error updating live class:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Force end a live class
exports.forceEndLiveClass = async (req, res) => {
    try {
        const liveClass = await LiveClass.findById(req.params.id);

        if (!liveClass) {
            return res.status(404).json({ message: 'Live class not found' });
        }

        liveClass.status = 'ended';
        liveClass.endedAt = new Date();
        await liveClass.save();

        res.status(200).json({
            message: 'Live class ended successfully',
            liveClass,
        });
    } catch (error) {
        console.error('Error ending live class:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Delete a live class
exports.deleteLiveClass = async (req, res) => {
    try {
        const liveClass = await LiveClass.findByIdAndDelete(req.params.id);

        if (!liveClass) {
            return res.status(404).json({ message: 'Live class not found' });
        }

        res.status(200).json({ message: 'Live class deleted successfully' });
    } catch (error) {
        console.error('Error deleting live class:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get upcoming live classes for students
exports.getUpcomingLiveClasses = async (req, res) => {
    try {
        // Fetch only scheduled/live classes directly from DB (indexed query, no memory filter)
        const liveClasses = await LiveClass.find({
            status: { $in: ['scheduled', 'live'] }
        }).sort({ scheduledTime: 1 }).limit(50);

        // Only save classes whose status actually changed
        const savePromises = [];
        for (const liveClass of liveClasses) {
            const oldStatus = liveClass.status;
            liveClass.updateStatus();
            if (liveClass.status !== oldStatus) {
                savePromises.push(liveClass.save());
            }
        }
        if (savePromises.length > 0) {
            await Promise.all(savePromises);
        }

        res.status(200).json(liveClasses);
    } catch (error) {
        console.error('Error fetching upcoming live classes:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports.upload = upload;
