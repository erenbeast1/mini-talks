<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/db.php';
require_once 'check-conversions.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $mini_id = isset($input['mini_id']) ? intval($input['mini_id']) : 0;
    $parent_id = isset($input['parent_id']) ? intval($input['parent_id']) : 0;
    $brick_to_medal = isset($input['brick_to_medal']) ? intval($input['brick_to_medal']) : 10;
    $medal_to_cup = isset($input['medal_to_cup']) ? intval($input['medal_to_cup']) : 10;
    $daily_limit = isset($input['daily_limit']) ? intval($input['daily_limit']) : 0;
    
    if (!$mini_id) {
        throw new Exception('mini_id is required');
    }
    
    // Validasyon
    if (!in_array($brick_to_medal, [5, 10, 20])) $brick_to_medal = 10;
    if (!in_array($medal_to_cup, [5, 10, 20])) $medal_to_cup = 10;
    if (!in_array($daily_limit, [0, 3, 5])) $daily_limit = 0;
    
    // Eski ayarları kontrol et (rate değişti mi?)
    $stmt = $pdo->prepare("SELECT brick_to_medal, medal_to_cup FROM reward_settings WHERE mini_id = ?");
    $stmt->execute([$mini_id]);
    $oldSettings = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $rateChanged = !$oldSettings || 
                   intval($oldSettings['brick_to_medal']) !== $brick_to_medal ||
                   intval($oldSettings['medal_to_cup']) !== $medal_to_cup;
    
    // Upsert
    $stmt = $pdo->prepare("
        INSERT INTO reward_settings (mini_id, parent_id, brick_to_medal, medal_to_cup, daily_limit, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE 
            brick_to_medal = VALUES(brick_to_medal),
            medal_to_cup = VALUES(medal_to_cup),
            daily_limit = VALUES(daily_limit),
            updated_at = NOW()
    ");
    $stmt->execute([$mini_id, $parent_id, $brick_to_medal, $medal_to_cup, $daily_limit]);
    
    // ✅ Rate değiştiyse conversion'ları yeniden hesapla
    $conversionResult = null;
    if ($rateChanged) {
        $conversionResult = checkAndApplyConversions($pdo, $mini_id, true); // recalculate = true
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Settings saved successfully',
        'data' => [
            'brick_to_medal' => $brick_to_medal,
            'medal_to_cup' => $medal_to_cup,
            'daily_limit' => $daily_limit,
            'rate_changed' => $rateChanged,
            'totals' => $conversionResult ? $conversionResult['totals'] : null
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}