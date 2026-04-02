const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Order = require('../models/Order');

// @desc    Enroll in a course (Purchase)
// @route   POST /api/enrollments/enroll
// @access  Private
exports.enrollInCourse = async (req, res) => {
    try {
        const { courseId, paymentMethod, transactionId, amountPaid } = req.body;

        // Check if course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        const isFree = course.courseType === 'free';

        // Validate input
        if (!courseId || (!isFree && !amountPaid)) {
            return res.status(400).json({
                success: false,
                message: isFree ? 'Course ID is required' : 'Course ID and amount paid are required'
            });
        }

        // Check if user is already enrolled
        const existingEnrollment = await Enrollment.findOne({
            user: req.user.id,
            course: courseId
        });

        if (existingEnrollment) {
            return res.status(400).json({
                success: false,
                message: 'You are already enrolled in this course'
            });
        }

        // Create enrollment
        const enrollment = await Enrollment.create({
            user: req.user.id,
            course: courseId,
            amountPaid: isFree ? 0 : amountPaid,
            paymentMethod: isFree ? 'other' : (paymentMethod || 'other'),
            transactionId: isFree ? `FREE-${Date.now()}` : transactionId,
            paymentStatus: 'completed'
        });

        res.status(201).json({
            success: true,
            message: 'Successfully enrolled in course',
            data: enrollment
        });
    } catch (error) {
        console.error('Enroll in course error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to enroll in course',
            error: error.message
        });
    }
};

// @desc    Get user's enrolled courses
// @route   GET /api/enrollments/my-courses
// @access  Private
exports.getMyEnrollments = async (req, res) => {
    try {
        // Also get approved orders from old system for backward compatibility
        const [enrollments, approvedOrders] = await Promise.all([
            Enrollment.find({ user: req.user.id, isActive: true })
                .populate('course')
                .sort({ enrollmentDate: -1 }),
            Order.find({ userId: req.user.id, status: 'approved' })
                .populate('courseId')
                .sort({ createdAt: -1 })
        ]);

        // Convert orders to enrollment format
        const orderEnrollments = approvedOrders
            .filter(order => order.courseId) // Only include orders with valid courses
            .map(order => ({
                _id: order._id,
                user: order.userId,
                course: order.courseId,  // Map courseId to course for consistency
                enrollmentDate: order.createdAt,
                paymentStatus: 'completed',
                amountPaid: order.finalAmount,  // Fixed: Order model uses finalAmount
                paymentMethod: order.paymentMethod,
                transactionId: order.transactionId,
                progress: 0,
                completedVideos: [],
                lastAccessed: order.updatedAt,
                isActive: true,
                isFromOrder: true // Flag to identify legacy orders
            }));

        // Combine both and remove duplicates (if a course has both order and enrollment)
        const courseIds = new Set();
        const combinedEnrollments = [];

        // Add new enrollments first (they take priority)
        enrollments.forEach(enrollment => {
            if (enrollment.course) {
                courseIds.add(enrollment.course._id.toString());
                combinedEnrollments.push(enrollment);
            }
        });

        // Add order-based enrollments only if course not already enrolled
        orderEnrollments.forEach(orderEnrollment => {
            if (orderEnrollment.course && !courseIds.has(orderEnrollment.course._id.toString())) {
                combinedEnrollments.push(orderEnrollment);
            }
        });

        res.status(200).json({
            success: true,
            count: combinedEnrollments.length,
            data: combinedEnrollments
        });
    } catch (error) {
        console.error('Get enrollments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch enrollments',
            error: error.message
        });
    }
};

// @desc    Check if user is enrolled in a course
// @route   GET /api/enrollments/check/:courseId
// @access  Private
exports.checkEnrollment = async (req, res) => {
    try {
        const { courseId } = req.params;

        // Run both checks in parallel
        const [enrollment, approvedOrder] = await Promise.all([
            Enrollment.findOne({ user: req.user.id, course: courseId, isActive: true }),
            Order.findOne({ userId: req.user.id, courseId, status: 'approved' }).populate('courseId')
        ]);

        if (enrollment) {
            return res.status(200).json({
                success: true,
                data: { isEnrolled: true, enrollment }
            });
        }

        if (approvedOrder) {
            const pseudoEnrollment = {
                _id: approvedOrder._id,
                user: approvedOrder.userId,
                course: approvedOrder.courseId,
                enrollmentDate: approvedOrder.createdAt,
                paymentStatus: 'completed',
                amountPaid: approvedOrder.finalAmount,
                completedVideos: [],
                progress: 0,
                isFromOrder: true
            };
            return res.status(200).json({
                success: true,
                data: { isEnrolled: true, enrollment: pseudoEnrollment }
            });
        }

        res.status(200).json({
            success: true,
            data: { isEnrolled: false, enrollment: null }
        });
    } catch (error) {
        console.error('Check enrollment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check enrollment',
            error: error.message
        });
    }
};

// @desc    Update course progress
// @route   PUT /api/enrollments/:enrollmentId/progress
// @access  Private
exports.updateProgress = async (req, res) => {
    try {
        const { enrollmentId } = req.params;
        const { progress, completedVideoId } = req.body;

        const enrollment = await Enrollment.findOne({
            _id: enrollmentId,
            user: req.user.id
        });

        if (!enrollment) {
            return res.status(404).json({
                success: false,
                message: 'Enrollment not found'
            });
        }

        // Update progress
        if (progress !== undefined) {
            enrollment.progress = Math.min(100, Math.max(0, progress));
        }

        // Add completed video
        if (completedVideoId && !enrollment.completedVideos.includes(completedVideoId)) {
            enrollment.completedVideos.push(completedVideoId);
        }

        enrollment.lastAccessed = Date.now();
        await enrollment.save();

        res.status(200).json({
            success: true,
            message: 'Progress updated successfully',
            data: enrollment
        });
    } catch (error) {
        console.error('Update progress error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update progress',
            error: error.message
        });
    }
};

// @desc    Get all enrollments (Admin)
// @route   GET /api/enrollments/all
// @access  Private/Admin
exports.getAllEnrollments = async (req, res) => {
    try {
        const enrollments = await Enrollment.find()
            .populate('user', 'fullName email')
            .populate('course', 'courseName')
            .sort({ enrollmentDate: -1 });

        res.status(200).json({
            success: true,
            count: enrollments.length,
            data: enrollments
        });
    } catch (error) {
        console.error('Get all enrollments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch enrollments',
            error: error.message
        });
    }
};

// @desc    Get all enrollments for a specific user (Admin)
// @route   GET /api/enrollments/user/:userId
// @access  Private/Admin
exports.getUserEnrollmentsForAdmin = async (req, res) => {
    try {
        const { userId } = req.params;

        // Get enrollments from new system
        const enrollments = await Enrollment.find({
            user: userId
        }).populate('course');

        // Get orders from old system
        const orders = await Order.find({
            userId: userId,
            status: 'approved'
        }).populate('courseId');

        // Map and combine as in getMyEnrollments
        const orderEnrollments = orders
            .filter(order => order.courseId)
            .map(order => ({
                _id: order._id,
                user: order.userId,
                course: order.courseId,
                enrollmentDate: order.createdAt,
                paymentStatus: 'completed',
                amountPaid: order.finalAmount,
                paymentMethod: order.paymentMethod,
                transactionId: order.transactionId,
                isFromOrder: true
            }));

        const courseIds = new Set();
        const combinedEnrollments = [];

        enrollments.forEach(enrollment => {
            if (enrollment.course) {
                courseIds.add(enrollment.course._id.toString());
                combinedEnrollments.push(enrollment);
            }
        });

        orderEnrollments.forEach(orderEnrollment => {
            if (orderEnrollment.course && !courseIds.has(orderEnrollment.course._id.toString())) {
                combinedEnrollments.push(orderEnrollment);
            }
        });

        res.status(200).json({
            success: true,
            count: combinedEnrollments.length,
            data: combinedEnrollments
        });
    } catch (error) {
        console.error('Get user enrollments admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user enrollments',
            error: error.message
        });
    }
};

module.exports = exports;
