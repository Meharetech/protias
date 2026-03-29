const SiteSettings = require('../models/SiteSettings');

// @desc    Get site settings
// @route   GET /api/settings
// @access  Public
exports.getSettings = async (req, res) => {
    try {
        const settings = await SiteSettings.getSettings();

        res.status(200).json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Error fetching site settings:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching site settings',
            error: error.message
        });
    }
};

// @desc    Update site settings
// @route   PUT /api/settings
// @access  Private/Admin
exports.updateSettings = async (req, res) => {
    try {
        const settings = await SiteSettings.getSettings();

        // Update fields
        const allowedFields = [
            'siteName',
            'siteTagline',
            'logo',
            'favicon',
            'contactInfo',
            'socialMedia',
            'seo',
            'businessHours',
            'footerText',
            'copyrightText',
            'maintenanceMode'
        ];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                settings[field] = req.body[field];
            }
        });

        settings.updatedBy = req.user.id;
        await settings.save();

        res.status(200).json({
            success: true,
            message: 'Settings updated successfully',
            data: settings
        });
    } catch (error) {
        console.error('Error updating site settings:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating site settings',
            error: error.message
        });
    }
};

// @desc    Upload logo
// @route   POST /api/settings/upload-logo
// @access  Private/Admin
exports.uploadLogo = async (req, res) => {
    try {
        const { logo } = req.body;

        if (!logo) {
            return res.status(400).json({
                success: false,
                message: 'Logo image is required'
            });
        }

        const settings = await SiteSettings.getSettings();
        settings.logo = logo;
        settings.updatedBy = req.user.id;
        await settings.save();

        res.status(200).json({
            success: true,
            message: 'Logo uploaded successfully',
            data: { logo: settings.logo }
        });
    } catch (error) {
        console.error('Error uploading logo:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading logo',
            error: error.message
        });
    }
};

// @desc    Upload favicon
// @route   POST /api/settings/upload-favicon
// @access  Private/Admin
exports.uploadFavicon = async (req, res) => {
    try {
        const { favicon } = req.body;

        if (!favicon) {
            return res.status(400).json({
                success: false,
                message: 'Favicon image is required'
            });
        }

        const settings = await SiteSettings.getSettings();
        settings.favicon = favicon;
        settings.updatedBy = req.user.id;
        await settings.save();

        res.status(200).json({
            success: true,
            message: 'Favicon uploaded successfully',
            data: { favicon: settings.favicon }
        });
    } catch (error) {
        console.error('Error uploading favicon:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading favicon',
            error: error.message
        });
    }
};

// @desc    Reset settings to default
// @route   POST /api/settings/reset
// @access  Private/Admin
exports.resetSettings = async (req, res) => {
    try {
        await SiteSettings.deleteMany({});
        const settings = await SiteSettings.create({
            updatedBy: req.user.id
        });

        res.status(200).json({
            success: true,
            message: 'Settings reset to default successfully',
            data: settings
        });
    } catch (error) {
        console.error('Error resetting settings:', error);
        res.status(500).json({
            success: false,
            message: 'Error resetting settings',
            error: error.message
        });
    }
};
