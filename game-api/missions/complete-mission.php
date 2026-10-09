<?php
// /minitalks-api/missions/complete-mission.php
// Mission tamamlandığında çağrılır
// Hem mission_completions hem mission_assignments tablosunu günceller
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

date_default_timezone_set('Europe/Istanbul');
require_once '../config/db.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $mini_id = isset($input['mini_id']) ? intval($input['mini_id']) : 0;
    $mission_id = isset($input['mission_id']) ? intval($input['mission_id']) : 0;
    $is_custom = isset($input['is_custom']) ? (bool)$input['is_custom'] : false;
    
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
                               WHERE mini_id = ? AND assigned_date = ? AND is_custom = TRUE");
        $stmt->execute([$now, $mini_id, $today]);
    } else {
        // Normal preset mission
        $stmt = $pdo->prepare("UPDATE mission_assignments 
                               SET is_completed = TRUE, completed_at = ? 
                               WHERE mini_id = ? AND mission_id = ? AND assigned_date = ?");
        $stmt->execute([$now, $mini_id, $mission_id, $today]);
    }
    
    // 2. Write to mission_completions as well (kept for backward compatibility)
    if (!$is_custom && $mission_id > 0) {
        // Look first: is it already there?
        $stmt = $pdo->prepare("SELECT id FROM mission_completions 
                               WHERE mini_id = ? AND mission_id = ? AND DATE(completed_at) = ?");
        $stmt->execute([$mini_id, $mission_id, $today]);
        
        if (!$stmt->fetch()) {
            // If not, insert it
            $stmt = $pdo->prepare("INSERT INTO mission_completions 
                                   (mini_id, mission_id, completed_at) 
                                   VALUES (?, ?, ?)");
            $stmt->execute([$mini_id, $mission_id, $now]);
        }
    }
    
    // 3. Mission brick reward ver
    $missionText = isset($input['mission_text']) ? $input['mission_text'] : 'Mission';
    $rewardStmt = $pdo->prepare("
        INSERT INTO mini_rewards (mini_id, reward_type, reward_category, earned_at, notes)
        VALUES (?, 'mission_brick', 'brick', NOW(), ?)
    ");
    $rewardStmt->execute([$mini_id, 'Mission completed: ' . $missionText]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Mission completed successfully',
        'reward_given' => true
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>