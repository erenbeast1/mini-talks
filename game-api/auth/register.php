<?php
// auth/register.php

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
    // ---- JSON body al ----
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);

    if (!$data) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid JSON body.']);
        exit;
    }

    // ---- Gelen alanlar ----
    $email        = trim($data['email'] ?? '');
    $password     = $data['password'] ?? '';
    $roleType     = trim($data['role_type'] ?? '');   // child | parent | expert | builder
    $fullName     = trim($data['full_name'] ?? '');
    $username     = trim($data['username'] ?? '');
    $parentEmail  = trim($data['parent_email'] ?? '');
    $organization = trim($data['organization'] ?? '');
    $ageGroup     = trim($data['age_group'] ?? '');   // 4-6, 7-9, 10-12, 13-17, 18-24...

    // ---- Basit validation (React tarafıyla uyumlu) ----
    if ($email === '' || $password === '' || $roleType === '' || $fullName === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing required fields.']);
        exit;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid email.']);
        exit;
    }

    // role_type -> role_id
    $stmt = $pdo->prepare("SELECT role_id FROM user_roles WHERE role_name = ?");
    $stmt->execute([$roleType]);
    $roleRow = $stmt->fetch();

    if (!$roleRow) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid role type.']);
        exit;
    }

    $roleId = (int)$roleRow['role_id'];

    // Email zaten var mı?
    $stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email is already in use.']);
        exit;
    }

    // ---- Transaction başlat ----
    $pdo->beginTransaction();

    // Şifreyi hash'le
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    // Verification token oluştur (24 saat geçerli)
    $verificationToken = bin2hex(random_bytes(32));
    $tokenExpiry = date('Y-m-d H:i:s', strtotime('+24 hours'));

    // Kullanıcı kaydı
    $stmt = $pdo->prepare("
        INSERT INTO users 
            (email, password_hash, role_id, is_active, is_email_verified, 
             email_verification_token, email_verification_token_expiry)
        VALUES (?, ?, ?, 1, 0, ?, ?)
    ");
    $stmt->execute([$email, $passwordHash, $roleId, $verificationToken, $tokenExpiry]);

    $userId = (int)$pdo->lastInsertId();

    // The id of the row written below. An avatar is keyed by users.user_id for
    // a parent, expert or builder, but by mini_profiles.mini_id for a Mini, so
    // the caller is told the profile id as well and does not have to guess.
    $profileId = 0;

    // ---- Role göre profil tablosuna ekle ----
    $sendParentEmail = false;
    $childName = '';
    $childEmail = '';

    if ($roleType === 'parent') {

        $stmt = $pdo->prepare("
            INSERT INTO parent_profiles (full_name, user_id)
            VALUES (?, ?)
        ");
        $stmt->execute([$fullName, $userId]);
        $profileId = (int) $pdo->lastInsertId();

    } elseif ($roleType === 'builder') {

        if ($username === '' || $ageGroup === '') {
            throw new Exception('Builder account requires username and age_range.');
        }

        $stmt = $pdo->prepare("
            INSERT INTO builder_profiles (full_name, username, age_range, user_id)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$fullName, $username, $ageGroup, $userId]);
        $profileId = (int) $pdo->lastInsertId();

    } elseif ($roleType === 'child') {

        if ($parentEmail === '' || $ageGroup === '') {
            throw new Exception('Child account requires parent_email and age_range.');
        }

        $stmt = $pdo->prepare("
            INSERT INTO mini_profiles 
                (mini_name, age_range, email, parent_email, user_id, parent_approval_status)
            VALUES (?, ?, ?, ?, ?, 'pending')
        ");
        $stmt->execute([$fullName, $ageGroup, $email, $parentEmail, $userId]);
        $profileId = (int) $pdo->lastInsertId();

        // Parent'a email gönderilecek
        $sendParentEmail = true;
        $childName = $fullName;
        $childEmail = $email;

    } elseif ($roleType === 'expert') {

        if ($username === '' || $organization === '') {
            throw new Exception('Expert account requires username and organization.');
        }

        $stmt = $pdo->prepare("
            INSERT INTO expert_profiles (full_name, username, organization, user_id)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$fullName, $username, $organization, $userId]);
        $profileId = (int) $pdo->lastInsertId();
    }

    $pdo->commit();

    // ---- Email gönder ----
    $emailHandler = new EmailHandler();
    $verificationEmailSent = false;
    $parentEmailSent = false;

    // 1. Verification email gönder (tüm roller için)
    try {
        $verificationEmailSent = $emailHandler->sendVerificationEmail(
            $email,
            $verificationToken,
            $fullName
        );
    } catch (Exception $e) {
        error_log("Verification email send failed: " . $e->getMessage());
    }

    // 2. Child ise parent'a approval email gönder
    if ($sendParentEmail) {
        try {
            $parentEmailSent = $emailHandler->sendParentApprovalEmail(
                $parentEmail,
                $childName,
                $childEmail
            );
        } catch (Exception $e) {
            error_log("Parent approval email send failed: " . $e->getMessage());
        }
    }

    // ---- Response ----
    $response = [
        'success' => true,
        'message' => 'User registered successfully.',
        'user' => [
            'user_id'    => $userId,
            'email'      => $email,
            'role_type'  => $roleType,
            'profile_id' => $profileId,
            // The id to save an avatar against, already resolved per role.
            'avatar_id'  => $roleType === 'child' ? $profileId : $userId,
        ],
        'verification_email_sent' => $verificationEmailSent,
    ];

    if ($roleType === 'child') {
        $response['parent_email_sent'] = $parentEmailSent;
        $response['parent_email'] = $parentEmail;
        $response['requires_parent_approval'] = true;
    }

    http_response_code(200);
    echo json_encode($response);

} catch (Throwable $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    // Sunucu loguna da yaz
    error_log('REGISTER ERROR: ' . $e->getMessage());

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error during registration.',
        'error'   => $e->getMessage(),
    ]);
}