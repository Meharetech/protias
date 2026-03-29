const mongoose = require('mongoose');

const siteSettingsSchema = new mongoose.Schema({
    // Site Identity
    siteName: {
        type: String,
        default: 'PROUT IAS'
    },
    siteTagline: {
        type: String,
        default: 'Premier UPSC & IAS Preparation Platform'
    },
    logo: {
        type: String, // Base64 or URL
        default: ''
    },
    favicon: {
        type: String, // Base64 or URL
        default: ''
    },

    // Contact Information
    contactInfo: {
        email: {
            type: String,
            default: 'contact@proutias.com'
        },
        phone: {
            type: String,
            default: '+91 1234567890'
        },
        whatsapp: {
            type: String,
            default: '+91 1234567890'
        },
        address: {
            street: { type: String, default: '' },
            city: { type: String, default: '' },
            state: { type: String, default: '' },
            pincode: { type: String, default: '' },
            country: { type: String, default: 'India' }
        }
    },

    // Social Media Links
    socialMedia: {
        facebook: {
            type: String,
            default: ''
        },
        twitter: {
            type: String,
            default: ''
        },
        instagram: {
            type: String,
            default: ''
        },
        linkedin: {
            type: String,
            default: ''
        },
        youtube: {
            type: String,
            default: ''
        },
        telegram: {
            type: String,
            default: ''
        }
    },

    // SEO Settings
    seo: {
        metaTitle: {
            type: String,
            default: 'PROUT IAS - Premier UPSC & IAS Preparation Platform'
        },
        metaDescription: {
            type: String,
            default: 'Master UPSC preparation with expert-led courses and achieve your IAS goals'
        },
        metaKeywords: {
            type: String,
            default: 'UPSC, IAS, Civil Services, Exam Preparation'
        }
    },

    // Business Hours
    businessHours: {
        monday: { type: String, default: '9:00 AM - 6:00 PM' },
        tuesday: { type: String, default: '9:00 AM - 6:00 PM' },
        wednesday: { type: String, default: '9:00 AM - 6:00 PM' },
        thursday: { type: String, default: '9:00 AM - 6:00 PM' },
        friday: { type: String, default: '9:00 AM - 6:00 PM' },
        saturday: { type: String, default: '9:00 AM - 2:00 PM' },
        sunday: { type: String, default: 'Closed' }
    },

    // Footer Content
    footerText: {
        type: String,
        default: 'Empowering IAS aspirants with quality education and guidance.'
    },
    copyrightText: {
        type: String,
        default: '© 2024 PROUT IAS. All rights reserved.'
    },

    // Maintenance Mode
    maintenanceMode: {
        enabled: {
            type: Boolean,
            default: false
        },
        message: {
            type: String,
            default: 'We are currently under maintenance. Please check back soon.'
        }
    },

    // Last Updated
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Ensure only one settings document exists
siteSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);

module.exports = SiteSettings;
