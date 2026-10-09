<?php
// auth/add-expert.php
// Parent, Expert'e bağlantı isteği gönderir
// Expert onaylayana kadar pending kalır
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
    $mini_id = $data['mini_id'] ?? null;
    $expert_email = trim($data['expert_email'] ?? '');

    // Validation
    if (!$parent_id || !$mini_id || !$expert_email) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Parent ID, Mini ID, and Expert email are required'
        ]);
        exit;
    }

    // Parent kontrolü
    $stmt = $pdo->prepare("
        SELECT u.user_id, u.email
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

    // Mini'nin bu parent'a ait olup olmadığını kontrol et
    $stmt = $pdo->prepare("
        SELECT mini_id, mini_name
        FROM mini_profiles
        WHERE mini_id = ? AND parent_id = ?
    ");
    $stmt->execute([$mini_id, $parent_id]);
    $mini = $stmt->fetch();

    if (!$mini) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'You do not have permission to manage this Mini'
        ]);
        exit;
    }

    // Expert'i email ile bul
    $stmt = $pdo->prepare("
        SELECT u.user_id, ep.expert_id, ep.full_name
        FROM users u
        JOIN user_roles r ON u.role_id = r.role_id
        JOIN expert_profiles ep ON u.user_id = ep.user_id
        WHERE u.email = ? AND r.role_name = 'expert'
    ");
    $stmt->execute([$expert_email]);
    $expert = $stmt->fetch();

    if (!$expert) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Expert not found with this email'
        ]);
        exit;
    }

    // Zaten bağlantı var mı kontrol et
    $stmt = $pdo->prepare("
        SELECT connection_id, parent_approval_status, requested_by
        FROM expert_mini_connections
        WHERE expert_id = ? AND mini_id = ?
    ");
    $stmt->execute([$expert['expert_id'], $mini_id]);
    $existingConnection = $stmt->fetch();

    if ($existingConnection) {
        $status = $existingConnection['parent_approval_status'];
        $requestedBy = $existingConnection['requested_by'] ?? 'unknown';
        
        if ($status === 'approved') {
            $message = 'This expert is already connected with this Mini.';
        } elseif ($status === 'pending' && $requestedBy === 'parent') {
            $message = 'A connection request is already pending. Waiting for expert approval.';
        } elseif ($status === 'pending' && $requestedBy === 'expert') {
            $message = 'This expert has already sent you a request. Check your Expert Connection Requests.';
        } else {
            $message = 'Connection already exists with status: ' . $status;
        }
        
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => $message,
            'data' => [
                'status' => $status,
                'requested_by' => $requestedBy
            ]
        ]);
        exit;
    }

    // Yeni bağlantı oluştur
    // Parent istek gönderdiği için: requested_by = 'parent', parent_approval_status = 'pending' (Expert onaylayacak)
    $stmt = $pdo->prepare("
        INSERT INTO expert_mini_connections 
            (expert_id, mini_id, requested_by, parent_approval_status, created_at)
        VALUES (?, ?, 'parent', 'pending', NOW())
    ");
    $stmt->execute([$expert['expert_id'], $mini_id]);

    $connection_id = (int)$pdo->lastInsertId();

    // TODO: Expert'e bildirim email'i gönder

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Connection request sent to expert. Waiting for their approval.',
        'data' => [
            'connection_id' => $connection_id,
            'expert_name' => $expert['full_name'],
            'mini_name' => $mini['mini_name'],
            'status' => 'pending',
            'requested_by' => 'parent'
        ]
    ]);

} catch (Throwable $e) {
    error_log('ADD EXPERT ERROR: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error'
    ]);
}
