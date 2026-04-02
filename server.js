const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const { initializeFirebase } = require('./services/notificationService');
const fs = require('fs');

// Initialize Firebase for push notifications
initializeFirebase();

// Ensure upload directories exist
const uploadDirs = [
    'uploads',
    'uploads/courses',
    'uploads/payments',
    'uploads/sliders',
    'uploads/materials',
    'uploads/notices',
    'uploads/categories',
    'uploads/profiles'
];

uploadDirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
    }
});

const app = express();

// Middleware - CORS Configuration
app.use(cors({
    origin: true,  // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'timeout'],
    credentials: true
}));
// Standard payload size limit (Multipart handles large files)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files (uploaded course materials)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Specific 404 handler for missing uploads
app.use('/uploads', (req, res) => {
    console.warn(`[Static] File not found: ${req.path}`);
    res.status(404).json({
        success: false,
        message: `File '${req.path}' not found on server.`
    });
});

// Maintenance Mode Middleware
const maintenanceMode = require('./middleware/maintenance');
app.use(maintenanceMode);

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/course-content', require('./routes/courseContentRoutes')); // New
app.use('/api/enrollments', require('./routes/enrollmentRoutes')); // New
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/coupons', require('./routes/couponRoutes'));
app.use('/api/purchase-logs', require('./routes/purchaseLogRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/payment-settings', require('./routes/paymentSettingsRoutes'));
app.use('/api/notices', require('./routes/noticeRoutes'));
app.use('/api/settings', require('./routes/siteSettingsRoutes'));
app.use('/api/live-classes', require('./routes/liveClassRoutes'));
app.use('/api/enquiries', require('./routes/enquiryRoutes'));
app.use('/api/push-notifications', require('./routes/pushNotificationRoutes'));
app.use('/api/hero-sliders', require('./routes/heroSliderRoutes'));
app.use('/api/wallet', require('./routes/walletRoutes'));

// Health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Root route
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'PROUT IAS Backend API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                profile: 'GET /api/auth/me',
                logout: 'POST /api/auth/logout'
            }
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`\n🚀 Server is running on port ${PORT}`);
    console.log(`📍 API URL: http://localhost:${PORT}`);
    console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log(`\n✨ Available endpoints:`);
    console.log(`   - GET  /api/health`);
    console.log(`   - POST /api/auth/register`);
    console.log(`   - POST /api/auth/login`);
    console.log(`   - GET  /api/auth/me (protected)`);
    console.log(`   - POST /api/auth/logout (protected)\n`);
});
