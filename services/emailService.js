const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

// Send OTP email for registration
const sendRegistrationOTP = async (email, otp, fullName) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"PROUT IAS" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Verify Your Email - PROUT IAS Registration',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: 'Arial', sans-serif;
                            line-height: 1.6;
                            color: #333;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                        }
                        .container {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            padding: 40px;
                            border-radius: 10px;
                            color: white;
                        }
                        .content {
                            background: white;
                            padding: 30px;
                            border-radius: 8px;
                            margin-top: 20px;
                            color: #333;
                        }
                        .otp-box {
                            background: #f8f9fa;
                            border: 2px dashed #667eea;
                            padding: 20px;
                            text-align: center;
                            border-radius: 8px;
                            margin: 20px 0;
                        }
                        .otp-code {
                            font-size: 32px;
                            font-weight: bold;
                            color: #667eea;
                            letter-spacing: 5px;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 20px;
                            font-size: 12px;
                            color: rgba(255,255,255,0.8);
                        }
                        .warning {
                            background: #fff3cd;
                            border-left: 4px solid #ffc107;
                            padding: 12px;
                            margin: 15px 0;
                            border-radius: 4px;
                            color: #856404;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1 style="margin: 0; font-size: 28px;">Welcome to PROUT IAS! 🎓</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">Your gateway to civil services success</p>
                        
                        <div class="content">
                            <h2 style="color: #667eea; margin-top: 0;">Email Verification</h2>
                            <p>Hello <strong>${fullName}</strong>,</p>
                            <p>Thank you for registering with PROUT IAS! To complete your registration, please verify your email address using the OTP below:</p>
                            
                            <div class="otp-box">
                                <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Your OTP Code</p>
                                <div class="otp-code">${otp}</div>
                                <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">Valid for 10 minutes</p>
                            </div>
                            
                            <div class="warning">
                                <strong>⚠️ Security Notice:</strong> Never share this OTP with anyone. PROUT IAS will never ask for your OTP via phone or email.
                            </div>
                            
                            <p style="margin-top: 20px;">If you didn't request this registration, please ignore this email.</p>
                            
                            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                                Best regards,<br>
                                <strong>Team PROUT IAS</strong>
                            </p>
                        </div>
                        
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} PROUT IAS. All rights reserved.</p>
                            <p>This is an automated email. Please do not reply.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Registration OTP email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error sending registration OTP email:', error);
        throw new Error('Failed to send OTP email');
    }
};

// Send OTP email for password reset
const sendPasswordResetOTP = async (email, otp, fullName) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"PROUT IAS" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Password Reset Request - PROUT IAS',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: 'Arial', sans-serif;
                            line-height: 1.6;
                            color: #333;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                        }
                        .container {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            padding: 40px;
                            border-radius: 10px;
                            color: white;
                        }
                        .content {
                            background: white;
                            padding: 30px;
                            border-radius: 8px;
                            margin-top: 20px;
                            color: #333;
                        }
                        .otp-box {
                            background: #f8f9fa;
                            border: 2px dashed #dc3545;
                            padding: 20px;
                            text-align: center;
                            border-radius: 8px;
                            margin: 20px 0;
                        }
                        .otp-code {
                            font-size: 32px;
                            font-weight: bold;
                            color: #dc3545;
                            letter-spacing: 5px;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 20px;
                            font-size: 12px;
                            color: rgba(255,255,255,0.8);
                        }
                        .warning {
                            background: #f8d7da;
                            border-left: 4px solid #dc3545;
                            padding: 12px;
                            margin: 15px 0;
                            border-radius: 4px;
                            color: #721c24;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1 style="margin: 0; font-size: 28px;">🔐 Password Reset Request</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">PROUT IAS Account Security</p>
                        
                        <div class="content">
                            <h2 style="color: #dc3545; margin-top: 0;">Reset Your Password</h2>
                            <p>Hello <strong>${fullName}</strong>,</p>
                            <p>We received a request to reset your password. Use the OTP below to proceed with password reset:</p>
                            
                            <div class="otp-box">
                                <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Your Password Reset OTP</p>
                                <div class="otp-code">${otp}</div>
                                <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">Valid for 10 minutes</p>
                            </div>
                            
                            <div class="warning">
                                <strong>⚠️ Security Alert:</strong> If you didn't request a password reset, please ignore this email and ensure your account is secure. Consider changing your password if you suspect unauthorized access.
                            </div>
                            
                            <p style="margin-top: 20px; font-size: 14px;">
                                <strong>Important:</strong> Never share this OTP with anyone, including PROUT IAS staff.
                            </p>
                            
                            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                                Best regards,<br>
                                <strong>Team PROUT IAS</strong>
                            </p>
                        </div>
                        
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} PROUT IAS. All rights reserved.</p>
                            <p>This is an automated email. Please do not reply.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Password reset OTP email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error sending password reset OTP email:', error);
        throw new Error('Failed to send OTP email');
    }
};

// Send welcome email after successful registration
const sendWelcomeEmail = async (email, fullName) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"PROUT IAS" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Welcome to PROUT IAS! 🎉',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: 'Arial', sans-serif;
                            line-height: 1.6;
                            color: #333;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                        }
                        .container {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            padding: 40px;
                            border-radius: 10px;
                            color: white;
                        }
                        .content {
                            background: white;
                            padding: 30px;
                            border-radius: 8px;
                            margin-top: 20px;
                            color: #333;
                        }
                        .feature {
                            display: flex;
                            align-items: start;
                            margin: 15px 0;
                        }
                        .feature-icon {
                            background: #667eea;
                            color: white;
                            width: 30px;
                            height: 30px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-right: 15px;
                            flex-shrink: 0;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 20px;
                            font-size: 12px;
                            color: rgba(255,255,255,0.8);
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1 style="margin: 0; font-size: 32px;">🎉 Welcome Aboard!</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 18px;">Your journey to success begins here</p>
                        
                        <div class="content">
                            <h2 style="color: #667eea; margin-top: 0;">Hello ${fullName}!</h2>
                            <p>Congratulations on successfully creating your PROUT IAS account! We're thrilled to have you join our community of aspiring civil servants.</p>
                            
                            <h3 style="color: #667eea; margin-top: 30px;">What's Next?</h3>
                            
                            <div class="feature">
                                <div class="feature-icon">✓</div>
                                <div>
                                    <strong>Explore Courses</strong><br>
                                    <span style="color: #666; font-size: 14px;">Browse our comprehensive course catalog</span>
                                </div>
                            </div>
                            
                            <div class="feature">
                                <div class="feature-icon">✓</div>
                                <div>
                                    <strong>Access Study Materials</strong><br>
                                    <span style="color: #666; font-size: 14px;">Download notes, PDFs, and practice tests</span>
                                </div>
                            </div>
                            
                            <div class="feature">
                                <div class="feature-icon">✓</div>
                                <div>
                                    <strong>Join Live Classes</strong><br>
                                    <span style="color: #666; font-size: 14px;">Attend interactive sessions with expert faculty</span>
                                </div>
                            </div>
                            
                            <div class="feature">
                                <div class="feature-icon">✓</div>
                                <div>
                                    <strong>Track Your Progress</strong><br>
                                    <span style="color: #666; font-size: 14px;">Monitor your performance and improvement</span>
                                </div>
                            </div>
                            
                            <p style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                                <strong>💡 Pro Tip:</strong> Complete your profile to get personalized course recommendations!
                            </p>
                            
                            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                                If you have any questions, feel free to reach out to our support team.<br><br>
                                Best regards,<br>
                                <strong>Team PROUT IAS</strong>
                            </p>
                        </div>
                        
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} PROUT IAS. All rights reserved.</p>
                            <p>प्रउत IAS - Your gateway to civil services success</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Welcome email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Error sending welcome email:', error);
        // Don't throw error for welcome email - it's not critical
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendRegistrationOTP,
    sendPasswordResetOTP,
    sendWelcomeEmail
};
