<?php
// auth/verify-email.php
require_once __DIR__ . '/../config/db.php';

try {
    // Token'ı al (GET)
    $token = $_GET['token'] ?? null;
    
    if (empty($token)) {
        showError('Invalid verification link');
        exit;
    }
    
    // Token ile kullanıcıyı bul
    $stmt = $pdo->prepare("
        SELECT user_id, email, is_email_verified, email_verification_token_expiry
        FROM users
        WHERE email_verification_token = ?
    ");
    $stmt->execute([$token]);
    $user = $stmt->fetch();
    
    if (!$user) {
        showError('Invalid or expired verification link');
        exit;
    }
    
    // Zaten verify edilmiş mi?
    if ($user['is_email_verified'] == 1) {
        showSuccess($user['email'], true);
        exit;
    }
    
    // Token süresi dolmuş mu?
    $now = new DateTime();
    $expiry = new DateTime($user['email_verification_token_expiry']);
    
    if ($now > $expiry) {
        showExpired();
        exit;
    }
    
    // Email'i verify et
    $stmt = $pdo->prepare("
        UPDATE users
        SET is_email_verified = 1,
            email_verification_token = NULL,
            email_verification_token_expiry = NULL
        WHERE user_id = ?
    ");
    $stmt->execute([$user['user_id']]);
    
    showSuccess($user['email'], false);
    
} catch (Throwable $e) {
    error_log('VERIFY EMAIL ERROR: ' . $e->getMessage());
    showError('Server error. Please try again later.');
}

function showSuccess($email, $alreadyVerified) {
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verified - Mini-Talks</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: Arial, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .container {
                background: white;
                border-radius: 20px;
                padding: 50px 40px;
                max-width: 500px;
                width: 100%;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            .icon {
                width: 80px;
                height: 80px;
                background: #00852B;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 30px;
                animation: scaleIn 0.5s ease-out;
            }
            .checkmark {
                width: 40px;
                height: 40px;
                border: 4px solid white;
                border-top: none;
                border-right: none;
                transform: rotate(-45deg);
                margin-top: -10px;
            }
            h1 {
                font-size: 32px;
                color: #00852B;
                margin-bottom: 15px;
                font-weight: 900;
            }
            .email {
                color: #666;
                font-size: 16px;
                margin-bottom: 10px;
            }
            .message {
                color: #333;
                font-size: 18px;
                margin-bottom: 30px;
                line-height: 1.6;
            }
            .button {
                display: inline-block;
                background: #00852B;
                color: white;
                padding: 15px 40px;
                border-radius: 12px;
                text-decoration: none;
                font-weight: bold;
                font-size: 16px;
                transition: all 0.3s;
            }
            .button:hover {
                background: #006d23;
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,133,43,0.3);
            }
            .footer {
                margin-top: 30px;
                font-size: 12px;
                color: #999;
            }
            @keyframes scaleIn {
                0% { transform: scale(0); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">
                <div class="checkmark"></div>
            </div>
            
            <h1>✅ Email Verified!</h1>
            
            <p class="email"><?php echo htmlspecialchars($email); ?></p>
            
            <?php if ($alreadyVerified): ?>
                <p class="message">
                    Your email was already verified.<br>
                    You can now log in to your Mini-Talks account.
                </p>
            <?php else: ?>
                <p class="message">
                    Your email has been successfully verified!<br>
                    You can now log in to your Mini-Talks account.
                </p>
            <?php endif; ?>
            
            <a href="https://mini-talks.org" class="button">Go to Mini-Talks</a>
            
            <div class="footer">
                <p>LEGO® is a trademark of the LEGO Group of companies<br>which does not sponsor, authorize or endorse this site.</p>
                <p style="margin-top: 10px;">© 2025 Mini-Talks. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    <?php
}

function showError($message) {
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Error - Mini-Talks</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: Arial, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .container {
                background: white;
                border-radius: 20px;
                padding: 50px 40px;
                max-width: 500px;
                width: 100%;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            .icon {
                width: 80px;
                height: 80px;
                background: #dc3545;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 30px;
            }
            .icon::before,
            .icon::after {
                content: '';
                position: absolute;
                width: 40px;
                height: 4px;
                background: white;
            }
            .icon::before { transform: rotate(45deg); }
            .icon::after { transform: rotate(-45deg); }
            h1 {
                font-size: 32px;
                color: #dc3545;
                margin-bottom: 15px;
                font-weight: 900;
            }
            .message {
                color: #666;
                font-size: 18px;
                margin-bottom: 30px;
                line-height: 1.6;
            }
            .button {
                display: inline-block;
                background: #0055BF;
                color: white;
                padding: 15px 40px;
                border-radius: 12px;
                text-decoration: none;
                font-weight: bold;
                font-size: 16px;
                transition: all 0.3s;
            }
            .button:hover {
                background: #003d8f;
                transform: translateY(-2px);
            }
            .footer {
                margin-top: 30px;
                font-size: 12px;
                color: #999;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon"></div>
            
            <h1>❌ Verification Failed</h1>
            
            <p class="message"><?php echo htmlspecialchars($message); ?></p>
            
            <a href="https://mini-talks.org" class="button">Go to Mini-Talks</a>
            
            <div class="footer">
                <p>LEGO® is a trademark of the LEGO Group of companies<br>which does not sponsor, authorize or endorse this site.</p>
            </div>
        </div>
    </body>
    </html>
    <?php
}

function showExpired() {
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Link Expired - Mini-Talks</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: Arial, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .container {
                background: white;
                border-radius: 20px;
                padding: 50px 40px;
                max-width: 500px;
                width: 100%;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            .icon {
                width: 80px;
                height: 80px;
                background: #ffc107;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 30px;
                font-size: 48px;
            }
            h1 {
                font-size: 32px;
                color: #ffc107;
                margin-bottom: 15px;
                font-weight: 900;
            }
            .message {
                color: #666;
                font-size: 18px;
                margin-bottom: 30px;
                line-height: 1.6;
            }
            .button {
                display: inline-block;
                background: #0055BF;
                color: white;
                padding: 15px 40px;
                border-radius: 12px;
                text-decoration: none;
                font-weight: bold;
                font-size: 16px;
                transition: all 0.3s;
            }
            .button:hover {
                background: #003d8f;
                transform: translateY(-2px);
            }
            .footer {
                margin-top: 30px;
                font-size: 12px;
                color: #999;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">⏱️</div>
            
            <h1>Link Expired</h1>
            
            <p class="message">
                This verification link has expired.<br>
                Verification links are valid for 24 hours.
            </p>
            
            <a href="https://mini-talks.org" class="button">Request New Link</a>
            
            <div class="footer">
                <p>LEGO® is a trademark of the LEGO Group of companies<br>which does not sponsor, authorize or endorse this site.</p>
            </div>
        </div>
    </body>
    </html>
    <?php
}
?>