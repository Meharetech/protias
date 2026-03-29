const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const createDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// Storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = 'uploads/';

        if (file.fieldname === 'paymentProof') {
            uploadPath += 'payments/';
        } else if (file.fieldname === 'courseImages') {
            uploadPath += 'courses/';
        } else if (file.fieldname === 'materials' || file.fieldname === 'files') {
            uploadPath += 'materials/';
        } else if (file.fieldname === 'heroSlider') {
            uploadPath += 'heroSliders/';
        } else if (file.fieldname === 'profilePic') {
            uploadPath += 'profiles/';
        } else {
            uploadPath += 'others/';
        }

        createDir(uploadPath);
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter (images and documents)
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'image/jpeg', 'image/png', 'image/webp', 'image/jpg',
        'image/heic', 'image/heif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/zip',
        'application/x-zip-compressed',
        'application/octet-stream'
    ];

    const allowedExtensions = [
        '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif',
        '.pdf', '.doc', '.docx', '.zip'
    ];

    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else if (allowedExtensions.includes(fileExtension)) {
        // Fallback to extension if mimetype is ambiguous (common on some mobile pickers)
        cb(null, true);
    } else {
        console.error(`Rejected file: ${file.originalname}, MIME: ${file.mimetype}, Ext: ${fileExtension}`);
        cb(new Error(`File type not supported: ${file.mimetype} (${fileExtension})`), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit for course materials
    },
    fileFilter: fileFilter
});

module.exports = upload;
