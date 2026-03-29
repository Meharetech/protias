const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const path = require('path');
const fs = require('fs');

// ==================== TUTORIAL VIDEOS ====================

// @desc    Add tutorial video to course
// @route   POST /api/courses/:id/videos
// @access  Private/Admin
exports.addTutorialVideo = async (req, res) => {
    try {
        const { title, description, googleDriveLink, duration, order, isPublic } = req.body;

        if (!title || !googleDriveLink) {
            return res.status(400).json({
                success: false,
                message: 'Title and Google Drive link are required'
            });
        }

        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Convert Google Drive link to embed format if needed
        let embedLink = googleDriveLink;
        if (googleDriveLink.includes('drive.google.com')) {
            embedLink = googleDriveLink
                .replace('/view?usp=sharing', '/preview')
                .replace('/view', '/preview');
        }

        // Process uploaded materials if any
        let videoMaterials = [];
        if (req.files && req.files.length > 0) {
            videoMaterials = req.files.map(file => {
                const ext = path.extname(file.originalname).toLowerCase();
                let fileType = 'other';
                if (ext === '.pdf') fileType = 'pdf';
                else if (ext === '.doc' || ext === '.docx') fileType = 'doc';
                else if (ext === '.zip') fileType = 'zip';
                else if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) fileType = 'image';

                return {
                    fileName: file.originalname,
                    fileUrl: file.path.replace(/\\/g, '/'),
                    fileType,
                    fileSize: file.size,
                    description: ''
                };
            });
        }

        const newVideo = {
            title,
            description: description || '',
            googleDriveLink: embedLink,
            duration: duration || '',
            order: order || course.tutorialVideos.length,
            isPublic: isPublic === 'true' || isPublic === true,
            materials: videoMaterials
        };

        course.tutorialVideos.push(newVideo);
        await course.save();

        res.status(201).json({
            success: true,
            message: 'Tutorial video added successfully',
            data: course.tutorialVideos[course.tutorialVideos.length - 1]
        });
    } catch (error) {
        console.error('Add tutorial video error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add tutorial video',
            error: error.message
        });
    }
};

// @desc    Update tutorial video
// @route   PUT /api/courses/:id/videos/:videoId
// @access  Private/Admin
exports.updateTutorialVideo = async (req, res) => {
    try {
        const { id, videoId } = req.params;
        const { title, description, googleDriveLink, duration, order, isPublic } = req.body;

        const course = await Course.findById(id);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        const video = course.tutorialVideos.id(videoId);
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        // Update fields
        if (title) video.title = title;
        if (description !== undefined) video.description = description;
        if (googleDriveLink) {
            let embedLink = googleDriveLink;
            if (googleDriveLink.includes('drive.google.com')) {
                embedLink = googleDriveLink
                    .replace('/view?usp=sharing', '/preview')
                    .replace('/view', '/preview');
            }
            video.googleDriveLink = embedLink;
        }
        if (duration !== undefined) video.duration = duration;
        if (order !== undefined) video.order = order;
        if (isPublic !== undefined) video.isPublic = isPublic === 'true' || isPublic === true;

        // Handle additional materials for update
        if (req.files && req.files.length > 0) {
            const newMaterials = req.files.map(file => {
                const ext = path.extname(file.originalname).toLowerCase();
                let fileType = 'other';
                if (ext === '.pdf') fileType = 'pdf';
                else if (ext === '.doc' || ext === '.docx') fileType = 'doc';
                else if (ext === '.zip') fileType = 'zip';
                else if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) fileType = 'image';

                return {
                    fileName: file.originalname,
                    fileUrl: file.path.replace(/\\/g, '/'),
                    fileType,
                    fileSize: file.size,
                    description: ''
                };
            });
            video.materials.push(...newMaterials);
        }

        await course.save();

        res.status(200).json({
            success: true,
            message: 'Tutorial video updated successfully',
            data: video
        });
    } catch (error) {
        console.error('Update tutorial video error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update tutorial video',
            error: error.message
        });
    }
};

// @desc    Delete tutorial video
// @route   DELETE /api/courses/:id/videos/:videoId
// @access  Private/Admin
exports.deleteTutorialVideo = async (req, res) => {
    try {
        const { id, videoId } = req.params;

        const course = await Course.findById(id);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        course.tutorialVideos.pull(videoId);
        await course.save();

        res.status(200).json({
            success: true,
            message: 'Tutorial video deleted successfully'
        });
    } catch (error) {
        console.error('Delete tutorial video error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete tutorial video',
            error: error.message
        });
    }
};

// @desc    Delete video material
// @route   DELETE /api/courses/:id/videos/:videoId/materials/:materialId
// @access  Private/Admin
exports.deleteVideoMaterial = async (req, res) => {
    try {
        const { id, videoId, materialId } = req.params;

        const course = await Course.findById(id);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        const video = course.tutorialVideos.id(videoId);
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        const material = video.materials.id(materialId);
        if (!material) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        // Delete the file from disk
        const filePath = path.join(__dirname, '..', material.fileUrl);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Remove from array
        video.materials.pull(materialId);
        await course.save();

        res.status(200).json({
            success: true,
            message: 'Material deleted successfully',
            data: video
        });
    } catch (error) {
        console.error('Delete video material error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete material',
            error: error.message
        });
    }
};

// @desc    Get course videos (public or enrolled users only)
// @route   GET /api/courses/:id/videos
// @access  Public (but filtered)
exports.getCourseVideos = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user is enrolled
        let isEnrolled = false;
        if (req.user) {
            // Check new enrollment system
            const enrollment = await Enrollment.findOne({
                user: req.user.id,
                course: req.params.id,
                isActive: true
            });

            if (enrollment) {
                isEnrolled = true;
            } else {
                // Check old order system for backward compatibility
                const Order = require('../models/Order');
                const approvedOrder = await Order.findOne({
                    userId: req.user.id,
                    courseId: req.params.id,
                    status: 'approved'
                });
                isEnrolled = !!approvedOrder;
            }
        }

        // Filter videos based on enrollment
        let videos = course.tutorialVideos;
        if (!isEnrolled && (!req.user || req.user.role !== 'admin')) {
            // Only show public videos
            videos = videos.filter(video => video.isPublic);
        }

        res.status(200).json({
            success: true,
            isEnrolled,
            count: videos.length,
            data: videos
        });
    } catch (error) {
        console.error('Get course videos error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch course videos',
            error: error.message
        });
    }
};

// ==================== COURSE MATERIALS ====================

// @desc    Upload course material
// @route   POST /api/courses/:id/materials
// @access  Private/Admin
exports.uploadCourseMaterial = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }

        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        const { description } = req.body;

        // Process each uploaded file
        const materials = req.files.map(file => {
            const ext = path.extname(file.originalname).toLowerCase();
            let fileType = 'other';

            if (ext === '.pdf') fileType = 'pdf';
            else if (ext === '.doc' || ext === '.docx') fileType = 'doc';
            else if (ext === '.zip') fileType = 'zip';
            else if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) fileType = 'image';

            return {
                fileName: file.originalname,
                fileUrl: file.path.replace(/\\/g, '/'),
                fileType,
                fileSize: file.size,
                description: description || ''
            };
        });

        course.courseMaterials.push(...materials);
        await course.save();

        res.status(201).json({
            success: true,
            message: `${materials.length} material(s) uploaded successfully`,
            data: materials
        });
    } catch (error) {
        console.error('Upload course material error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload course material',
            error: error.message
        });
    }
};

// @desc    Delete course material
// @route   DELETE /api/courses/:id/materials/:materialId
// @access  Private/Admin
exports.deleteCourseMaterial = async (req, res) => {
    try {
        const { id, materialId } = req.params;

        const course = await Course.findById(id);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        const material = course.courseMaterials.id(materialId);
        if (!material) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        // Delete file from filesystem
        const filePath = path.join(__dirname, '..', material.fileUrl);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        course.courseMaterials.pull(materialId);
        await course.save();

        res.status(200).json({
            success: true,
            message: 'Course material deleted successfully'
        });
    } catch (error) {
        console.error('Delete course material error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete course material',
            error: error.message
        });
    }
};

// @desc    Get course materials (enrolled users only)
// @route   GET /api/courses/:id/materials
// @access  Private
exports.getCourseMaterials = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user is enrolled or admin
        let isEnrolled = false;
        if (req.user) {
            if (req.user.role === 'admin') {
                isEnrolled = true;
            } else {
                // Check new enrollment system
                const enrollment = await Enrollment.findOne({
                    user: req.user.id,
                    course: req.params.id,
                    isActive: true
                });

                if (enrollment) {
                    isEnrolled = true;
                } else {
                    // Check old order system for backward compatibility
                    const Order = require('../models/Order');
                    const approvedOrder = await Order.findOne({
                        userId: req.user.id,
                        courseId: req.params.id,
                        status: 'approved'
                    });
                    isEnrolled = !!approvedOrder;
                }
            }
        }

        if (!isEnrolled) {
            return res.status(403).json({
                success: false,
                message: 'You must be enrolled in this course to access materials'
            });
        }

        res.status(200).json({
            success: true,
            count: course.courseMaterials.length,
            data: course.courseMaterials
        });
    } catch (error) {
        console.error('Get course materials error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch course materials',
            error: error.message
        });
    }
};

module.exports = exports;
