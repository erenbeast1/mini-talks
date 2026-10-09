<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require_once '../config/db.php';

$mini_id = isset($_GET['mini_id']) ? intval($_GET['mini_id']) : 0;
$parent_id = isset($_GET['parent_id']) ? intval($_GET['parent_id']) : 0;

if (!$mini_id) {
    echo json_encode(['success' => false, 'error' => 'mini_id required']);
    exit;
}

try {
    global $pdo;
    
    // Get mission settings
    $stmt = $pdo->prepare("
        SELECT selected_mission_ids, custom_message, show_for 
        FROM mission_settings 
        WHERE mini_id = ? AND parent_id = ?
    ");
    $stmt->execute([$mini_id, $parent_id]);
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $selected_ids = [];
    $custom_message = '';
    $show_for = 'today';
    
    if ($settings) {
        $selected_ids = $settings['selected_mission_ids'] ? json_decode($settings['selected_mission_ids'], true) : [];
        $custom_message = $settings['custom_message'] ?? '';
        $show_for = $settings['show_for'] ?? 'today';
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'selected_ids' => $selected_ids,
            'custom_message' => $custom_message,
            'show_for' => $show_for
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
