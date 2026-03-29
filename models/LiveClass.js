const mongoose = require('mongoose');

const liveClassSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        thumbnail: {
            type: String,
            default: '',
        },
        youtubeUrl: {
            type: String,
            required: true,
            trim: true,
        },
        tutorName: {
            type: String,
            required: true,
            trim: true,
        },
        scheduledTime: {
            type: Date,
            required: true,
        },
        endTime: {
            type: Date,
        },
        status: {
            type: String,
            enum: ['scheduled', 'live', 'ended'],
            default: 'scheduled',
        },
        classType: {
            type: String,
            enum: ['free', 'paid'],
            default: 'free',
        },
        price: {
            type: Number,
            default: 0,
            min: 0,
        },
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
        },
        recurrence: {
            type: String,
            enum: ['none', 'daily'],
            default: 'none',
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        endedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Method to check and update status
liveClassSchema.methods.updateStatus = function () {
    const now = new Date();
    const scheduledTime = new Date(this.scheduledTime);
    const endTime = this.endTime ? new Date(this.endTime) : null;

    if (this.status !== 'ended') {
        // Auto-end if endTime is reached
        if (endTime && now >= endTime) {
            this.status = 'ended';
            this.endedAt = this.endedAt || now;
        }
        // Auto-start if scheduledTime is reached
        else if (this.status === 'scheduled' && now >= scheduledTime) {
            this.status = 'live';
        }
    }

    return this.status;
};

// Auto-update status based on scheduled time before saving
liveClassSchema.pre('save', function (next) {
    this.updateStatus();
    next();
});

module.exports = mongoose.model('LiveClass', liveClassSchema);
