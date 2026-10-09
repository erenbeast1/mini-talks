<?php
// auth/forgot-password.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/EmailHandler.php';

try {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);

    $email = trim($data['email'] ?? '');

    if (empty($email)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Email is required'
        ]);
        exit;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email address'
        ]);
        exit;
    }

    // Kullanıcıyı bul
    $stmt = $pdo->prepare("SELECT user_id, email FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // Güvenlik: Her zaman başarılı mesaj göster (email varsa yoksa belli olmasın)
    if (!$user) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'If this email exists, a password reset link has been sent.'
        ]);
        exit;
    }

    // Reset token oluştur (1 saat geçerli)
    $resetToken = bin2hex(random_bytes(32)); // 64 karakter
    $tokenExpiry = date('Y-m-d H:i:s', strtotime('+1 hour'));

    // Token'ı kaydet
    $stmt = $pdo->prepare("
        UPDATE users
        SET password_reset_token = ?,
            password_reset_token_expiry = ?
        WHERE user_id = ?
    ");
    $stmt->execute([$resetToken, $tokenExpiry, $user['user_id']]);

    // Email gönder
    $emailHandler = new EmailHandler();
    $emailSent = false;
    
    try {
        $emailSent = $emailHandler->sendPasswordResetEmail($email, $resetToken);
    } catch (Exception $e) {
        error_log("Password reset email failed: " . $e->getMessage());
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'If this email exists, a password reset link has been sent.',
        'email_sent' => $emailSent
    ]);

} catch (Throwable $e) {
    error_log('FORGOT PASSWORD ERROR: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error. Please try again later.'
    ]);
}