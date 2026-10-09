<?php
// /minitalks-api/mini/complete-mission.php
// Mission tamamlandığında çağrılır
// Hem mission_completions hem mission_assignments tablosunu günceller
// + mission_brick reward verir!
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

date_default_timezone_set('Europe/Istanbul');
require_once '../config/db.php';

// Reward Triggers include
require_once __DIR__ . '/../rewards/reward-triggers.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $mini_id = isset($input['mini_id']) ? intval($input['mini_id']) : 0;
    $mission_id = isset($input['mission_id']) ? intval($input['mission_id']) : 0;
    $is_custom = isset($input['is_custom']) ? (bool)$input['is_custom'] : false;
    $mission_text = isset($input['mission_text']) ? trim($input['mission_text']) : null;
    
    if ($mini_id === 0) {
        throw new Exception('mini_id is required');
    }
    
    $today = date('Y-m-d');
    $now = date('Y-m-d H:i:s');
    
    // 1. mission_assignments tablosunu güncelle
    if ($is_custom) {
        // Custom mission için mission_id=0 ve is_custom=true
        $stmt = $pdo->prepare("UPDATE mission_assignments 
                               SET is_completed = TRUE, completed_at = ? 
                               WHERE mini_id = ? AND assigned_date = ? AND is_custom = TRUE AND is_completed = FALSE");
        $stmt->execute([$now, $mini_id, $today]);
        $updated = $stmt->rowCount();
    } else {
        // Normal preset mission
        $stmt = $pdo->prepare("UPDATE mission_assignments 
                               SET is_completed = TRUE, completed_at = ? 
                               WHERE mini_id = ? AND mission_id = ? AND assigned_date = ? AND is_completed = FALSE");
        $stmt->execute([$now, $mini_id, $mission_id, $today]);
        $updated = $stmt->rowCount();
    }
    
    // 2. mission_completions tablosuna da ekle (geriye dönük uyumluluk için)
    if (!$is_custom && $mission_id > 0) {
        $stmt = $pdo->prepare("SELECT id FROM mission_completions 
                               WHERE mini_id = ? AND mission_id = ? AND DATE(completed_at) = ?");
        $stmt->execute([$mini_id, $mission_id, $today]);
        
        if (!$stmt->fetch()) {
            $stmt = $pdo->prepare("INSERT INTO mission_completions 
                                   (mini_id, mission_id, completed_at) 
                                   VALUES (?, ?, ?)");
            $stmt->execute([$mini_id, $mission_id, $now]);
        }
    }
    
    // 3. ✨ REWARD: Mission tamamlandıysa mission_brick ver
    $rewards = [];
    if ($updated > 0) {
        $rewards = RewardTriggers::onMissionComplete($pdo, $mini_id, $mission_text);
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Mission completed successfully',
        'rewards_earned' => $rewards
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
