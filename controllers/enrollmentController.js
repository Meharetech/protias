const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

// @desc    Enroll in a course (Purchase)
// @route   POST /api/enrollments/enroll
// @access  Private
exports.enrollInCourse = async (req, res) => {
    try {
        const { courseId, paymentMethod, transactionId, amountPaid } = req.body;

        // Validate input
        if (!courseId || !amountPaid) {
            return res.status(400).json({
                success: false,
                message: 'Course ID and amount paid are required'
            });
        }

        // Check if course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
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
            amountPaid,
            paymentMethod: paymentMethod || 'other',
            transactionId,
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
        // Get enrollments from new system
        const enrollments = await Enrollment.find({
            user: req.user.id,
            isActive: true
        })
            .populate('course')
            .sort({ enrollmentDate: -1 });

        // Also get approved orders from old system for backward compatibility
        const Order = require('../models/Order');
        const approvedOrders = await Order.find({
            userId: req.user.id,  // Fixed: Order model uses userId
            status: 'approved'
        })
            .populate('courseId')  // Fixed: Order model uses courseId
            .sort({ createdAt: -1 });

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

        console.log('=== ENROLLMENT CHECK DEBUG ===');
        console.log('User ID:', req.user.id);
        console.log('Course ID:', courseId);

        // Check new enrollment system
        const enrollment = await Enrollment.findOne({
            user: req.user.id,
            course: courseId,
            isActive: true
        });

        console.log('Enrollment found:', !!enrollment);

        if (enrollment) {
            console.log('Returning enrollment from Enrollment collection');
            return res.status(200).json({
                success: true,
                data: {
                    isEnrolled: true,
                    enrollment
                }
            });
        }

        // Check old order system for backward compatibility
        const Order = require('../models/Order');

        console.log('Checking Order collection...');
        const approvedOrder = await Order.findOne({
            userId: req.user.id,      // Fixed: Order model uses userId
            courseId: courseId,       // Fixed: Order model uses courseId
            status: 'approved'
        }).populate('courseId');      // Populate the course data

        console.log('Approved order found:', !!approvedOrder);
        if (approvedOrder) {
            console.log('Order details:', {
                orderId: approvedOrder._id,
                userId: approvedOrder.userId,
                courseId: approvedOrder.courseId?._id,
                status: approvedOrder.status
            });
        }

        if (approvedOrder) {
            // Create a pseudo-enrollment object from order
            const pseudoEnrollment = {
                _id: approvedOrder._id,
                user: approvedOrder.userId,
                course: approvedOrder.courseId,  // Use populated courseId
                enrollmentDate: approvedOrder.createdAt,
                paymentStatus: 'completed',
                amountPaid: approvedOrder.finalAmount,  // Fixed: Order model uses finalAmount
                completedVideos: [],
                progress: 0,
                isFromOrder: true
            };

            console.log('Returning pseudo-enrollment from Order');
            return res.status(200).json({
                success: true,
                data: {
                    isEnrolled: true,
                    enrollment: pseudoEnrollment
                }
            });
        }

        // Not enrolled
        console.log('No enrollment or order found - user not enrolled');
        res.status(200).json({
            success: true,
            data: {
                isEnrolled: false,
                enrollment: null
            }
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
        const Order = require('../models/Order');
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
