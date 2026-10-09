<?php
// /minitalks-api/missions/get-missions.php
// MissionsManager için - mini'nin mission ayarlarını döndürür
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

date_default_timezone_set('Europe/Istanbul');
require_once '../config/db.php';

try {
    $mini_id = isset($_GET['mini_id']) ? intval($_GET['mini_id']) : 0;
    $parent_id = isset($_GET['parent_id']) ? intval($_GET['parent_id']) : 0;
    
    if ($mini_id === 0) {
        throw new Exception('mini_id is required');
    }
    
    // Mini'nin mission ayarlarını çek (sadece mini_id bazlı)
    $selectedIds = [];
    $customMessage = '';
    $showFor = 'today';
    
    try {
        $stmt = $pdo->prepare("SELECT selected_mission_ids, custom_message, show_for 
                               FROM mission_settings 
                               WHERE mini_id = ? 
                               ORDER BY updated_at DESC LIMIT 1");
        $stmt->execute([$mini_id]);
        $settings = $stmt->fetch();
        
        if ($settings) {
            $selectedIds = json_decode($settings['selected_mission_ids'], true) ?: [];
            $selectedIds = array_map('intval', $selectedIds);
            $customMessage = $settings['custom_message'] ?: '';
            $showFor = $settings['show_for'] ?: 'today';
        }
    } catch (Exception $e) {}
    
    echo json_encode([
        'success' => true,
        'data' => [
            'selected_ids' => $selectedIds,
            'custom_message' => $customMessage,
            'show_for' => $showFor
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
