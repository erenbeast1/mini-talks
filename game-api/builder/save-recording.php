<?php
// /minitalks-api/builder/save-recording.php
// Builder ses kaydını kaydet - Mini ile aynı mantık (character_index + mission check dahil)

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

date_default_timezone_set('Europe/Istanbul');
require_once '../config/db.php';

$input = json_decode(file_get_contents('php://input'), true);

$builder_id = isset($input['builder_id']) ? intval($input['builder_id']) : 0;
$scene_id = isset($input['scene_id']) ? intval($input['scene_id']) : 0;
$level_id = isset($input['level_id']) ? intval($input['level_id']) : 1;
$duration_seconds = isset($input['duration_seconds']) ? intval($input['duration_seconds']) : 0;
$character_index = isset($input['character_index']) ? intval($input['character_index']) : 1;
$talk_type = isset($input['talk_type']) ? $input['talk_type'] : null;

if (!$builder_id || !$scene_id || $duration_seconds <= 0) {
    echo json_encode(['success' => false, 'error' => 'builder_id, scene_id and duration required']);
    exit;
}

try {
    $pdo->beginTransaction();
    
    $today = date('Y-m-d');
    
    // character_index kolonu var mı kontrol et
    $hasCharIndex = false;
    try {
        $checkCol = $pdo->query("SHOW COLUMNS FROM builder_recordings LIKE 'character_index'");
        $hasCharIndex = $checkCol->rowCount() > 0;
    } catch (Exception $e) {
        $hasCharIndex = false;
    }
    
    // 1. Recording'i kaydet (builder_recordings tablosuna)
    if ($hasCharIndex) {
        $stmt = $pdo->prepare("
            INSERT INTO builder_recordings (builder_id, scene_id, level_id, duration_seconds, character_index, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$builder_id, $scene_id, $level_id, $duration_seconds, $character_index]);
    } else {
        $stmt = $pdo->prepare("
            INSERT INTO builder_recordings (builder_id, scene_id, level_id, duration_seconds, created_at)
            VALUES (?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$builder_id, $scene_id, $level_id, $duration_seconds]);
    }
    $recording_id = $pdo->lastInsertId();
    
    // 2. Ödül ver (recording_brick) - builder_rewards_log'a detaylı notes ile ekle
    $notes = "Recording for scene {$scene_id}, level {$level_id}, character {$character_index}, duration {$duration_seconds}s";
    
    $rewardLogStmt = $pdo->prepare("
        INSERT INTO builder_rewards_log (builder_id, reward_type, reward_name, reward_amount, notes, earned_at)
        VALUES (?, 'brick', 'recording_brick', 1, ?, NOW())
    ");
    $rewardLogStmt->execute([$builder_id, $notes]);
    
    // 3. builder_rewards tablosunda toplam güncelle
    $updateRewardsStmt = $pdo->prepare("
        INSERT INTO builder_rewards (builder_id, total_bricks, total_medals, total_cups, updated_at)
        VALUES (?, 1, 0, 0, NOW())
        ON DUPLICATE KEY UPDATE total_bricks = total_bricks + 1, updated_at = NOW()
    ");
    $updateRewardsStmt->execute([$builder_id]);
    
    $pdo->commit();
    
    // =============================================
    // 4. MİSSİON COMPLETİON KONTROLÜ
    // =============================================
    $completedMissions = [];
    
    try {
        // Bugünkü aktif (tamamlanmamış) builder mission'larını çek
        $missionStmt = $pdo->prepare("
            SELECT bm.mission_id, bm.mission_text, mp.trigger_type, mp.trigger_value
            FROM builder_missions bm
            LEFT JOIN mission_presets mp ON bm.mission_id = mp.id
            WHERE bm.builder_id = ? AND bm.mission_date = ? AND bm.is_completed = 0
        ");
        $missionStmt->execute([$builder_id, $today]);
        $activeMissions = $missionStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Bugünkü toplam kayıt sayısını çek
        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM builder_recordings WHERE builder_id = ? AND DATE(created_at) = ?");
        $countStmt->execute([$builder_id, $today]);
        $todayRecordCount = intval($countStmt->fetchColumn());
        
        foreach ($activeMissions as $mission) {
            $shouldComplete = false;
            $triggerType = $mission['trigger_type'] ?: 'record_any';
            $triggerValue = $mission['trigger_value'] ?: 1;
            
            switch ($triggerType) {
                case 'record_any':
                    $shouldComplete = true;
                    break;
                    
                case 'record_level':
                    if ($level_id == $triggerValue) {
                        $shouldComplete = true;
                    }
                    break;
                    
                case 'record_count':
                    if ($todayRecordCount >= $triggerValue) {
                        $shouldComplete = true;
                    }
                    break;
                    
                case 'record_new_scene':
                    $checkStmt = $pdo->prepare("
                        SELECT COUNT(*) FROM builder_recordings 
                        WHERE builder_id = ? AND scene_id = ? AND DATE(created_at) = ? AND recording_id != ?
                    ");
                    $checkStmt->execute([$builder_id, $scene_id, $today, $recording_id]);
                    if ($checkStmt->fetchColumn() == 0) {
                        $shouldComplete = true;
                    }
                    break;
                    
                case 'record_new_level':
                    $checkStmt = $pdo->prepare("
                        SELECT COUNT(*) FROM builder_recordings 
                        WHERE builder_id = ? AND scene_id = ? AND level_id = ? AND recording_id != ?
                    ");
                    $checkStmt->execute([$builder_id, $scene_id, $level_id, $recording_id]);
                    if ($checkStmt->fetchColumn() == 0) {
                        $shouldComplete = true;
                    }
                    break;
                    
                case 'complete_scene':
                    $checkStmt = $pdo->prepare("
                        SELECT COUNT(DISTINCT level_id) FROM builder_recordings 
                        WHERE builder_id = ? AND scene_id = ?
                    ");
                    $checkStmt->execute([$builder_id, $scene_id]);
                    if ($checkStmt->fetchColumn() >= 4) {
                        $shouldComplete = true;
                    }
                    break;
                    
                case 'scenes_today':
                    $checkStmt = $pdo->prepare("
                        SELECT COUNT(DISTINCT scene_id) FROM builder_recordings 
                        WHERE builder_id = ? AND DATE(created_at) = ?
                    ");
                    $checkStmt->execute([$builder_id, $today]);
                    if ($checkStmt->fetchColumn() >= $triggerValue) {
                        $shouldComplete = true;
                    }
                    break;
                    
                case 'levels_week':
                    $weekStart = date('Y-m-d', strtotime('monday this week'));
                    $checkStmt = $pdo->prepare("
                        SELECT COUNT(DISTINCT level_id) FROM builder_recordings 
                        WHERE builder_id = ? AND DATE(created_at) >= ?
                    ");
                    $checkStmt->execute([$builder_id, $weekStart]);
                    if ($checkStmt->fetchColumn() >= $triggerValue) {
                        $shouldComplete = true;
                    }
                    break;
                    
                case 'streak_continue':
                    // Bu trigger login sırasında kontrol edilir, recording'de değil
                    break;
            }
            
            if ($shouldComplete) {
                // builder_missions'ı güncelle
                $completeStmt = $pdo->prepare("
                    UPDATE builder_missions 
                    SET is_completed = 1, completed_at = NOW() 
                    WHERE builder_id = ? AND mission_id = ? AND mission_date = ?
                ");
                $completeStmt->execute([$builder_id, $mission['mission_id'], $today]);
                
                // Mission brick ödülü ver
                $missionRewardStmt = $pdo->prepare("
                    INSERT INTO builder_rewards_log (builder_id, reward_type, reward_name, reward_amount, notes, earned_at)
                    VALUES (?, 'brick', 'mission_brick', 1, ?, NOW())
                ");
                $missionRewardStmt->execute([$builder_id, 'Mission completed: ' . $mission['mission_text']]);
                
                // builder_rewards toplamını güncelle
                $updateBrickStmt = $pdo->prepare("
                    INSERT INTO builder_rewards (builder_id, total_bricks, total_medals, total_cups, updated_at)
                    VALUES (?, 1, 0, 0, NOW())
                    ON DUPLICATE KEY UPDATE total_bricks = total_bricks + 1, updated_at = NOW()
                ");
                $updateBrickStmt->execute([$builder_id]);
                
                $completedMissions[] = [
                    'mission_id' => $mission['mission_id'],
                    'mission_text' => $mission['mission_text']
                ];
            }
        }
    } catch (Exception $e) {
        // Mission check hatası kritik değil, devam et
    }
    
    // 5. Güncel totals'ı getir
    $totalsStmt = $pdo->prepare("SELECT total_bricks, total_medals, total_cups FROM builder_rewards WHERE builder_id = ?");
    $totalsStmt->execute([$builder_id]);
    $totals = $totalsStmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'recording_id' => $recording_id,
        'reward_given' => true,
        'character_index' => $character_index,
        'completed_missions' => $completedMissions,
        'totals' => $totals
    ]);
    
} catch (PDOException $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}