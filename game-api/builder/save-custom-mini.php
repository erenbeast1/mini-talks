<?php
// /minitalks-api/builder/save-custom-mini.php
// Builder için özelleştirilmiş mini figür kaydet (her zaman YENİ kayıt - Mini ile aynı mantık)

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../config/db.php';

$input = json_decode(file_get_contents('php://input'), true);

$builder_id = isset($input['builder_id']) ? intval($input['builder_id']) : 0;
$scene_id = isset($input['scene_id']) ? intval($input['scene_id']) : 0;
$character_type = isset($input['character_type']) ? $input['character_type'] : 'female';
$character_index = isset($input['character_index']) ? intval($input['character_index']) : 1;
$customization_data = isset($input['customization_data']) ? $input['customization_data'] : [];
$screenshot_base64 = isset($input['screenshot']) ? $input['screenshot'] : null;

if (!$builder_id || !$scene_id) {
    echo json_encode(['success' => false, 'error' => 'builder_id and scene_id required']);
    exit;
}

try {
    $pdo->beginTransaction();
    
    // 1. Screenshot'ı kaydet (varsa)
    $image_url = null;
    if ($screenshot_base64) {
        $image_parts = explode(";base64,", $screenshot_base64);
        if (count($image_parts) == 2) {
            $image_data = base64_decode($image_parts[1]);
            
            // Unique dosya adı - timestamp + random
            $unique_id = time() . '_' . substr(md5(uniqid()), 0, 8);
            $filename = "builder_{$builder_id}_scene_{$scene_id}_char_{$character_index}_{$unique_id}.png";
            $upload_dir = __DIR__ . '/../uploads/builderminis/';
            
            if (!is_dir($upload_dir)) {
                mkdir($upload_dir, 0755, true);
            }
            
            $filepath = $upload_dir . $filename;
            
            if (file_put_contents($filepath, $image_data)) {
                $image_url = "https://mini-talks.org/minitalks-api/uploads/builderminis/" . $filename;
            }
        }
    }
    
    // 2. HER ZAMAN YENİ KAYIT OLUŞTUR (Mini ile aynı mantık)
    $customization_data['character_index'] = $character_index;
    $customization_json = json_encode($customization_data);
    
    // Max display_order bul
    $orderStmt = $pdo->prepare("SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM builder_customized_minis WHERE builder_id = ?");
    $orderStmt->execute([$builder_id]);
    $nextOrder = $orderStmt->fetch()['next_order'];
    
    $insertStmt = $pdo->prepare("
        INSERT INTO builder_customized_minis (builder_id, scene_id, character_type, customization_data, image_url, display_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    ");
    $insertStmt->execute([$builder_id, $scene_id, $character_type, $customization_json, $image_url, $nextOrder]);
    $custom_mini_id = $pdo->lastInsertId();
    
    // 3. Ödül ver - her yeni kayıtta brick
    // builder_rewards_log'a detay ekle
    $rewardLogStmt = $pdo->prepare("
        INSERT INTO builder_rewards_log (builder_id, reward_type, reward_name, reward_amount, earned_at)
        VALUES (?, 'brick', 'mini_creation_brick', 1, NOW())
    ");
    $rewardLogStmt->execute([$builder_id]);
    
    // builder_rewards tablosunda toplam güncelle
    $updateRewardsStmt = $pdo->prepare("
        INSERT INTO builder_rewards (builder_id, total_bricks, total_medals, total_cups, updated_at)
        VALUES (?, 1, 0, 0, NOW())
        ON DUPLICATE KEY UPDATE total_bricks = total_bricks + 1, updated_at = NOW()
    ");
    $updateRewardsStmt->execute([$builder_id]);
    
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'custom_mini_id' => $custom_mini_id,
        'image_url' => $image_url,
        'reward_given' => true,
        'display_order' => $nextOrder
    ]);
    
} catch (PDOException $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}