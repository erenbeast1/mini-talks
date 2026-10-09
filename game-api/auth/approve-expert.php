<?php
// auth/approve-expert.php
// Parent, Expert'in gönderdiği bağlantı isteğini onaylar veya reddeder
// (requested_by = 'expert' olan istekler için)
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
    $connection_id = $data['connection_id'] ?? null;
    $action = $data['action'] ?? null; // 'approve' or 'reject'

    // Validation
    if (!$parent_id || !$connection_id || !$action) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Parent ID, Connection ID, and Action are required'
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

    // Parent kontrolü
    $stmt = $pdo->prepare("
        SELECT u.user_id
        FROM users u
        JOIN user_roles r ON u.role_id = r.role_id
        WHERE u.user_id = ? AND r.role_name = 'parent'
    ");
    $stmt->execute([$parent_id]);
    
    if (!$stmt->fetch()) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid parent account'
        ]);
        exit;
    }

    // Connection'ı kontrol et
    $stmt = $pdo->prepare("
        SELECT 
            emc.connection_id,
            emc.expert_id,
            emc.mini_id,
            emc.parent_approval_status,
            emc.requested_by,
            ep.full_name as expert_name,
            mp.mini_name,
            mp.parent_id,
            u.email as expert_email
        FROM expert_mini_connections emc
        JOIN expert_profiles ep ON emc.expert_id = ep.expert_id
        JOIN users u ON ep.user_id = u.user_id
        JOIN mini_profiles mp ON emc.mini_id = mp.mini_id
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

    // Bu parent'ın mini'si mi?
    if ($connection['parent_id'] != $parent_id) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'You do not have permission to manage this connection'
        ]);
        exit;
    }

    // Bu istek Expert tarafından mı gönderilmiş?
    if ($connection['requested_by'] !== 'expert') {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'This request was not sent by an expert. Only expert-initiated requests can be approved by parents.'
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

    // TODO: Expert'e email bildirimi gönder

    $message = ($action === 'approve') 
        ? "Expert '{$connection['expert_name']}' has been approved to work with {$connection['mini_name']}"
        : "Expert request from '{$connection['expert_name']}' has been rejected";

    echo json_encode([
        'success' => true,
        'message' => $message,
        'data' => [
            'connection_id' => (int)$connection_id,
            'new_status' => $newStatus,
            'expert_name' => $connection['expert_name'],
            'mini_name' => $connection['mini_name']
        ]
    ]);

} catch (Throwable $e) {
    error_log('APPROVE EXPERT ERROR: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error'
    ]);
}
