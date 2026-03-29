const Category = require('../models/Category');
const Course = require('../models/Course');


// Get all categories
exports.getAllCategories = async (req, res) => {
    try {
        const { status } = req.query;

        let query = {};
        if (status) query.status = status;

        const categories = await Category.find(query).sort({ name: 1 });

        // Fetch course counts for each category
        const categoriesWithCounts = await Promise.all(
            categories.map(async (category) => {
                const count = await Course.countDocuments({ category: category.name });
                return {
                    ...category.toObject(),
                    courseCount: count
                };
            })
        );

        res.status(200).json({
            success: true,
            count: categories.length,
            data: categoriesWithCounts
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
            error: error.message
        });
    }
};


// Get single category
exports.getCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.status(200).json({
            success: true,
            data: category
        });
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category',
            error: error.message
        });
    }
};

// Create category
exports.createCategory = async (req, res) => {
    try {
        const { name, description, status } = req.body;

        // Check if category already exists
        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') }
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Category already exists'
            });
        }

        const category = await Category.create({
            name,
            description,
            status: status || 'active'
        });

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: category
        });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(400).json({
            success: false,
            message: 'Failed to create category',
            error: error.message
        });
    }
};

// Update category
exports.updateCategory = async (req, res) => {
    try {
        const { name, description, status } = req.body;

        // Check if new name conflicts with existing category
        if (name) {
            const existingCategory = await Category.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                _id: { $ne: req.params.id }
            });

            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: 'Category name already exists'
                });
            }
        }

        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { name, description, status, updatedAt: Date.now() },
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            data: category
        });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(400).json({
            success: false,
            message: 'Failed to update category',
            error: error.message
        });
    }
};

// Delete category
exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Check if there are any courses in this category
        const courseCount = await Course.countDocuments({ category: category.name });
        if (courseCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category. There are ${courseCount} courses assigned to this category. Please delete or move those courses first.`
            });
        }

        await Category.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete category',
            error: error.message
        });
    }
};


// Toggle category status
exports.toggleCategoryStatus = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        category.status = category.status === 'active' ? 'inactive' : 'active';
        category.updatedAt = Date.now();
        await category.save();

        res.status(200).json({
            success: true,
            message: `Category ${category.status === 'active' ? 'activated' : 'deactivated'} successfully`,
            data: category
        });
    } catch (error) {
        console.error('Error toggling category status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle category status',
            error: error.message
        });
    }
};
