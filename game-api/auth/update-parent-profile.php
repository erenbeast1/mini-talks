<?php
// /minitalks-api/auth/update-parent-profile.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/db.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $parent_id = isset($input['parent_id']) ? intval($input['parent_id']) : 0;
    $user_id = isset($input['user_id']) ? intval($input['user_id']) : 0;
    $full_name = isset($input['full_name']) ? trim($input['full_name']) : '';
    
    if (!$parent_id && !$user_id) {
        echo json_encode(['success' => false, 'error' => 'parent_id or user_id required']);
        exit;
    }
    
    if (empty($full_name)) {
        echo json_encode(['success' => false, 'error' => 'full_name required']);
        exit;
    }
    
    // parent_id varsa parent_profiles tablosunu güncelle
    if ($parent_id) {
        $stmt = $pdo->prepare("UPDATE parent_profiles SET full_name = ?, updated_at = NOW() WHERE parent_id = ?");
        $result = $stmt->execute([$full_name, $parent_id]);
    } else {
        // user_id ile parent_profiles tablosunu güncelle
        $stmt = $pdo->prepare("UPDATE parent_profiles SET full_name = ?, updated_at = NOW() WHERE user_id = ?");
        $result = $stmt->execute([$full_name, $user_id]);
    }
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => 'Profile updated successfully',
            'full_name' => $full_name
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to update']);
    }
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
