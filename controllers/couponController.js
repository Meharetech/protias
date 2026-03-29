const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');
const Course = require('../models/Course');

// @desc    Get all coupons
// @route   GET /api/coupons
// @access  Private/Admin
exports.getAllCoupons = async (req, res) => {
    try {
        const { status } = req.query;

        let query = {};
        if (status) query.status = status;

        const coupons = await Coupon.find(query)
            .populate('applicableCourses', 'courseName')
            .populate('createdBy', 'fullName email')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: coupons.length,
            data: coupons
        });
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch coupons',
            error: error.message
        });
    }
};

// @desc    Get coupon by ID
// @route   GET /api/coupons/:id
// @access  Private/Admin
exports.getCouponById = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id)
            .populate('applicableCourses', 'courseName salePrice')
            .populate('createdBy', 'fullName email');

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        res.status(200).json({
            success: true,
            data: coupon
        });
    } catch (error) {
        console.error('Error fetching coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch coupon',
            error: error.message
        });
    }
};

// @desc    Create new coupon
// @route   POST /api/coupons
// @access  Private/Admin
exports.createCoupon = async (req, res) => {
    try {
        // Add creator ID
        req.body.createdBy = req.user._id;

        // Ensure code is uppercase
        if (req.body.code) {
            req.body.code = req.body.code.toUpperCase();
        }

        const coupon = await Coupon.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Coupon created successfully',
            data: coupon
        });
    } catch (error) {
        console.error('Error creating coupon:', error);

        // Handle duplicate code error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code already exists'
            });
        }

        res.status(400).json({
            success: false,
            message: 'Failed to create coupon',
            error: error.message
        });
    }
};

// @desc    Update coupon
// @route   PUT /api/coupons/:id
// @access  Private/Admin
exports.updateCoupon = async (req, res) => {
    try {
        // Ensure code is uppercase if being updated
        if (req.body.code) {
            req.body.code = req.body.code.toUpperCase();
        }

        const coupon = await Coupon.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Coupon updated successfully',
            data: coupon
        });
    } catch (error) {
        console.error('Error updating coupon:', error);

        // Handle duplicate code error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code already exists'
            });
        }

        res.status(400).json({
            success: false,
            message: 'Failed to update coupon',
            error: error.message
        });
    }
};

// @desc    Delete coupon
// @route   DELETE /api/coupons/:id
// @access  Private/Admin
exports.deleteCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndDelete(req.params.id);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Coupon deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete coupon',
            error: error.message
        });
    }
};

// @desc    Toggle coupon status
// @route   PATCH /api/coupons/:id/status
// @access  Private/Admin
exports.toggleCouponStatus = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        coupon.status = coupon.status === 'active' ? 'inactive' : 'active';
        await coupon.save();

        res.status(200).json({
            success: true,
            message: `Coupon ${coupon.status === 'active' ? 'activated' : 'deactivated'} successfully`,
            data: coupon
        });
    } catch (error) {
        console.error('Error toggling coupon status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle coupon status',
            error: error.message
        });
    }
};

// @desc    Validate coupon
// @route   POST /api/coupons/validate
// @access  Private
exports.validateCoupon = async (req, res) => {
    try {
        const { code, courseId } = req.body;

        if (!code || !courseId) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code and course ID are required'
            });
        }

        const coupon = await Coupon.findOne({ code: code.toUpperCase() });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Invalid coupon code'
            });
        }

        // Validate coupon
        const validation = coupon.isValid();
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.message
            });
        }

        // Check if applicable to course
        if (!coupon.isApplicableToCourse(courseId)) {
            return res.status(400).json({
                success: false,
                message: 'Coupon is not applicable to this course'
            });
        }

        // Get course to calculate discount
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        const discountAmount = coupon.calculateDiscount(course.salePrice);
        const finalAmount = course.salePrice - discountAmount;

        res.status(200).json({
            success: true,
            message: 'Coupon is valid',
            data: {
                couponCode: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                originalAmount: course.salePrice,
                discountAmount,
                finalAmount
            }
        });
    } catch (error) {
        console.error('Error validating coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate coupon',
            error: error.message
        });
    }
};

// @desc    Get coupon usage statistics
// @route   GET /api/coupons/:id/usage
// @access  Private/Admin
exports.getCouponUsage = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        const usageRecords = await CouponUsage.find({ couponId: req.params.id })
            .populate('userId', 'fullName email')
            .populate('courseId', 'courseName')
            .populate('orderId', 'status finalAmount')
            .sort({ createdAt: -1 });

        const totalDiscount = usageRecords.reduce((sum, record) => sum + record.discountAmount, 0);

        res.status(200).json({
            success: true,
            data: {
                coupon: {
                    code: coupon.code,
                    usedCount: coupon.usedCount,
                    usageLimit: coupon.usageLimit,
                    remaining: coupon.usageLimit ? coupon.usageLimit - coupon.usedCount : 'Unlimited'
                },
                totalDiscount,
                usageRecords
            }
        });
    } catch (error) {
        console.error('Error fetching coupon usage:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch coupon usage',
            error: error.message
        });
    }
};

// @desc    Get coupon statistics
// @route   GET /api/coupons/stats
// @access  Private/Admin
exports.getCouponStats = async (req, res) => {
    try {
        const totalCoupons = await Coupon.countDocuments();
        const activeCoupons = await Coupon.countDocuments({ status: 'active' });
        const expiredCoupons = await Coupon.countDocuments({
            expiryDate: { $lt: new Date() }
        });

        const totalUsage = await CouponUsage.aggregate([
            {
                $group: {
                    _id: null,
                    totalDiscount: { $sum: '$discountAmount' },
                    totalUses: { $sum: 1 }
                }
            }
        ]);

        const usage = totalUsage.length > 0 ? totalUsage[0] : { totalDiscount: 0, totalUses: 0 };

        res.status(200).json({
            success: true,
            data: {
                totalCoupons,
                activeCoupons,
                expiredCoupons,
                totalDiscount: usage.totalDiscount,
                totalUses: usage.totalUses
            }
        });
    } catch (error) {
        console.error('Error fetching coupon stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch coupon statistics',
            error: error.message
        });
    }
};
