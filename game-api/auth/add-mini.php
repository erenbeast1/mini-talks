<?php
// auth/add-mini.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/db.php';

try {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);

    $parent_id = $data['parent_id'] ?? null;
    $mini_name = trim($data['mini_name'] ?? '');
    $age_range = trim($data['age_range'] ?? '');
    $email = trim($data['email'] ?? ''); // Opsiyonel
    $password = trim($data['password'] ?? ''); // Opsiyonel - YENİ

    // Validation
    if (!$parent_id || !$mini_name || !$age_range) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Parent ID, Mini name, and age range are required'
        ]);
        exit;
    }

    // Eğer email verilmişse password da olmalı
    if (!empty($email) && empty($password)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Password is required when email is provided'
        ]);
        exit;
    }

    // Password minimum 6 karakter olmalı
    if (!empty($password) && strlen($password) < 6) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Password must be at least 6 characters'
        ]);
        exit;
    }

    // Parent kontrolü
    $stmt = $pdo->prepare("
        SELECT u.user_id, r.role_name, u.email
        FROM users u
        JOIN user_roles r ON u.role_id = r.role_id
        WHERE u.user_id = ? AND r.role_name = 'parent'
    ");
    $stmt->execute([$parent_id]);
    $parent = $stmt->fetch();

    if (!$parent) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid parent account'
        ]);
        exit;
    }

    // Age range validation
    $validAgeRanges = ['4-6', '7-9', '10-12', '13-17'];
    if (!in_array($age_range, $validAgeRanges)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid age range'
        ]);
        exit;
    }

    $pdo->beginTransaction();

    // Eğer email verilmişse, user account oluştur
    $user_id = null;
    if (!empty($email)) {
        // Email zaten kullanılıyor mu?
        $stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            $pdo->rollBack();
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Email is already in use'
            ]);
            exit;
        }

        // Child role_id al
        $stmt = $pdo->prepare("SELECT role_id FROM user_roles WHERE role_name = 'child'");
        $stmt->execute();
        $childRole = $stmt->fetch();

        if (!$childRole) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Child role not found'
            ]);
            exit;
        }

        // Password hash oluştur
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);

        // User account oluştur
        $stmt = $pdo->prepare("
            INSERT INTO users (email, password_hash, role_id, is_active, is_email_verified)
            VALUES (?, ?, ?, 1, 0)
        ");
        $stmt->execute([$email, $passwordHash, $childRole['role_id']]);
        $user_id = (int)$pdo->lastInsertId();
    }

    // Mini profile oluştur
    $stmt = $pdo->prepare("
        INSERT INTO mini_profiles 
            (mini_name, age_range, email, parent_email, user_id, parent_id, parent_approval_status)
        VALUES (?, ?, ?, ?, ?, ?, 'approved')
    ");
    $stmt->execute([
        $mini_name,
        $age_range,
        $email ?: null,
        $parent['email'],
        $user_id,
        $parent_id
    ]);

    $mini_id = (int)$pdo->lastInsertId();

    $pdo->commit();

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Mini added successfully',
        'data' => [
            'mini_id' => $mini_id,
            'user_id' => $user_id,
            'mini_name' => $mini_name,
            'age_range' => $age_range,
            'has_account' => !empty($email),
            'can_login' => !empty($email) && !empty($password)
        ]
    ]);

} catch (Throwable $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    error_log('ADD MINI ERROR: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error'
    ]);
}