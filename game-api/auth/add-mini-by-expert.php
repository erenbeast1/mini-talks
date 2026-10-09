<?php
// auth/add-mini-by-expert.php
// Expert, bir veya birden fazla mini'ye bağlanmak için istek gönderir
// Parent hesabı varsa: Dashboard'dan onay
// Parent hesabı yoksa: Email'den onay (token ile)
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
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

    $expert_user_id = $data['expert_id'] ?? null;
    $parent_email = trim($data['parent_email'] ?? '');
    
    // mini_names array veya tekil string olabilir
    $mini_names = $data['mini_names'] ?? $data['mini_name'] ?? null;
    if (is_string($mini_names) && !empty($mini_names)) {
        $mini_names = [$mini_names];
    } elseif (!is_array($mini_names)) {
        $mini_names = [];
    }

    // Validation
    if (!$expert_user_id || !$parent_email) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Expert ID and Parent email are required'
        ]);
        exit;
    }

    // Expert profile'ı bul
    $stmt = $pdo->prepare("
        SELECT ep.expert_id, ep.full_name, ep.organization, u.email as expert_email
        FROM expert_profiles ep
        JOIN users u ON ep.user_id = u.user_id
        JOIN user_roles r ON u.role_id = r.role_id
        WHERE ep.user_id = ? AND r.role_name = 'expert'
    ");
    $stmt->execute([$expert_user_id]);
    $expert = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$expert) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid expert account'
        ]);
        exit;
    }

    // Parent'ı users tablosunda ara
    $stmt = $pdo->prepare("
        SELECT u.user_id, u.email, pp.full_name as parent_name
        FROM users u
        JOIN user_roles r ON u.role_id = r.role_id
        LEFT JOIN parent_profiles pp ON u.user_id = pp.user_id
        WHERE u.email = ? AND r.role_name = 'parent'
    ");
    $stmt->execute([$parent_email]);
    $parentUser = $stmt->fetch(PDO::FETCH_ASSOC);

    $hasParentAccount = !empty($parentUser);
    $parentName = $parentUser['parent_name'] ?? null;

    // Mini'leri bul
    if ($hasParentAccount) {
        // Parent hesabı var - parent_id ile ara
        $stmt = $pdo->prepare("
            SELECT mini_id, mini_name, age_range, parent_email
            FROM mini_profiles
            WHERE parent_id = ? AND parent_approval_status = 'approved'
            ORDER BY mini_name ASC
        ");
        $stmt->execute([$parentUser['user_id']]);
    } else {
        // Parent hesabı yok - parent_email ile ara
        $stmt = $pdo->prepare("
            SELECT mini_id, mini_name, age_range, parent_email
            FROM mini_profiles
            WHERE parent_email = ? AND parent_approval_status = 'approved'
            ORDER BY mini_name ASC
        ");
        $stmt->execute([$parent_email]);
    }
    
    $minis = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($minis)) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => $hasParentAccount 
                ? 'This parent has no approved Mini profiles yet.'
                : 'No Mini profiles found with this parent email.'
        ]);
        exit;
    }

    // Mini seçimi kontrolü
    if (empty($mini_names)) {
        // Hiç mini seçilmemiş - listeyi döndür
        if (count($minis) === 1) {
            // Tek mini var - otomatik seç ama yine de frontend'de göster
            $mini_names = [$minis[0]['mini_name']];
        } else {
            // Birden fazla mini - seçim gerekli
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Please select which Mini(s) you want to connect with.',
                'data' => [
                    'available_minis' => $minis,
                    'has_parent_account' => $hasParentAccount
                ]
            ]);
            exit;
        }
    }

    // Seçilen minileri doğrula
    $selectedMinis = [];
    foreach ($mini_names as $miniName) {
        foreach ($minis as $mini) {
            if (strtolower($mini['mini_name']) === strtolower(trim($miniName))) {
                $selectedMinis[] = $mini;
                break;
            }
        }
    }

    if (empty($selectedMinis)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'None of the selected Minis were found.',
            'data' => [
                'available_minis' => $minis
            ]
        ]);
        exit;
    }

    // Her seçilen mini için bağlantı oluştur
    $createdConnections = [];
    $skippedConnections = [];
    $emailSent = false;

    foreach ($selectedMinis as $mini) {
        // Zaten bağlantı var mı?
        $stmt = $pdo->prepare("
            SELECT connection_id, parent_approval_status, requested_by
            FROM expert_mini_connections
            WHERE expert_id = ? AND mini_id = ?
        ");
        $stmt->execute([$expert['expert_id'], $mini['mini_id']]);
        $existingConnection = $stmt->fetch();

        if ($existingConnection) {
            $status = $existingConnection['parent_approval_status'];
            $requestedBy = $existingConnection['requested_by'] ?? 'unknown';
            
            $skippedConnections[] = [
                'mini_name' => $mini['mini_name'],
                'reason' => match($status) {
                    'approved' => 'Already connected',
                    'pending' => $requestedBy === 'expert' ? 'Request already pending' : 'Parent already sent you a request',
                    'rejected' => 'Previous request was rejected',
                    default => 'Connection exists'
                }
            ];
            continue;
        }

        // Token oluştur (parent hesabı yoksa kullanılacak)
        $token = null;
        $tokenExpires = null;
        
        if (!$hasParentAccount) {
            $token = bin2hex(random_bytes(32));
            $tokenExpires = date('Y-m-d H:i:s', strtotime('+7 days'));
        }

        // Yeni bağlantı oluştur
        $stmt = $pdo->prepare("
            INSERT INTO expert_mini_connections 
                (expert_id, mini_id, requested_by, parent_approval_status, approval_token, approval_token_expires, created_at)
            VALUES (?, ?, 'expert', 'pending', ?, ?, NOW())
        ");
        $stmt->execute([
            $expert['expert_id'], 
            $mini['mini_id'],
            $token,
            $tokenExpires
        ]);
        
        $connection_id = (int)$pdo->lastInsertId();

        $createdConnections[] = [
            'connection_id' => $connection_id,
            'mini_name' => $mini['mini_name'],
            'mini_id' => $mini['mini_id'],
            'token' => $token
        ];
    }

    // Email gönder
    if (!empty($createdConnections)) {
        try {
            $emailHandler = new EmailHandler();
            
            if ($hasParentAccount) {
                // Normal email - dashboard'dan onay
                $miniNamesList = implode(', ', array_column($createdConnections, 'mini_name'));
                $emailSent = $emailHandler->sendExpertConnectionRequestEmail(
                    $parent_email,
                    $parentName ?? 'Parent',
                    $expert['full_name'],
                    $expert['organization'] ?? '',
                    $miniNamesList
                );
            } else {
                // Token'lı email - email'den onay
                // İlk bağlantının token'ını kullan (aynı email'e gidecek)
                $firstToken = $createdConnections[0]['token'];
                $miniNamesList = implode(', ', array_column($createdConnections, 'mini_name'));
                
                $emailSent = $emailHandler->sendExpertConnectionRequestWithTokenEmail(
                    $parent_email,
                    $expert['full_name'],
                    $expert['organization'] ?? '',
                    $miniNamesList,
                    $firstToken
                );
            }
        } catch (Throwable $emailError) {
            error_log('EMAIL ERROR: ' . $emailError->getMessage());
        }
    }

    // Sonuç
    if (empty($createdConnections) && !empty($skippedConnections)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'All selected Minis already have connections.',
            'data' => [
                'skipped' => $skippedConnections
            ]
        ]);
        exit;
    }

    $message = $hasParentAccount
        ? 'Connection request sent to parent. Waiting for their approval.'
        : 'Connection request sent! An approval email has been sent to the parent.';

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => $message,
        'data' => [
            'created_connections' => count($createdConnections),
            'skipped_connections' => count($skippedConnections),
            'minis' => array_column($createdConnections, 'mini_name'),
            'skipped' => $skippedConnections,
            'parent_email' => $parent_email,
            'has_parent_account' => $hasParentAccount,
            'email_sent' => $emailSent
        ]
    ]);

} catch (Throwable $e) {
    error_log('ADD MINI BY EXPERT ERROR: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
