<?php
// /minitalks-api/recording/save-recording.php
// Ses kaydını kaydet - character_index ile

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
require_once '../rewards/check-conversions.php';

$input = json_decode(file_get_contents('php://input'), true);

$mini_id = isset($input['mini_id']) ? intval($input['mini_id']) : 0;
$scene_id = isset($input['scene_id']) ? intval($input['scene_id']) : 0;
$level_id = isset($input['level_id']) ? intval($input['level_id']) : 1;
$duration_seconds = isset($input['duration_seconds']) ? intval($input['duration_seconds']) : 0;
$character_index = isset($input['character_index']) ? intval($input['character_index']) : 1;

if (!$mini_id || !$scene_id || $duration_seconds <= 0) {
    echo json_encode(['success' => false, 'error' => 'mini_id, scene_id and duration required']);
    exit;
}

try {
    $pdo->beginTransaction();
    
    // character_index kolonu var mı kontrol et
    $hasCharIndex = false;
    try {
        $checkCol = $pdo->query("SHOW COLUMNS FROM scene_recordings LIKE 'character_index'");
        $hasCharIndex = $checkCol->rowCount() > 0;
    } catch (Exception $e) {
        $hasCharIndex = false;
    }
    
    // 1. Recording'i kaydet
    if ($hasCharIndex) {
        $stmt = $pdo->prepare("
            INSERT INTO scene_recordings (mini_id, scene_id, level_id, duration_seconds, character_index, recorded_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$mini_id, $scene_id, $level_id, $duration_seconds, $character_index]);
    } else {
        $stmt = $pdo->prepare("
            INSERT INTO scene_recordings (mini_id, scene_id, level_id, duration_seconds, recorded_at)
            VALUES (?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$mini_id, $scene_id, $level_id, $duration_seconds]);
    }
    $recording_id = $pdo->lastInsertId();
    
    // 2. Ödül ver (recording_brick)
    $rewardStmt = $pdo->prepare("
        INSERT INTO mini_rewards (mini_id, reward_type, reward_category, scene_id, notes, earned_at)
        VALUES (?, 'recording_brick', 'brick', ?, ?, NOW())
    ");
    $notes = "Recording for scene {$scene_id}, level {$level_id}, character {$character_index}, duration {$duration_seconds}s";
    $rewardStmt->execute([$mini_id, $scene_id, $notes]);
    
    $pdo->commit();
    
    // 3. Mission progress kontrol et
    $completedMissions = [];
    try {
        $today = date('Y-m-d');
        
        // Tüm aktif (tamamlanmamış) missionları çek
        $missionStmt = $pdo->prepare("
            SELECT 
                ma.id, 
                ma.mission_id, 
                ma.mission_text,
                ma.is_custom,
                COALESCE(m.trigger_type, 'record_any') as trigger_type,
                COALESCE(m.trigger_value, 1) as trigger_value
            FROM mission_assignments ma
            LEFT JOIN mission_presets m ON ma.mission_id = m.id AND ma.is_custom = 0
            WHERE ma.mini_id = ? AND ma.is_completed = 0
        ");
        $missionStmt->execute([$mini_id]);
        $activeMissions = $missionStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Bugünkü toplam kayıt sayısını bir kere çek (record_count için)
        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM scene_recordings WHERE mini_id = ? AND DATE(recorded_at) = ?");
        $countStmt->execute([$mini_id, $today]);
        $todayRecordCount = $countStmt->fetchColumn();
        
        foreach ($activeMissions as $mission) {
            $shouldComplete = false;
            $triggerType = $mission['is_custom'] ? 'record_any' : $mission['trigger_type'];
            $triggerValue = $mission['is_custom'] ? 1 : $mission['trigger_value'];
            
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
                    // Bugün toplam N kayıt yapıldı mı?
                    if ($todayRecordCount >= $triggerValue) {
                        $shouldComplete = true;
                    }
                    break;
                    
                case 'record_new_scene':
                    $checkStmt = $pdo->prepare("
                        SELECT COUNT(*) FROM scene_recordings 
                        WHERE mini_id = ? AND scene_id = ? AND DATE(recorded_at) = ? AND recording_id != ?
                    ");
                    $checkStmt->execute([$mini_id, $scene_id, $today, $recording_id]);
                    if ($checkStmt->fetchColumn() == 0) {
                        $shouldComplete = true;
                    }
                    break;
                    
                case 'record_new_level':
                    $checkStmt = $pdo->prepare("
                        SELECT COUNT(*) FROM scene_recordings 
                        WHERE mini_id = ? AND scene_id = ? AND level_id = ? AND recording_id != ?
                    ");
                    $checkStmt->execute([$mini_id, $scene_id, $level_id, $recording_id]);
                    if ($checkStmt->fetchColumn() == 0) {
                        $shouldComplete = true;
                    }
                    break;
                    
                case 'complete_scene':
                    $checkStmt = $pdo->prepare("
                        SELECT COUNT(DISTINCT level_id) FROM scene_recordings 
                        WHERE mini_id = ? AND scene_id = ?
                    ");
                    $checkStmt->execute([$mini_id, $scene_id]);
                    if ($checkStmt->fetchColumn() >= 4) {
                        $shouldComplete = true;
                    }
                    break;
                    
                case 'scenes_today':
                    $checkStmt = $pdo->prepare("
                        SELECT COUNT(DISTINCT scene_id) FROM scene_recordings 
                        WHERE mini_id = ? AND DATE(recorded_at) = ?
                    ");
                    $checkStmt->execute([$mini_id, $today]);
                    if ($checkStmt->fetchColumn() >= $triggerValue) {
                        $shouldComplete = true;
                    }
                    break;
                    
                case 'levels_week':
                    $weekStart = date('Y-m-d', strtotime('monday this week'));
                    $checkStmt = $pdo->prepare("
                        SELECT COUNT(DISTINCT level_id) FROM scene_recordings 
                        WHERE mini_id = ? AND DATE(recorded_at) >= ?
                    ");
                    $checkStmt->execute([$mini_id, $weekStart]);
                    if ($checkStmt->fetchColumn() >= $triggerValue) {
                        $shouldComplete = true;
                    }
                    break;
            }
            
            if ($shouldComplete) {
                // mission_assignments'ı güncelle
                $completeStmt = $pdo->prepare("
                    UPDATE mission_assignments 
                    SET is_completed = 1, completed_at = NOW() 
                    WHERE id = ?
                ");
                $completeStmt->execute([$mission['id']]);
                
                // mission_completions'a log ekle
                $logStmt = $pdo->prepare("
                    INSERT INTO mission_completions (mini_id, mission_id, assignment_id, completed_at)
                    VALUES (?, ?, ?, NOW())
                ");
                $logStmt->execute([$mini_id, $mission['mission_id'], $mission['id']]);
                
                // Reward ver
                $missionRewardStmt = $pdo->prepare("
                    INSERT INTO mini_rewards (mini_id, reward_type, reward_category, earned_at, notes)
                    VALUES (?, 'mission_brick', 'brick', NOW(), ?)
                ");
                $missionRewardStmt->execute([$mini_id, 'Mission completed: ' . $mission['mission_text']]);
                
                $completedMissions[] = [
                    'mission_id' => $mission['mission_id'],
                    'mission_text' => $mission['mission_text']
                ];
            }
        }
    } catch (Exception $e) {
        // Mission check hatası kritik değil, devam et
    }
    
    // ✅ CONVERSION CHECK - Brick → Medal → Cup dönüşümlerini kontrol et
    $conversionResult = null;
    try {
        $conversionResult = checkAndApplyConversions($pdo, $mini_id);
    } catch (Exception $e) {
        // Conversion hatası kritik değil
    }
    
    echo json_encode([
        'success' => true,
        'recording_id' => $recording_id,
        'reward_given' => true,
        'character_index' => $character_index,
        'completed_missions' => $completedMissions,
        'conversions' => $conversionResult ? $conversionResult['conversions'] : [],
        'totals' => $conversionResult ? $conversionResult['totals'] : null
    ]);
    
} catch (PDOException $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}