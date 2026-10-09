<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/db.php';

$input = json_decode(file_get_contents('php://input'), true);

$mini_id = isset($input['mini_id']) ? intval($input['mini_id']) : 0;
$parent_id = isset($input['parent_id']) ? intval($input['parent_id']) : 0;
$selected_ids = isset($input['selected_ids']) ? $input['selected_ids'] : [];
$custom_message = isset($input['custom_message']) ? trim($input['custom_message']) : '';
$show_for = isset($input['show_for']) ? $input['show_for'] : 'today';

if (!$mini_id || !$parent_id) {
    echo json_encode(['success' => false, 'error' => 'mini_id and parent_id required']);
    exit;
}

try {
    global $pdo;
    
    // Check if settings exist
    $stmt = $pdo->prepare("SELECT id FROM mission_settings WHERE mini_id = ? AND parent_id = ?");
    $stmt->execute([$mini_id, $parent_id]);
    $existing = $stmt->fetch();
    
    $selected_json = json_encode($selected_ids);
    
    if ($existing) {
        // Update
        $stmt = $pdo->prepare("
            UPDATE mission_settings 
            SET selected_mission_ids = ?, custom_message = ?, show_for = ?, updated_at = NOW()
            WHERE mini_id = ? AND parent_id = ?
        ");
        $stmt->execute([$selected_json, $custom_message, $show_for, $mini_id, $parent_id]);
    } else {
        // Insert
        $stmt = $pdo->prepare("
            INSERT INTO mission_settings (mini_id, parent_id, selected_mission_ids, custom_message, show_for)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([$mini_id, $parent_id, $selected_json, $custom_message, $show_for]);
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Settings saved successfully'
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
