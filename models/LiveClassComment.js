const mongoose = require('mongoose');

const liveClassCommentSchema = new mongoose.Schema(
    {
        liveClassId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'LiveClass',
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        comment: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
        userName: {
            type: String,
            required: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient querying
liveClassCommentSchema.index({ liveClassId: 1, createdAt: -1 });

module.exports = mongoose.model('LiveClassComment', liveClassCommentSchema);
