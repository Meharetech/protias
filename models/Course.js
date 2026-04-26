const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    courseName: {
        type: String,
        required: [true, 'Course name is required'],
        trim: true,
        minlength: [3, 'Course name must be at least 3 characters']
    },
    description: {
        type: String,
        required: [true, 'Description is required']
    },
    shortDescription: {
        type: String,
        required: [true, 'Short description is required'],
        maxlength: [200, 'Short description must not exceed 200 characters']
    },
    originalPrice: {
        type: Number,
        required: [true, 'Original price is required'],
        min: [0, 'Price cannot be negative']
    },
    salePrice: {
        type: Number,
        required: [true, 'Sale price is required'],
        min: [0, 'Price cannot be negative']
    },
    images: [{
        type: String
    }],
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    category: {
        type: String,
        trim: true
    },
    duration: {
        type: String,
        trim: true
    },
    level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
    },
    instructor: {
        type: String,
        trim: true,
        default: 'Expert Faculty'
    },
    courseType: {
        type: String,
        enum: ['free', 'paid'],
        default: 'paid'
    },
    videoLink: {
        type: String,
        trim: true,
        default: ''
    },
    rating: {
        type: Number,
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating must not exceed 5'],
        default: 4.5
    },
    enrolledStudents: {
        type: Number,
        default: 0,
        min: [0, 'Enrollment count cannot be negative']
    },
    badge: {
        type: String,
        enum: ['none', 'popular', 'best seller', 'new'],
        default: 'none'
    },
    // Tutorial Videos (Google Drive Links) - Optional
    tutorialVideos: [{
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        googleDriveLink: {
            type: String,
            required: true,
            trim: true
        },
        duration: {
            type: String,
            trim: true
        },
        order: {
            type: Number,
            default: 0
        },
        isPublic: {
            type: Boolean,
            default: false // Only visible after purchase
        },
        // Materials specific to this video
        materials: [{
            fileName: {
                type: String,
                required: true
            },
            fileUrl: {
                type: String,
                required: true
            },
            fileType: {
                type: String,
                enum: ['pdf', 'doc', 'docx', 'zip', 'image', 'other'],
                required: true
            },
            fileSize: {
                type: Number, // in bytes
                required: true
            },
            description: {
                type: String,
                trim: true
            },
            uploadedAt: {
                type: Date,
                default: Date.now
            }
        }],
        addedAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Course Materials (Files) - Only visible after purchase
    courseMaterials: [{
        fileName: {
            type: String,
            required: true
        },
        fileUrl: {
            type: String,
            required: true
        },
        fileType: {
            type: String,
            enum: ['pdf', 'doc', 'docx', 'zip', 'image', 'other'],
            required: true
        },
        fileSize: {
            type: Number, // in bytes
            required: true
        },
        description: {
            type: String,
            trim: true
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp before saving
courseSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Validate sale price is less than or equal to original price
courseSchema.pre('save', function (next) {
    if (this.salePrice > this.originalPrice) {
        next(new Error('Sale price cannot be greater than original price'));
    }
    next();
});

// Index for faster queries
courseSchema.index({ status: 1, createdAt: -1 });
courseSchema.index({ category: 1 });

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
