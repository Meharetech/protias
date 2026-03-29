const mongoose = require('mongoose');

const heroSliderSchema = new mongoose.Schema({
    image: {
        type: String, // Path to the image
        required: [true, 'Image path is required']
    },
    link: {
        type: String, // Clickable URL
        default: ''
    },
    title: {
        type: String,
        default: '',
        trim: true
    },
    description: {
        type: String,
        default: '',
        trim: true
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries
heroSliderSchema.index({ isActive: 1, order: 1 });

const HeroSlider = mongoose.model('HeroSlider', heroSliderSchema);

module.exports = HeroSlider;
