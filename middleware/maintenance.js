const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SiteSettings = require('../models/SiteSettings');

const maintenanceMode = async (req, res, next) => {
    try {
        const settings = await SiteSettings.getSettings();

        if (settings.maintenanceMode && settings.maintenanceMode.enabled) {
            // Allow health check and settings retrieval
            if (req.path === '/api/health' || req.path === '/api/settings') {
                return next();
            }

            // Check if it's a login attempt
            if (req.path === '/api/auth/login') {
                return next();
            }

            // Check for admin token to bypass maintenance
            let token;
            if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
                token = req.headers.authorization.split(' ')[1];
            }

            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    const user = await User.findById(decoded.id).select('role');
                    if (user && user.role === 'admin') {
                        req.user = user; // Pre-populate for convenience
                        return next();
                    }
                } catch (e) {
                    // Invalid token, treat as guest
                }
            }

            // If we reach here, maintenance is ON and user is NOT an admin
            return res.status(503).json({
                success: false,
                isMaintenance: true,
                message: settings.maintenanceMode.message || 'Server is under maintenance. Please try again later.'
            });
        }
        next();
    } catch (error) {
        console.error('Maintenance middleware error:', error);
        next();
    }
};

module.exports = maintenanceMode;
