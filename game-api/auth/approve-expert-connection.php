<?php
// auth/approve-expert-connection.php
// Expert, Parent'ın gönderdiği bağlantı isteğini onaylar veya reddeder
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

    $expert_user_id = $data['expert_id'] ?? null;  // user_id olarak geliyor
    $connection_id = $data['connection_id'] ?? null;
    $action = $data['action'] ?? null; // 'approve' or 'reject'

    // Validation
    if (!$expert_user_id || !$connection_id || !$action) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Expert ID, Connection ID, and Action are required'
        ]);
        exit;
    }

    if (!in_array($action, ['approve', 'reject'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Action must be "approve" or "reject"'
        ]);
        exit;
    }

    // Expert profile'ı bul
    $stmt = $pdo->prepare("
        SELECT ep.expert_id, ep.full_name
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

    // Connection'ın bu expert'e ait olup olmadığını kontrol et
    $stmt = $pdo->prepare("
        SELECT 
            emc.connection_id,
            emc.expert_id,
            emc.mini_id,
            emc.parent_approval_status,
            mp.mini_name,
            pp.full_name as parent_name,
            u.email as parent_email
        FROM expert_mini_connections emc
        JOIN mini_profiles mp ON emc.mini_id = mp.mini_id
        JOIN users parent_user ON mp.parent_id = parent_user.user_id
        LEFT JOIN parent_profiles pp ON parent_user.user_id = pp.user_id
        LEFT JOIN users u ON mp.parent_id = u.user_id
        WHERE emc.connection_id = ?
    ");
    $stmt->execute([$connection_id]);
    $connection = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$connection) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Connection not found'
        ]);
        exit;
    }

    // Bu expert'in bağlantısı mı?
    if ($connection['expert_id'] != $expert['expert_id']) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'You do not have permission to manage this connection'
        ]);
        exit;
    }

    // Zaten işlenmiş mi?
    if ($connection['parent_approval_status'] !== 'pending') {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'This request has already been ' . $connection['parent_approval_status']
        ]);
        exit;
    }

    // Status'u güncelle
    $newStatus = ($action === 'approve') ? 'approved' : 'rejected';
    
    $stmt = $pdo->prepare("
        UPDATE expert_mini_connections 
        SET 
            parent_approval_status = ?,
            parent_approval_date = NOW()
        WHERE connection_id = ?
    ");
    $stmt->execute([$newStatus, $connection_id]);

    // TODO: Parent'a email bildirimi gönder (onay/red durumuna göre)

    $message = ($action === 'approve') 
        ? "You are now connected with {$connection['mini_name']}!"
        : "Connection request for {$connection['mini_name']} has been declined.";

    echo json_encode([
        'success' => true,
        'message' => $message,
        'data' => [
            'connection_id' => (int)$connection_id,
            'new_status' => $newStatus,
            'mini_name' => $connection['mini_name'],
            'parent_name' => $connection['parent_name']
        ]
    ]);

} catch (Throwable $e) {
    error_log('APPROVE EXPERT CONNECTION ERROR: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error'
    ]);
}
