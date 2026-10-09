<?php
// auth/delete-expert-connection.php
// Expert veya Parent bağlantıyı silebilir
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

    $user_id = $data['user_id'] ?? null;
    $connection_id = $data['connection_id'] ?? null;
    $role = $data['role'] ?? null; // 'expert' or 'parent'

    // Validation
    if (!$user_id || !$connection_id || !$role) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'User ID, Connection ID, and Role are required'
        ]);
        exit;
    }

    if (!in_array($role, ['expert', 'parent'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Role must be "expert" or "parent"'
        ]);
        exit;
    }

    // Connection bilgilerini çek
    $stmt = $pdo->prepare("
        SELECT 
            emc.connection_id,
            emc.expert_id,
            emc.mini_id,
            ep.user_id as expert_user_id,
            ep.full_name as expert_name,
            mp.mini_name,
            mp.parent_id
        FROM expert_mini_connections emc
        JOIN expert_profiles ep ON emc.expert_id = ep.expert_id
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

    // Yetki kontrolü
    $hasPermission = false;
    
    if ($role === 'expert' && $connection['expert_user_id'] == $user_id) {
        $hasPermission = true;
    } elseif ($role === 'parent' && $connection['parent_id'] == $user_id) {
        $hasPermission = true;
    }

    if (!$hasPermission) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'You do not have permission to delete this connection'
        ]);
        exit;
    }

    // Bağlantıyı sil
    $stmt = $pdo->prepare("DELETE FROM expert_mini_connections WHERE connection_id = ?");
    $stmt->execute([$connection_id]);

    $message = ($role === 'expert')
        ? "Connection with {$connection['mini_name']} has been removed."
        : "Expert {$connection['expert_name']} has been disconnected from {$connection['mini_name']}.";

    echo json_encode([
        'success' => true,
        'message' => $message,
        'data' => [
            'connection_id' => (int)$connection_id,
            'mini_name' => $connection['mini_name'],
            'expert_name' => $connection['expert_name']
        ]
    ]);

} catch (Throwable $e) {
    error_log('DELETE EXPERT CONNECTION ERROR: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error'
    ]);
}
