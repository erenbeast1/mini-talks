<?php
// update-mini.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

require_once '../config/db.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $mini_id = isset($input['mini_id']) ? intval($input['mini_id']) : 0;
    $mini_name = isset($input['mini_name']) ? trim($input['mini_name']) : '';
    
    if (!$mini_id) {
        echo json_encode(['success' => false, 'error' => 'mini_id required']);
        exit;
    }
    
    if (empty($mini_name)) {
        echo json_encode(['success' => false, 'error' => 'mini_name required']);
        exit;
    }
    
    $stmt = $pdo->prepare("UPDATE mini_profiles SET mini_name = ?, updated_at = NOW() WHERE mini_id = ?");
    $result = $stmt->execute([$mini_name, $mini_id]);
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => 'Mini name updated successfully',
            'mini_id' => $mini_id,
            'mini_name' => $mini_name
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to update']);
    }
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
