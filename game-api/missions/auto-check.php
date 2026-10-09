<?php
// /minitalks-api/missions/auto-check.php
// Recording yapıldığında otomatik mission tamamlama kontrolü
// save-recording.php'den çağrılır

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
    $scene_id = isset($input['scene_id']) ? intval($input['scene_id']) : null;
    $level_id = isset($input['level_id']) ? intval($input['level_id']) : null;
    $recording_id = isset($input['recording_id']) ? intval($input['recording_id']) : null;
    
    if (!$mini_id) {
        throw new Exception('mini_id required');
    }
    
    $today = date('Y-m-d');
    $now = date('Y-m-d H:i:s');
    $completedMissions = [];
    
    // Tüm aktif (tamamlanmamış) missionları çek
    $stmt = $pdo->prepare("
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
    $stmt->execute([$mini_id]);
    $activeMissions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Bugünkü toplam kayıt sayısını bir kere çek (record_count için)
    $todayRecordCount = 0;
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
                if ($scene_id) {
                    $checkStmt = $pdo->prepare("
                        SELECT COUNT(*) FROM scene_recordings 
                        WHERE mini_id = ? AND scene_id = ? AND DATE(recorded_at) = ? AND recording_id != ?
                    ");
                    $checkStmt->execute([$mini_id, $scene_id, $today, $recording_id]);
                    if ($checkStmt->fetchColumn() == 0) {
                        $shouldComplete = true;
                    }
                }
                break;
                
            case 'record_new_level':
                if ($scene_id && $level_id) {
                    $checkStmt = $pdo->prepare("
                        SELECT COUNT(*) FROM scene_recordings 
                        WHERE mini_id = ? AND scene_id = ? AND level_id = ? AND recording_id != ?
                    ");
                    $checkStmt->execute([$mini_id, $scene_id, $level_id, $recording_id]);
                    if ($checkStmt->fetchColumn() == 0) {
                        $shouldComplete = true;
                    }
                }
                break;
                
            case 'complete_scene':
                if ($scene_id) {
                    $checkStmt = $pdo->prepare("
                        SELECT COUNT(DISTINCT level_id) FROM scene_recordings 
                        WHERE mini_id = ? AND scene_id = ?
                    ");
                    $checkStmt->execute([$mini_id, $scene_id]);
                    if ($checkStmt->fetchColumn() >= 4) {
                        $shouldComplete = true;
                    }
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
                SET is_completed = 1, completed_at = ? 
                WHERE id = ?
            ");
            $completeStmt->execute([$now, $mission['id']]);
            
            // mission_completions'a log ekle
            if ($mission['mission_id'] > 0) {
                $logStmt = $pdo->prepare("
                    INSERT INTO mission_completions (mini_id, mission_id, completed_at)
                    VALUES (?, ?, ?)
                ");
                $logStmt->execute([$mini_id, $mission['mission_id'], $now]);
            }
            
            // Reward ver
            $rewardStmt = $pdo->prepare("
                INSERT INTO mini_rewards (mini_id, reward_type, reward_category, earned_at, notes)
                VALUES (?, 'mission_brick', 'brick', NOW(), ?)
            ");
            $rewardStmt->execute([$mini_id, 'Mission completed: ' . $mission['mission_text']]);
            
            $completedMissions[] = [
                'mission_id' => $mission['mission_id'],
                'mission_text' => $mission['mission_text']
            ];
        }
    }
    
    echo json_encode([
        'success' => true,
        'completed_missions' => $completedMissions,
        'completed_count' => count($completedMissions)
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>