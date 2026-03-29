const Enquiry = require('../models/Enquiry');

// @desc    Submit a new enquiry
// @route   POST /api/enquiries
// @access  Public
exports.createEnquiry = async (req, res) => {
    try {
        console.log('Enquiry submission received:', req.body);
        const { fullName, email, phone, subject, message } = req.body;
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
        console.log('IP Address detected:', ipAddress);

        // Rate limiting check by IP (1 submission per 24 hours per IP)
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const existingEnquiry = await Enquiry.findOne({
            ipAddress,
            createdAt: { $gte: twentyFourHoursAgo }
        });

        if (existingEnquiry) {
            return res.status(429).json({
                success: false,
                message: 'You have already submitted an enquiry in the last 24 hours. Please wait before submitting another.'
            });
        }

        const enquiry = await Enquiry.create({
            fullName,
            email,
            phone,
            subject,
            message,
            ipAddress
        });

        console.log('Enquiry created successfully:', enquiry._id);

        res.status(201).json({
            success: true,
            message: 'Your enquiry has been submitted successfully. We will get back to you soon!',
            data: enquiry
        });
    } catch (error) {
        console.error('Error creating enquiry:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

// @desc    Get all enquiries
// @route   GET /api/enquiries
// @access  Private/Admin
exports.getAllEnquiries = async (req, res) => {
    try {
        console.log('Fetching all enquiries for admin...');
        const enquiries = await Enquiry.find().sort({ createdAt: -1 });
        console.log(`Found ${enquiries.length} enquiries`);

        res.status(200).json({
            success: true,
            count: enquiries.length,
            data: enquiries
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Update enquiry status
// @route   PUT /api/enquiries/:id
// @access  Private/Admin
exports.updateEnquiry = async (req, res) => {
    try {
        const { status, adminNotes } = req.body;
        let enquiry = await Enquiry.findById(req.params.id);

        if (!enquiry) {
            return res.status(404).json({
                success: false,
                message: 'Enquiry not found'
            });
        }

        enquiry = await Enquiry.findByIdAndUpdate(
            req.params.id,
            { status, adminNotes },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            data: enquiry
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// @desc    Delete enquiry
// @route   DELETE /api/enquiries/:id
// @access  Private/Admin
exports.deleteEnquiry = async (req, res) => {
    try {
        const enquiry = await Enquiry.findById(req.params.id);

        if (!enquiry) {
            return res.status(404).json({
                success: false,
                message: 'Enquiry not found'
            });
        }

        await enquiry.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Enquiry deleted'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
