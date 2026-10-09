<?php
// /minitalks-api/custommini/save-custom-mini.php
// Özelleştirilmiş mini figür kaydet (her zaman YENİ kayıt)

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

$mini_id = isset($input['mini_id']) ? intval($input['mini_id']) : 0;
$scene_id = isset($input['scene_id']) ? intval($input['scene_id']) : 0;
$character_type = isset($input['character_type']) ? $input['character_type'] : 'female';
$character_index = isset($input['character_index']) ? intval($input['character_index']) : 1;
$customization_data = isset($input['customization_data']) ? $input['customization_data'] : [];
$screenshot_base64 = isset($input['screenshot']) ? $input['screenshot'] : null;

if (!$mini_id || !$scene_id) {
    echo json_encode(['success' => false, 'error' => 'mini_id and scene_id required']);
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
            $filename = "mini_{$mini_id}_scene_{$scene_id}_char_{$character_index}_{$unique_id}.png";
            $upload_dir = __DIR__ . '/../uploads/customminis/';
            
            if (!is_dir($upload_dir)) {
                mkdir($upload_dir, 0755, true);
            }
            
            $filepath = $upload_dir . $filename;
            
            if (file_put_contents($filepath, $image_data)) {
                $image_url = "https://mini-talks.org/minitalks-api/uploads/customminis/" . $filename;
            }
        }
    }
    
    // 2. HER ZAMAN YENİ KAYIT OLUŞTUR
    $customization_data['character_index'] = $character_index;
    $customization_json = json_encode($customization_data);
    
    // Max display_order bul
    $orderStmt = $pdo->prepare("SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM customized_minis WHERE mini_id = ?");
    $orderStmt->execute([$mini_id]);
    $nextOrder = $orderStmt->fetch()['next_order'];
    
    $insertStmt = $pdo->prepare("
        INSERT INTO customized_minis (mini_id, scene_id, character_type, customization_data, image_url, display_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    ");
    $insertStmt->execute([$mini_id, $scene_id, $character_type, $customization_json, $image_url, $nextOrder]);
    $custom_mini_id = $pdo->lastInsertId();
    
    // 3. mini_scene_levels tablosunda minis_customized güncelle
    $countStmt = $pdo->prepare("SELECT COUNT(*) as cnt FROM customized_minis WHERE mini_id = ? AND scene_id = ?");
    $countStmt->execute([$mini_id, $scene_id]);
    $customizedCount = $countStmt->fetch()['cnt'];
    
    $levelsStmt = $pdo->query("SELECT level_id FROM levels");
    $levels = $levelsStmt->fetchAll(PDO::FETCH_COLUMN);
    
    foreach ($levels as $level_id) {
        $updateLevelStmt = $pdo->prepare("
            INSERT INTO mini_scene_levels (mini_id, scene_id, level_id, minis_customized)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE minis_customized = ?, updated_at = NOW()
        ");
        $updateLevelStmt->execute([$mini_id, $scene_id, $level_id, $customizedCount, $customizedCount]);
    }
    
    // 4. Ödül ver (mini_creation_brick) - her yeni kayıtta
    $rewardStmt = $pdo->prepare("
        INSERT INTO mini_rewards (mini_id, reward_type, reward_category, scene_id, notes, earned_at)
        VALUES (?, 'mini_creation_brick', 'brick', ?, ?, NOW())
    ");
    $notes = "Customized {$character_type} character #{$character_index} for scene {$scene_id}";
    $rewardStmt->execute([$mini_id, $scene_id, $notes]);
    
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