<?php
// /minitalks-api/custommini/update-mini.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/db.php';

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $mini_id = isset($data['mini_id']) ? intval($data['mini_id']) : 0;
    $custom_mini_id = isset($data['custom_mini_id']) ? intval($data['custom_mini_id']) : 0;
    $action = isset($data['action']) ? $data['action'] : '';
    
    if ($mini_id === 0 || $custom_mini_id === 0) {
        throw new Exception('mini_id and custom_mini_id required');
    }
    
    try {
        switch ($action) {
            case 'delete':
                $stmt = $pdo->prepare("DELETE FROM customized_minis WHERE id = ? AND mini_id = ?");
                $stmt->execute([$custom_mini_id, $mini_id]);
                break;
            case 'hide':
                $stmt = $pdo->prepare("UPDATE customized_minis SET is_hidden = 1 WHERE id = ? AND mini_id = ?");
                $stmt->execute([$custom_mini_id, $mini_id]);
                break;
            case 'unhide':
                $stmt = $pdo->prepare("UPDATE customized_minis SET is_hidden = 0 WHERE id = ? AND mini_id = ?");
                $stmt->execute([$custom_mini_id, $mini_id]);
                break;
            case 'update_order':
                $new_order = isset($data['display_order']) ? intval($data['display_order']) : 0;
                $stmt = $pdo->prepare("UPDATE customized_minis SET display_order = ? WHERE id = ? AND mini_id = ?");
                $stmt->execute([$new_order, $custom_mini_id, $mini_id]);
                break;
        }
    } catch (Exception $e) {
        // Tablo yoksa
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Updated successfully'
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
