<?php
/**
 * Save Mini Customization API
 * Mini özelleştirildiğinde çağrılır
 * - customized_minis tablosuna kayıt ekler
 * - mini_creation_brick verir
 * 
 * POST /mini/save-customization.php
 * Body: { mini_id, scene_id?, character_type, levels_used?, customization_data? }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

date_default_timezone_set('Europe/Istanbul');
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../rewards/reward-triggers.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $mini_id = isset($input['mini_id']) ? intval($input['mini_id']) : 0;
    $scene_id = isset($input['scene_id']) ? intval($input['scene_id']) : null;
    $character_type = isset($input['character_type']) ? trim($input['character_type']) : 'male';
    $levels_used = isset($input['levels_used']) ? trim($input['levels_used']) : null;
    $customization_data = isset($input['customization_data']) ? json_encode($input['customization_data']) : null;
    
    if (!$mini_id) {
        throw new Exception('mini_id is required');
    }
    
    // Karakter tipi validasyonu
    $validTypes = ['female', 'male', 'child'];
    if (!in_array($character_type, $validTypes)) {
        $character_type = 'male';
    }
    
    // Display order bul
    $stmt = $pdo->prepare("SELECT MAX(display_order) as max_order FROM customized_minis WHERE mini_id = ?");
    $stmt->execute([$mini_id]);
    $maxOrder = intval($stmt->fetch(PDO::FETCH_ASSOC)['max_order'] ?? 0);
    $newOrder = $maxOrder + 1;
    
    // Customization kaydet
    $stmt = $pdo->prepare("INSERT INTO customized_minis 
                           (mini_id, scene_id, character_type, levels_used, display_order, customization_data, created_at)
                           VALUES (?, ?, ?, ?, ?, ?, NOW())");
    $stmt->execute([$mini_id, $scene_id, $character_type, $levels_used, $newOrder, $customization_data]);
    $customization_id = $pdo->lastInsertId();
    
    // ✨ REWARD: mini_creation_brick ver
    $rewards = RewardTriggers::onMiniCustomization($pdo, $mini_id, $scene_id);
    
    // Güncel totals al
    $stmt = $pdo->prepare("SELECT total_bricks, total_medals, total_cups FROM mini_profiles WHERE mini_id = ?");
    $stmt->execute([$mini_id]);
    $totals = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'message' => 'Customization saved successfully',
        'customization_id' => intval($customization_id),
        'rewards_earned' => $rewards,
        'totals' => [
            'bricks' => intval($totals['total_bricks'] ?? 0),
            'medals' => intval($totals['total_medals'] ?? 0),
            'cups' => intval($totals['total_cups'] ?? 0)
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
