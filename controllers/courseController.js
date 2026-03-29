const Course = require('../models/Course');
const PurchaseLog = require('../models/PurchaseLog');

// @desc    Get all courses (public - only active courses for non-admin)
// @route   GET /api/courses
// @access  Public (but admin can see all)
exports.getAllCourses = async (req, res) => {
    try {
        const { status, category, level, search, limit } = req.query;

        // Build query
        let query = {};

        // Check if user is admin (req.user is set by optional auth middleware)
        const isAdmin = req.user && req.user.role === 'admin';

        // If user is not admin, only show active courses
        if (!isAdmin) {
            query.status = 'active';
        } else {
            // Admin can filter by status or see all
            if (status) {
                query.status = status;
            }
            // If no status filter provided, show all courses (both active and inactive)
        }

        if (category) query.category = category;
        if (level) query.level = level;
        if (search) {
            query.$or = [
                { courseName: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const limitNum = parseInt(limit) || 0;

        const courses = await Course.find(query)
            .sort({ createdAt: -1 })
            .limit(limitNum);

        res.status(200).json({
            success: true,
            count: courses.length,
            data: courses
        });
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch courses',
            error: error.message
        });
    }
};

// @desc    Get single course by ID
// @route   GET /api/courses/:id
// @access  Public
exports.getCourseById = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // If course is inactive and user is not admin, don't show
        if (course.status === 'inactive' && (!req.user || req.user.role !== 'admin')) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        res.status(200).json({
            success: true,
            data: course
        });
    } catch (error) {
        console.error('Error fetching course:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch course',
            error: error.message
        });
    }
};

// @desc    Create new course
// @route   POST /api/courses
// @access  Private/Admin
exports.createCourse = async (req, res) => {
    try {
        let courseData = { ...req.body };

        // Handle uploaded images
        if (req.files && req.files['courseImages']) {
            courseData.images = req.files['courseImages'].map(file => file.path.replace(/\\/g, '/'));
        }

        // Handle uploaded materials
        if (req.files && req.files['materials']) {
            const materials = req.files['materials'].map(file => ({
                fileName: file.originalname,
                fileUrl: file.path.replace(/\\/g, '/'),
                fileType: file.mimetype.split('/')[1] || 'other',
                fileSize: file.size,
                description: req.body.materialDescription || '' // Optional description from body
            }));

            courseData.courseMaterials = courseData.courseMaterials
                ? [...JSON.parse(courseData.courseMaterials), ...materials]
                : materials;
        }

        // Auto-convert Google Drive URL from /view to /preview
        if (courseData.videoLink && courseData.videoLink.includes('drive.google.com')) {
            courseData.videoLink = courseData.videoLink
                .replace('/view?usp=sharing', '/preview')
                .replace('/view', '/preview');
        }

        const course = await Course.create(courseData);

        res.status(201).json({
            success: true,
            message: 'Course created successfully',
            data: course
        });
    } catch (error) {
        console.error('Error creating course:', error);
        res.status(400).json({
            success: false,
            message: 'Failed to create course',
            error: error.message
        });
    }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private/Admin
exports.updateCourse = async (req, res) => {
    try {
        let updateData = { ...req.body };

        // Handle uploaded images
        if (req.files && req.files['courseImages']) {
            const newImages = req.files['courseImages'].map(file => file.path.replace(/\\/g, '/'));
            // If body has images (existing), parse and merge
            let existingImages = [];
            if (req.body.images) {
                try {
                    existingImages = typeof req.body.images === 'string'
                        ? JSON.parse(req.body.images)
                        : req.body.images;
                } catch (e) { existingImages = [req.body.images]; }
            }
            updateData.images = [...existingImages, ...newImages];
        }

        // Handle uploaded materials
        if (req.files && req.files['materials']) {
            const newMaterials = req.files['materials'].map(file => ({
                fileName: file.originalname,
                fileUrl: file.path.replace(/\\/g, '/'),
                fileType: file.mimetype.split('/')[1] || 'other',
                fileSize: file.size,
                description: req.body.materialDescription || ''
            }));

            let existingMaterials = [];
            if (req.body.courseMaterials) {
                try {
                    existingMaterials = typeof req.body.courseMaterials === 'string'
                        ? JSON.parse(req.body.courseMaterials)
                        : req.body.courseMaterials;
                } catch (e) { existingMaterials = []; }
            }
            updateData.courseMaterials = [...existingMaterials, ...newMaterials];
        }

        // Auto-convert Google Drive URL from /view to /preview
        if (updateData.videoLink && updateData.videoLink.includes('drive.google.com')) {
            updateData.videoLink = updateData.videoLink
                .replace('/view?usp=sharing', '/preview')
                .replace('/view', '/preview');
        }

        const course = await Course.findByIdAndUpdate(
            req.params.id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        );

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Course updated successfully',
            data: course
        });
    } catch (error) {
        console.error('Error updating course:', error);
        res.status(400).json({
            success: false,
            message: 'Failed to update course',
            error: error.message
        });
    }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private/Admin
exports.deleteCourse = async (req, res) => {
    try {
        const course = await Course.findByIdAndDelete(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Course deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting course:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete course',
            error: error.message
        });
    }
};

// @desc    Toggle course status (active/inactive)
// @route   PATCH /api/courses/:id/status
// @access  Private/Admin
exports.toggleCourseStatus = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        course.status = course.status === 'active' ? 'inactive' : 'active';
        await course.save();

        res.status(200).json({
            success: true,
            message: `Course ${course.status === 'active' ? 'activated' : 'deactivated'} successfully`,
            data: course
        });
    } catch (error) {
        console.error('Error toggling course status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle course status',
            error: error.message
        });
    }
};

// @desc    Get course statistics
// @route   GET /api/courses/stats
// @access  Private/Admin
exports.getCourseStats = async (req, res) => {
    try {
        const totalCourses = await Course.countDocuments();
        const activeCourses = await Course.countDocuments({ status: 'active' });
        const inactiveCourses = await Course.countDocuments({ status: 'inactive' });

        // Get courses by category
        const coursesByCategory = await Course.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get courses by level
        const coursesByLevel = await Course.aggregate([
            {
                $group: {
                    _id: '$level',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalCourses,
                activeCourses,
                inactiveCourses,
                coursesByCategory,
                coursesByLevel
            }
        });
    } catch (error) {
        console.error('Error fetching course stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch course statistics',
            error: error.message
        });
    }
};
