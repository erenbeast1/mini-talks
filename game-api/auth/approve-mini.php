<?php
// auth/approve-mini.php
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
    $action = $data['action'] ?? ''; // 'approve' or 'reject'

    // Validation
    if (!$parent_id || !$mini_id || !in_array($action, ['approve', 'reject'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Parent ID, Mini ID, and valid action required'
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

    // Mini'yi al
    $stmt = $pdo->prepare("
        SELECT 
            mp.*,
            u.email as user_email
        FROM mini_profiles mp
        LEFT JOIN users u ON mp.user_id = u.user_id
        WHERE mp.mini_id = ?
    ");
    $stmt->execute([$mini_id]);
    $mini = $stmt->fetch();

    if (!$mini) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Mini not found'
        ]);
        exit;
    }

    // Bu parent'ın mini'si mi kontrol et
    if ($mini['parent_email'] !== $parent['email'] && $mini['parent_id'] != $parent_id) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'You do not have permission to approve/reject this Mini'
        ]);
        exit;
    }

    // Approval status güncelle
    $newStatus = $action === 'approve' ? 'approved' : 'rejected';
    
    $stmt = $pdo->prepare("
        UPDATE mini_profiles
        SET parent_approval_status = ?,
            parent_id = ?
        WHERE mini_id = ?
    ");
    $stmt->execute([$newStatus, $parent_id, $mini_id]);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => "Mini {$action}d successfully",
        'data' => [
            'mini_id' => $mini_id,
            'mini_name' => $mini['mini_name'],
            'status' => $newStatus
        ]
    ]);

} catch (Throwable $e) {
    error_log('APPROVE MINI ERROR: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error'
    ]);
}