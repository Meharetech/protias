const getDeleteAccountHTML = () => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Delete Account | PROUT IAS</title>
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    
    <style>
        :root {
            --primary: #ff5858;
            --primary-hover: #ef4444;
            --bg-gradient: radial-gradient(circle at top right, #1e1b4b 0%, #0f172a 100%);
            --card-bg: rgba(30, 41, 59, 0.7);
            --card-border: rgba(255, 255, 255, 0.08);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --accent: #f43f5e;
            --success: #10b981;
            --transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Outfit', sans-serif;
        }

        body {
            background: var(--bg-gradient);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            overflow-x: hidden;
            position: relative;
        }

        /* Abstract glowing background circles */
        .glow-circle {
            position: absolute;
            border-radius: 50%;
            filter: blur(100px);
            z-index: 0;
            opacity: 0.15;
        }
        .glow-1 {
            width: 300px;
            height: 300px;
            background: #8b5cf6;
            top: 10%;
            left: 10%;
        }
        .glow-2 {
            width: 400px;
            height: 400px;
            background: #ec4899;
            bottom: 10%;
            right: 10%;
        }

        .container {
            width: 100%;
            max-width: 480px;
            z-index: 10;
        }

        .card {
            background: var(--card-bg);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--card-border);
            border-radius: 24px;
            padding: 40px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            text-align: center;
            position: relative;
            overflow: hidden;
        }

        .logo-section {
            margin-bottom: 24px;
        }
        
        .logo-icon {
            font-size: 40px;
            background: linear-gradient(135deg, #f857a6 0%, #ff5858 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            display: inline-block;
            margin-bottom: 8px;
        }

        h1 {
            font-size: 26px;
            font-weight: 700;
            letter-spacing: -0.5px;
            margin-bottom: 8px;
            background: linear-gradient(to right, #f8fafc, #cbd5e1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .subtitle {
            font-size: 14px;
            color: var(--text-muted);
            line-height: 1.5;
            margin-bottom: 30px;
        }

        .step-container {
            position: relative;
            min-height: 240px;
        }

        .step {
            display: none;
            opacity: 0;
            transform: translateY(20px);
            transition: var(--transition);
        }

        .step.active {
            display: block;
            opacity: 1;
            transform: translateY(0);
        }

        /* Forms */
        .form-group {
            text-align: left;
            margin-bottom: 20px;
        }

        label {
            display: block;
            font-size: 13px;
            font-weight: 500;
            color: var(--text-muted);
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .input-wrapper {
            position: relative;
        }

        input {
            width: 100%;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 14px 16px;
            color: #fff;
            font-size: 15px;
            outline: none;
            transition: var(--transition);
        }

        input:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 2px rgba(255, 88, 88, 0.2);
            background: rgba(15, 23, 42, 0.8);
        }

        .otp-inputs {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            margin: 20px 0;
        }

        .otp-digit {
            width: 50px;
            height: 54px;
            text-align: center;
            font-size: 22px;
            font-weight: 700;
            border-radius: 12px;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #fff;
            transition: var(--transition);
        }

        .otp-digit:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 2px rgba(255, 88, 88, 0.2);
        }

        /* Buttons */
        .btn {
            width: 100%;
            padding: 14px 24px;
            border-radius: 12px;
            border: none;
            cursor: pointer;
            font-weight: 600;
            font-size: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: var(--transition);
        }

        .btn-danger {
            background: linear-gradient(135deg, #f857a6 0%, #ff5858 100%);
            color: white;
            box-shadow: 0 4px 20px rgba(255, 88, 88, 0.2);
        }

        .btn-danger:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 24px rgba(255, 88, 88, 0.35);
        }

        .btn-danger:active:not(:disabled) {
            transform: translateY(0);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .btn-secondary {
            background: transparent;
            color: var(--text-muted);
            border: 1px solid rgba(255, 255, 255, 0.1);
            margin-top: 12px;
        }

        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.05);
            color: white;
        }

        /* Warning notice card */
        .warning-box {
            background: rgba(239, 68, 68, 0.08);
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 16px;
            padding: 16px;
            text-align: left;
            margin-bottom: 24px;
        }

        .warning-box h4 {
            color: #ef4444;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .warning-box p {
            font-size: 12px;
            color: var(--text-muted);
            line-height: 1.5;
        }

        /* Status & Notifications */
        .alert {
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 20px;
            text-align: left;
            display: none;
            animation: fadeIn 0.3s ease;
        }

        .alert-error {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #fca5a5;
        }

        .alert-success {
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #a7f3d0;
        }

        .email-display {
            font-weight: 600;
            color: var(--text-main);
            background: rgba(255, 255, 255, 0.05);
            padding: 6px 12px;
            border-radius: 20px;
            display: inline-block;
            margin: 10px 0;
            font-size: 14px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }

        /* Success screen checkmark animation */
        .success-checkmark {
            width: 80px;
            height: 80px;
            margin: 0 auto 24px;
            background: rgba(16, 185, 129, 0.1);
            border: 2px solid var(--success);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            color: var(--success);
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.2);
            animation: scaleUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        /* Spinners */
        .spinner {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 0.8s linear infinite;
            display: none;
        }

        .loading .spinner {
            display: inline-block;
        }
        .loading .btn-text {
            display: none;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes scaleUp {
            from { transform: scale(0.6); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }

        /* Footer links */
        .footer-note {
            margin-top: 30px;
            font-size: 12px;
            color: var(--text-muted);
        }
        .footer-note a {
            color: #cbd5e1;
            text-decoration: none;
            transition: var(--transition);
        }
        .footer-note a:hover {
            color: var(--primary);
            text-decoration: underline;
        }
    </style>
</head>
<body>

    <div class="glow-circle glow-1"></div>
    <div class="glow-circle glow-2"></div>

    <div class="container">
        <div class="card">
            <div class="logo-section">
                <div class="logo-icon">⚠️</div>
                <h1 id="title-text">Delete Your Account</h1>
            </div>

            <!-- Alert Notification -->
            <div id="alert-box" class="alert"></div>

            <div class="step-container">
                <!-- Step 1: Input Email -->
                <div id="step-1" class="step active">
                    <p class="subtitle">Enter your registered email address to request a temporary verification code. We will send a confirmation code to this address.</p>
                    
                    <div class="warning-box">
                        <h4>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            Permanent Action
                        </h4>
                        <p>This will permanently delete your profile, course enrollments, transaction history, wallet balance, and notes. This action is irreversible.</p>
                    </div>

                    <form id="email-form" onsubmit="event.preventDefault(); requestOTP();">
                        <div class="form-group">
                            <label for="email">Registered Email Address</label>
                            <input type="email" id="email" placeholder="e.g., student@example.com" required autocomplete="email">
                        </div>
                        <button type="submit" id="btn-request-otp" class="btn btn-danger">
                            <span class="spinner"></span>
                            <span class="btn-text">Send Verification OTP</span>
                        </button>
                    </form>
                </div>

                <!-- Step 2: Input OTP -->
                <div id="step-2" class="step">
                    <p class="subtitle">We have sent a 6-digit confirmation code to your email. Enter the OTP code below to confirm deletion.</p>
                    
                    <div class="email-display" id="email-display-text">student@example.com</div>

                    <form id="otp-form" onsubmit="event.preventDefault(); confirmDeletion();">
                        <div class="form-group">
                            <label>Verification Code (OTP)</label>
                            <div class="otp-inputs">
                                <input type="text" class="otp-digit" maxlength="1" pattern="[0-9]" inputmode="numeric" required>
                                <input type="text" class="otp-digit" maxlength="1" pattern="[0-9]" inputmode="numeric" required>
                                <input type="text" class="otp-digit" maxlength="1" pattern="[0-9]" inputmode="numeric" required>
                                <input type="text" class="otp-digit" maxlength="1" pattern="[0-9]" inputmode="numeric" required>
                                <input type="text" class="otp-digit" maxlength="1" pattern="[0-9]" inputmode="numeric" required>
                                <input type="text" class="otp-digit" maxlength="1" pattern="[0-9]" inputmode="numeric" required>
                            </div>
                        </div>

                        <button type="submit" id="btn-confirm-delete" class="btn btn-danger">
                            <span class="spinner"></span>
                            <span class="btn-text">Confirm Permanent Deletion</span>
                        </button>
                        
                        <button type="button" class="btn btn-secondary" onclick="goToStep(1)">
                            Go Back
                        </button>
                    </form>
                </div>

                <!-- Step 3: Success -->
                <div id="step-3" class="step">
                    <div class="success-checkmark">✓</div>
                    <h2>Account Deleted</h2>
                    <p class="subtitle" style="margin-top: 10px;">Your account and all associated data have been permanently removed from our systems. Thank you for being a part of PROUT IAS.</p>
                    
                    <a href="https://proutias.shop" class="btn btn-secondary" style="margin-top: 24px; text-decoration: none;">
                        Return to Homepage
                    </a>
                </div>
            </div>

            <div class="footer-note">
                Need help? Contact <a href="mailto:support@proutias.shop">support@proutias.shop</a>
            </div>
        </div>
    </div>

    <script>
        const API_URL = '/api/delete-account';
        let userEmail = '';

        // Handle OTP digit inputs focus shifting
        const digits = document.querySelectorAll('.otp-digit');
        digits.forEach((digit, index) => {
            digit.addEventListener('input', (e) => {
                if (e.target.value.length === 1 && index < digits.length - 1) {
                    digits[index + 1].focus();
                }
            });

            digit.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && e.target.value.length === 0 && index > 0) {
                    digits[index - 1].focus();
                }
            });
        });

        function getOTPValue() {
            let code = '';
            digits.forEach(d => code += d.value);
            return code;
        }

        function showAlert(message, type = 'error') {
            const alertBox = document.getElementById('alert-box');
            alertBox.innerText = message;
            alertBox.className = 'alert alert-' + type;
            alertBox.style.display = 'block';
            
            // Scroll to alert
            alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        function hideAlert() {
            document.getElementById('alert-box').style.display = 'none';
        }

        function goToStep(stepNum) {
            hideAlert();
            document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
            
            // Set titles based on steps
            const titleEl = document.getElementById('title-text');
            if (stepNum === 1) {
                titleEl.innerText = "Delete Your Account";
            } else if (stepNum === 2) {
                titleEl.innerText = "Confirm OTP";
            } else {
                titleEl.innerText = "Success";
            }
            
            setTimeout(() => {
                const targetStep = document.getElementById('step-' + stepNum);
                targetStep.classList.add('active');
                
                if (stepNum === 2) {
                    digits[0].focus();
                }
            }, 50);
        }

        async function requestOTP() {
            const emailInput = document.getElementById('email');
            const submitBtn = document.getElementById('btn-request-otp');
            
            userEmail = emailInput.value.trim().toLowerCase();
            if (!userEmail) return;

            // Show loading state
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
            hideAlert();

            try {
                const response = await fetch(API_URL + '/send-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userEmail })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    document.getElementById('email-display-text').innerText = userEmail;
                    // Reset OTP inputs
                    digits.forEach(d => d.value = '');
                    goToStep(2);
                } else {
                    showAlert(data.message || 'Failed to send verification code. Please try again.');
                }
            } catch (err) {
                console.error(err);
                showAlert('Network error. Please check your internet connection.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
            }
        }

        async function confirmDeletion() {
            const otp = getOTPValue();
            if (otp.length !== 6) {
                showAlert('Please enter the complete 6-digit OTP code.');
                return;
            }

            const submitBtn = document.getElementById('btn-confirm-delete');
            
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
            hideAlert();

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userEmail, otp: otp })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    goToStep(3);
                } else {
                    showAlert(data.message || 'Verification failed. The OTP may be incorrect or expired.');
                }
            } catch (err) {
                console.error(err);
                showAlert('Network error. Please try again later.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
            }
        }
    </script>
</body>
</html>`;
};

module.exports = { getDeleteAccountHTML };
