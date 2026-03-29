const LiveClassComment = require('../models/LiveClassComment');
const LiveClass = require('../models/LiveClass');

// Get all comments for a live class
exports.getComments = async (req, res) => {
    try {
        const { liveClassId } = req.params;

        // Verify live class exists
        const liveClass = await LiveClass.findById(liveClassId);
        if (!liveClass) {
            return res.status(404).json({ message: 'Live class not found' });
        }

        const comments = await LiveClassComment.find({
            liveClassId,
            isDeleted: false,
        })
            .populate('userId', 'fullName email')
            .sort({ createdAt: -1 })
            .limit(100);

        res.status(200).json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Add a comment to a live class
exports.addComment = async (req, res) => {
    try {
        const { liveClassId } = req.params;
        const { comment } = req.body;

        if (!comment || comment.trim().length === 0) {
            return res.status(400).json({ message: 'Comment cannot be empty' });
        }

        // Verify live class exists
        const liveClass = await LiveClass.findById(liveClassId);
        if (!liveClass) {
            return res.status(404).json({ message: 'Live class not found' });
        }

        const newComment = new LiveClassComment({
            liveClassId,
            userId: req.user.id,
            userName: req.user.fullName || req.user.email,
            comment: comment.trim(),
        });

        await newComment.save();

        // Populate user details before sending response
        await newComment.populate('userId', 'fullName email');

        res.status(201).json(newComment);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Delete a comment (only by comment owner or admin)
exports.deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;

        const comment = await LiveClassComment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Check if user is the comment owner or admin
        if (
            comment.userId.toString() !== req.user.id &&
            req.user.role !== 'admin'
        ) {
            return res.status(403).json({ message: 'Not authorized to delete this comment' });
        }

        comment.isDeleted = true;
        await comment.save();

        res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
