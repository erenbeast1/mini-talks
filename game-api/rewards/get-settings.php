<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/db.php';
require_once 'check-conversions.php';

try {
    $mini_id = isset($_GET['mini_id']) ? intval($_GET['mini_id']) : 0;
    
    if (!$mini_id) {
        throw new Exception('mini_id is required');
    }
    
    // ✅ Dashboard açılınca conversion kontrolü yap (güncel data için)
    $conversionResult = checkAndApplyConversions($pdo, $mini_id, false);
    
    $stmt = $pdo->prepare("SELECT brick_to_medal, medal_to_cup, daily_limit FROM reward_settings WHERE mini_id = ?");
    $stmt->execute([$mini_id]);
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'brick_to_medal' => $settings ? intval($settings['brick_to_medal']) : 10,
            'medal_to_cup' => $settings ? intval($settings['medal_to_cup']) : 10,
            'daily_limit' => $settings ? intval($settings['daily_limit']) : 0,
            'totals' => $conversionResult['totals'],
            'earned' => $conversionResult['earned']
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}