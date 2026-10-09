<?php
// auth/reset-password.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/db.php';

try {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);

    $token = trim($data['token'] ?? '');
    $newPassword = $data['new_password'] ?? '';
    $confirmPassword = $data['confirm_password'] ?? '';

    // Validation
    if (empty($token)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Reset token is required'
        ]);
        exit;
    }

    if (empty($newPassword) || empty($confirmPassword)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Password and confirmation are required'
        ]);
        exit;
    }

    if ($newPassword !== $confirmPassword) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Passwords do not match'
        ]);
        exit;
    }

    if (strlen($newPassword) < 6) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Password must be at least 6 characters'
        ]);
        exit;
    }

    // Token ile kullanıcıyı bul
    $stmt = $pdo->prepare("
        SELECT user_id, email, password_reset_token_expiry
        FROM users
        WHERE password_reset_token = ?
    ");
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid or expired reset token'
        ]);
        exit;
    }

    // Token süresi dolmuş mu?
    $now = new DateTime();
    $expiry = new DateTime($user['password_reset_token_expiry']);

    if ($now > $expiry) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Reset token has expired. Please request a new one.',
            'expired' => true
        ]);
        exit;
    }

    // Yeni şifreyi hash'le ve kaydet
    $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare("
        UPDATE users
        SET password_hash = ?,
            password_reset_token = NULL,
            password_reset_token_expiry = NULL
        WHERE user_id = ?
    ");
    $stmt->execute([$passwordHash, $user['user_id']]);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Password reset successfully! You can now log in.',
        'email' => $user['email']
    ]);

} catch (Throwable $e) {
    error_log('RESET PASSWORD ERROR: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error. Please try again later.'
    ]);
}