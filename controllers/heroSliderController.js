const HeroSlider = require('../models/HeroSlider');
const path = require('path');
const fs = require('fs');

// @desc    Get all hero sliders
// @route   GET /api/hero-sliders
// @access  Public
exports.getHeroSliders = async (req, res) => {
    try {
        let query = {};

        // For non-admins, only show active sliders
        if (!req.user || req.user.role !== 'admin') {
            query.isActive = true;
        }

        const sliders = await HeroSlider.find(query).sort({ order: 1, createdAt: -1 });

        res.status(200).json({
            success: true,
            count: sliders.length,
            data: sliders
        });
    } catch (error) {
        console.error('Error fetching hero sliders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch hero sliders',
            error: error.message
        });
    }
};

// @desc    Create new hero slider
// @route   POST /api/hero-sliders
// @access  Private/Admin
exports.createHeroSlider = async (req, res) => {
    try {
        let sliderData = { ...req.body };

        if (req.file) {
            sliderData.image = req.file.path.replace(/\\/g, '/');
        } else if (!sliderData.image) {
            return res.status(400).json({
                success: false,
                message: 'Image is required'
            });
        }

        const slider = await HeroSlider.create(sliderData);

        res.status(201).json({
            success: true,
            message: 'Hero slider created successfully',
            data: slider
        });
    } catch (error) {
        console.error('Error creating hero slider:', error);
        res.status(400).json({
            success: false,
            message: 'Failed to create hero slider',
            error: error.message
        });
    }
};

// @desc    Update hero slider
// @route   PUT /api/hero-sliders/:id
// @access  Private/Admin
exports.updateHeroSlider = async (req, res) => {
    try {
        let updateData = { ...req.body };

        if (req.file) {
            updateData.image = req.file.path.replace(/\\/g, '/');
        }

        const slider = await HeroSlider.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true
        });

        if (!slider) {
            return res.status(404).json({
                success: false,
                message: 'Hero slider not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Hero slider updated successfully',
            data: slider
        });
    } catch (error) {
        console.error('Error updating hero slider:', error);
        res.status(400).json({
            success: false,
            message: 'Failed to update hero slider',
            error: error.message
        });
    }
};

// @desc    Delete hero slider
// @route   DELETE /api/hero-sliders/:id
// @access  Private/Admin
exports.deleteHeroSlider = async (req, res) => {
    try {
        const slider = await HeroSlider.findByIdAndDelete(req.params.id);

        if (!slider) {
            return res.status(404).json({
                success: false,
                message: 'Hero slider not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Hero slider deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting hero slider:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete hero slider',
            error: error.message
        });
    }
};
