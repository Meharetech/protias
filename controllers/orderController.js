const Order = require('../models/Order');
const Course = require('../models/Course');
const LiveClass = require('../models/LiveClass');
const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');
const PurchaseLog = require('../models/PurchaseLog');
const User = require('../models/User');
const ReferralReward = require('../models/ReferralReward');
const walletService = require('../services/walletService');
const mongoose = require('mongoose');

// @desc    Create new order (initiate purchase)
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { courseId, liveClassId, couponCode, transactionId, useWallet } = req.body;
        const paymentProof = req.file ? req.file.path : undefined;

        if (!courseId && !liveClassId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Either Course ID or Live Class ID is required'
            });
        }

        let purchasable;
        let originalAmount;
        let purchasableType;

        if (courseId) {
            purchasable = await Course.findById(courseId).session(session);
            if (!purchasable) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({
                    success: false,
                    message: 'Course not found'
                });
            }
            if (purchasable.status !== 'active') {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    success: false,
                    message: 'Course is not available for purchase'
                });
            }
            originalAmount = purchasable.salePrice;
            purchasableType = 'course';
        } else {
            purchasable = await LiveClass.findById(liveClassId).session(session);
            if (!purchasable) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({
                    success: false,
                    message: 'Live Class not found'
                });
            }
            if (purchasable.classType !== 'paid') {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    success: false,
                    message: 'This live class is already free'
                });
            }
            originalAmount = purchasable.price;
            purchasableType = 'liveClass';
        }

        // Check if user already purchased this (approved)
        const approvedOrder = await Order.findOne({
            userId: req.user._id,
            ...(courseId ? { courseId } : { liveClassId }),
            status: 'approved'
        }).session(session);

        if (approvedOrder) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: `You have already purchased this ${purchasableType === 'course' ? 'course' : 'live class'}`
            });
        }

        // Check if user has a pending order
        const pendingOrder = await Order.findOne({
            userId: req.user._id,
            ...(courseId ? { courseId } : { liveClassId }),
            status: 'pending'
        }).session(session);

        if (pendingOrder) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: `You already have a pending order for this ${purchasableType === 'course' ? 'course' : 'live class'}. Please wait for admin approval.`
            });
        }

        let discountAmount = 0;
        let finalAmount = originalAmount;
        let walletAmountUsed = 0;

        // Apply coupon if provided (only for courses for now, unless extended)
        if (couponCode && courseId) {
            const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() }).session(session);

            if (!coupon) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    success: false,
                    message: 'Invalid coupon code'
                });
            }

            // Validate coupon
            const validation = coupon.isValid();
            if (!validation.valid) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    success: false,
                    message: validation.message
                });
            }

            // Check if coupon is applicable to this course
            if (!coupon.isApplicableToCourse(courseId)) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    success: false,
                    message: 'Coupon is not applicable to this course'
                });
            }

            // Calculate discount
            discountAmount = coupon.calculateDiscount(originalAmount);
            finalAmount = originalAmount - discountAmount;

            // Increment coupon usage count
            coupon.usedCount += 1;
            await coupon.save({ session });
        }

        // Wallet application logic
        if (useWallet) {
            const wallet = await walletService.getWallet(req.user._id, session);
            if (wallet.balance > 0) {
                // Use as much as possible up to finalAmount
                walletAmountUsed = Math.min(finalAmount, wallet.balance);
                finalAmount -= walletAmountUsed;

                // Subtract from wallet
                await walletService.addTransaction({
                    userId: req.user._id,
                    amount: walletAmountUsed,
                    type: 'debit',
                    category: 'purchase',
                    description: `Course purchase: ${purchasable.courseName || purchasable.title}`,
                    session
                });
            }
        }

        // Final status decision
        // If finalAmount is 0 (fully paid by wallet/coupon), status can be 'approved' immediately
        let orderStatus = 'draft';
        if (finalAmount === 0) {
            orderStatus = 'approved';
        } else if (paymentProof) {
            orderStatus = 'pending';
        }

        // Create order
        const order = await Order.create([{
            userId: req.user._id,
            courseId: courseId || undefined,
            liveClassId: liveClassId || undefined,
            originalAmount,
            discountAmount,
            walletAmount: walletAmountUsed,
            isWalletUsed: walletAmountUsed > 0,
            finalAmount,
            couponCode: couponCode ? couponCode.toUpperCase() : undefined,
            transactionId,
            paymentProof,
            status: orderStatus,
            approvedAt: orderStatus === 'approved' ? Date.now() : undefined
        }], { session });

        // Commit all changes
        await session.commitTransaction();
        session.endSession();

        // Log purchase attempt (outside transaction for audit)
        await PurchaseLog.create({
            userId: req.user._id,
            ...(courseId ? { courseId } : { liveClassId: liveClassId }),
            attemptType: orderStatus === 'approved' ? 'success' : 'initiated',
            couponCode: couponCode ? couponCode.toUpperCase() : undefined,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            amount: finalAmount,
            status: orderStatus,
            orderId: order[0]._id
        });

        res.status(201).json({
            success: true,
            message: orderStatus === 'approved'
                ? 'Order completed successfully using wallet balance.'
                : paymentProof
                ? 'Order created successfully. Your payment is pending admin approval.'
                : 'Order created successfully. Please complete payment.',
            data: order[0]
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error creating order:', error);

        // Log failed attempt
        if (req.body.courseId) {
            await PurchaseLog.create({
                userId: req.user._id,
                courseId: req.body.courseId,
                attemptType: 'failed',
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                status: 'error',
                metadata: { error: error.message }
            });
        }

        res.status(400).json({
            success: false,
            message: 'Failed to create order',
            error: error.message
        });
    }
};

// @desc    Get my orders
// @route   GET /api/orders/my-orders
// @access  Private
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user._id })
            .populate('courseId', 'courseName images salePrice')
            .populate('liveClassId', 'title price')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error.message
        });
    }
};

// @desc    Get my purchased courses (approved orders only)
// @route   GET /api/orders/my-courses
// @access  Private
exports.getMyCourses = async (req, res) => {
    try {
        const orders = await Order.find({
            userId: req.user._id,
            status: 'approved'
        })
            .populate('courseId', 'courseName description images salePrice originalPrice category duration level instructor videoLink')
            .sort({ approvedAt: -1 });

        // Extract courses from orders, filter out deleted courses
        const courses = orders
            .filter(order => order.courseId !== null) // Skip orders with deleted courses
            .map(order => ({
                ...order.courseId._doc,
                purchaseDate: order.approvedAt,
                paidAmount: order.finalAmount,
                orderId: order._id
            }));

        res.status(200).json({
            success: true,
            count: courses.length,
            data: courses
        });
    } catch (error) {
        console.error('Error fetching purchased courses:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch purchased courses',
            error: error.message
        });
    }
};

// @desc    Get all orders (admin)
// @route   GET /api/orders
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
    try {
        const { status, userId, courseId } = req.query;

        let query = {};
        if (status) {
            query.status = status;
        } else {
            // By default, exclude draft orders (only show orders with payment proof)
            query.status = { $ne: 'draft' };
        }
        if (userId) query.userId = userId;
        if (courseId) query.courseId = courseId;

        // Search Filter
        if (req.query.search) {
            const search = req.query.search;
            const searchRegex = new RegExp(search, 'i');

            // Find users matching search criteria (email or phone)
            const matchedUsers = await User.find({
                $or: [
                    { email: searchRegex },
                    { phone: searchRegex },
                    { fullName: searchRegex }
                ]
            }).select('_id');

            const matchedUserIds = matchedUsers.map(u => u._id);

            query.$or = [
                { userId: { $in: matchedUserIds } }
            ];

            // If it looks like a potential hex string, add partial ID search
            if (search.match(/^[0-9a-fA-F]+$/)) {
                query.$or.push({
                    $expr: {
                        $regexMatch: {
                            input: { $toString: "$_id" },
                            regex: search,
                            options: "i"
                        }
                    }
                });
            }
        }

        // Date Filters
        if (req.query.startDate || req.query.endDate) {
            query.createdAt = {};
            if (req.query.startDate) {
                query.createdAt.$gte = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                const end = new Date(req.query.endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        const orders = await Order.find(query)
            .populate('userId', 'fullName email phone')
            .populate('courseId', 'courseName salePrice')
            .populate('liveClassId', 'title price')
            .populate('approvedBy', 'fullName')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error.message
        });
    }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private (owner or admin)
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('userId', 'fullName email phone')
            .populate('courseId', 'courseName description images salePrice')
            .populate('liveClassId', 'title description price')
            .populate('approvedBy', 'fullName email');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if user is owner or admin
        if (order.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this order'
            });
        }

        res.status(200).json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order',
            error: error.message
        });
    }
};

// @desc    Update order status (approve/reject)
// @route   PATCH /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { status, adminNotes } = req.body;

        if (!['approved', 'rejected', 'cancelled'].includes(status)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be "approved", "rejected" or "cancelled"'
            });
        }

        const order = await Order.findById(req.params.id).session(session);

        if (!order) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Relax 'pending' only check for admins (they can revoke approved/rejected/draft)
        if (order.status === status) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: `Order is already ${order.status}`
            });
        }

        order.status = status;
        order.adminNotes = adminNotes;
        order.approvedBy = req.user._id;
        order.approvedAt = status === 'approved' ? Date.now() : undefined;
        await order.save({ session });

        // Referral Reward Logic on Approval
        if (status === 'approved') {
            const userId = order.userId;
            
            // 1. Check if user has a referral record
            const referralRecord = await ReferralReward.findOne({ 
                referredId: userId,
                purchaseRewardGiven: false 
            }).session(session);

            if (referralRecord) {
                // Check if this is truly the first approved order for this user
                const otherApprovedOrders = await Order.findOne({
                    userId,
                    status: 'approved',
                    _id: { $ne: order._id }
                }).session(session);

                if (!otherApprovedOrders) {
                    // This is the first purchase! Award 200 Rs to referrer
                    const referrerId = referralRecord.referrerId;
                    
                    await walletService.addTransaction({
                        userId: referrerId,
                        amount: 200,
                        type: 'credit',
                        category: 'referral_purchase',
                        description: `Purchase bonus for referral's first buy`,
                        referenceId: order._id,
                        session
                    });

                    referralRecord.purchaseRewardGiven = true;
                    referralRecord.firstPurchaseId = order._id;
                    referralRecord.purchaseRewardAmount = 200;
                    await referralRecord.save({ session });
                    
                    console.log(`Awarded 200 Rs referral purchase reward to ${referrerId}`);
                }
            }
        }

        // Commit all changes
        await session.commitTransaction();
        session.endSession();

        // Log the result
        await PurchaseLog.create({
            userId: order.userId,
            ...(order.courseId ? { courseId: order.courseId } : { liveClassId: order.liveClassId }),
            attemptType: status === 'approved' ? 'success' : 'failed',
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            amount: order.finalAmount,
            status: status,
            orderId: order._id,
            metadata: { adminNotes }
        });

        // TODO: Send email notification to user

        res.status(200).json({
            success: true,
            message: `Order ${status} successfully`,
            data: order
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status',
            error: error.message
        });
    }
};

// @desc    Upload payment proof
// @route   POST /api/orders/:id/payment-proof
// @access  Private (owner)
exports.uploadPaymentProof = async (req, res) => {
    try {
        const { transactionId } = req.body;
        const paymentProof = req.file ? req.file.path : undefined;

        if (!paymentProof) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a payment proof'
            });
        }

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if user is owner
        if (order.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this order'
            });
        }

        // Only allow updating draft orders
        if (order.status !== 'draft') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update payment proof for this order'
            });
        }

        // Update payment details and change status to pending
        order.paymentProof = paymentProof;
        if (transactionId) order.transactionId = transactionId;
        order.status = 'pending'; // Now ready for admin review
        await order.save();

        res.status(200).json({
            success: true,
            message: 'Payment proof uploaded successfully. Your order is now pending admin approval.',
            data: order
        });
    } catch (error) {
        console.error('Error uploading payment proof:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload payment proof',
            error: error.message
        });
    }
};

// @desc    Cancel order (by user)
// @route   POST /api/orders/:id/cancel
// @access  Private (owner)
exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if user is owner
        if (order.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to cancel this order'
            });
        }

        // Only allow cancelling draft or pending orders
        if (!['draft', 'pending'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel an order that is already ${order.status}`
            });
        }

        order.status = 'cancelled';
        await order.save();

        // Log the cancellation
        await PurchaseLog.create({
            userId: req.user._id,
            ...(order.courseId ? { courseId: order.courseId } : { liveClassId: order.liveClassId }),
            attemptType: 'cancelled',
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            amount: order.finalAmount,
            status: 'cancelled',
            orderId: order._id
        });

        res.status(200).json({
            success: true,
            message: 'Order cancelled successfully',
            data: order
        });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel order',
            error: error.message
        });
    }
};

// @desc    Get order statistics
// @route   GET /api/orders/admin/stats
// @access  Private/Admin
exports.getOrderStats = async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({ status: 'pending' });
        const approvedOrders = await Order.countDocuments({ status: 'approved' });
        const rejectedOrders = await Order.countDocuments({ status: 'rejected' });
        const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });

        // Calculate total revenue (approved)
        const revenueData = await Order.aggregate([
            { $match: { status: 'approved' } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$finalAmount' },
                    totalDiscount: { $sum: '$discountAmount' }
                }
            }
        ]);

        // Calculate pending amount
        const pendingData = await Order.aggregate([
            { $match: { status: 'pending' } },
            {
                $group: {
                    _id: null,
                    totalPendingAmount: { $sum: '$finalAmount' }
                }
            }
        ]);

        const revenue = revenueData.length > 0 ? revenueData[0] : { totalRevenue: 0, totalDiscount: 0 };
        const pending = pendingData.length > 0 ? pendingData[0] : { totalPendingAmount: 0 };

        res.status(200).json({
            success: true,
            data: {
                totalOrders,
                pendingOrders,
                approvedOrders,
                rejectedOrders,
                cancelledOrders,
                totalRevenue: revenue.totalRevenue,
                totalPendingAmount: pending.totalPendingAmount,
                totalDiscount: revenue.totalDiscount
            }
        });
    } catch (error) {
        console.error('Error fetching order stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order statistics',
            error: error.message
        });
    }
};

// @desc    Check if user can purchase a course
// @route   GET /api/orders/check/:courseId
// @access  Private
exports.checkCourseOrderStatus = async (req, res) => {
    try {
        const { courseId } = req.params;

        // Check for approved order
        const approvedOrder = await Order.findOne({
            userId: req.user._id,
            courseId: courseId,
            status: 'approved'
        });

        if (approvedOrder) {
            return res.status(200).json({
                success: true,
                canPurchase: false,
                reason: 'already_purchased',
                message: 'You have already purchased this course',
                order: approvedOrder
            });
        }

        // Check for pending order
        const pendingOrder = await Order.findOne({
            userId: req.user._id,
            courseId: courseId,
            status: 'pending'
        });

        if (pendingOrder) {
            return res.status(200).json({
                success: true,
                canPurchase: false,
                reason: 'pending_approval',
                message: 'You have a pending order for this course. Please wait for admin approval.',
                order: pendingOrder
            });
        }

        // Check for draft order (awaiting payment proof)
        const draftOrder = await Order.findOne({
            userId: req.user._id,
            courseId: courseId,
            status: 'draft'
        });

        if (draftOrder) {
            return res.status(200).json({
                success: true,
                canPurchase: false,
                reason: 'draft',
                message: 'You have an incomplete order for this course. Please complete the payment.',
                order: draftOrder
            });
        }

        // User can purchase
        res.status(200).json({
            success: true,
            canPurchase: true,
            message: 'You can purchase this course'
        });
    } catch (error) {
        console.error('Error checking order status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check order status',
            error: error.message
        });
    }
};

// @desc    Check if user can purchase a live class
// @route   GET /api/orders/check-live/:liveClassId
// @access  Private
exports.checkLiveClassOrderStatus = async (req, res) => {
    try {
        const { liveClassId } = req.params;

        // Check for approved order
        const approvedOrder = await Order.findOne({
            userId: req.user._id,
            liveClassId: liveClassId,
            status: 'approved'
        });

        if (approvedOrder) {
            return res.status(200).json({
                success: true,
                canPurchase: false,
                reason: 'already_purchased',
                message: 'You have already purchased this live class',
                order: approvedOrder
            });
        }

        // Check for pending order
        const pendingOrder = await Order.findOne({
            userId: req.user._id,
            liveClassId: liveClassId,
            status: 'pending'
        });

        if (pendingOrder) {
            return res.status(200).json({
                success: true,
                canPurchase: false,
                reason: 'pending_approval',
                message: 'You have a pending order for this live class. Please wait for admin approval.',
                order: pendingOrder
            });
        }

        // Check for draft order (awaiting payment proof)
        const draftOrder = await Order.findOne({
            userId: req.user._id,
            liveClassId: liveClassId,
            status: 'draft'
        });

        if (draftOrder) {
            return res.status(200).json({
                success: true,
                canPurchase: false,
                reason: 'draft',
                message: 'You have an incomplete order for this live class. Please complete the payment.',
                order: draftOrder
            });
        }

        // User can purchase
        res.status(200).json({
            success: true,
            canPurchase: true,
            message: 'You can purchase this live class'
        });
    } catch (error) {
        console.error('Error checking live class order status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check order status',
            error: error.message
        });
    }
};
