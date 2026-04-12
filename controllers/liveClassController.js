const LiveClass = require('../models/LiveClass');
const Course = require('../models/Course');
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
    limits: { fileSize: 19 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const allowedMimeTypes = [
            'image/jpeg', 'image/png', 'image/webp', 'image/jpg',
            'image/heic', 'image/heif'
        ];

        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
        const fileExtension = path.extname(file.originalname).toLowerCase();

        if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
            cb(null, true);
        } else {
            console.error(`Rejected live class thumbnail: ${file.originalname}, MIME: ${file.mimetype}, Ext: ${fileExtension}`);
            cb(new Error('Only image files (jpeg, jpg, png, webp, heic) are allowed!'), false);
        }
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
            classType: 'free', // Decommissioned pricing logic
            price: 0,         // Decommissioned pricing logic
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
        const liveClass = await LiveClass.findById(req.params.id).populate('courseId', 'courseName category');

        if (!liveClass) {
            return res.status(404).json({ message: 'Live class not found' });
        }

        // Update status
        const oldStatus = liveClass.status;
        liveClass.updateStatus();
        if (liveClass.status !== oldStatus) {
            await liveClass.save();
        }

        // Access Control Logic - Strict Course Enrollment
        if (liveClass.courseId && req.user) {
            // Admins have bypass
            if (req.user.role === 'admin') {
                return res.status(200).json(liveClass);
            }

            // Extract the course ID safely (handles both populated and raw ID)
            const targetCourseId = liveClass.courseId._id || liveClass.courseId;
            const currentUserId = req.user._id || req.user.id;

            // Check if user has active enrollment in the SPECIFIC course
            const enrollment = await Enrollment.findOne({
                user: currentUserId,
                course: targetCourseId,
                isActive: true
            });

            // FALLBACK: Also check the direct Order model
            const approvedOrder = await Order.findOne({
                userId: currentUserId,
                courseId: targetCourseId,
                status: 'approved'
            });

            if (!enrollment && !approvedOrder) {
                return res.status(403).json({
                    message: 'Access denied. You must be enrolled in the associated course to view this live class.',
                    requiresEnrollment: true,
                    courseId: targetCourseId,
                    courseName: liveClass.courseId.courseName || 'this course'
                });
            }
            
            // If they are enrolled, they get the full object
            return res.status(200).json(liveClass);
        } 
        // Public classes (no courseId) or Admin bypass
        else if (!liveClass.courseId && req.user) {
            // Non-course-linked classes are public for logged-in users
            return res.status(200).json(liveClass);
        }
        // Guest user access
        else if (liveClass.courseId && !req.user) {
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
        if (req.body.courseId !== undefined) liveClass.courseId = req.body.courseId || null;
        if (recurrence) liveClass.recurrence = recurrence;
        if (req.file) {
            liveClass.thumbnail = `/uploads/live-classes/${req.file.filename}`;
        }

        // Force free/price 0 as standalone payments are removed
        liveClass.classType = 'free';
        liveClass.price = 0;

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

// Get upcoming live classes for students (Identity-aware filtering)
exports.getUpcomingLiveClasses = async (req, res) => {
    try {
        const filter = {
            status: { $in: ['scheduled', 'live'] }
        };

        // Identity-Based Visibility Control
        if (req.user) {
            // Admins maintain global visibility for monitoring
            if (req.user.role !== 'admin') {
                // Resolve all authorized content sources for the student
                const [enrollments, approvedOrders] = await Promise.all([
                    Enrollment.find({ user: req.user._id, isActive: true }).select('course'),
                    Order.find({ userId: req.user._id, status: 'approved' }).select('courseId')
                ]);

                // Flatten and extract normalized ID strings from all sources
                const enrolledIds = enrollments.map(e => e.course.toString());
                const orderedIds = approvedOrders
                    .map(o => o.courseId ? o.courseId.toString() : null)
                    .filter(id => id !== null);
                
                // Unified set of authorized course ID strings
                const authorizedCourseIds = [...new Set([...enrolledIds, ...orderedIds])];

                // Filter live classes: Include Standalone (null) OR Authorized courses
                filter.$or = [
                    { courseId: null },
                    { courseId: { $in: authorizedCourseIds } }
                ];
            }
        } else {
            // Non-logged in guests only see Standalone public broadcasts
            filter.courseId = null;
        }

        // Optimized query with projection for high-density listing
        const liveClasses = await LiveClass.find(filter)
            .populate('courseId', 'courseName')
            .sort({ scheduledTime: 1 })
            .limit(50);

        res.status(200).json(liveClasses);
    } catch (error) {
        console.error('Error fetching student live feed:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports.upload = upload;
