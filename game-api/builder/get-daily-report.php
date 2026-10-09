<?php
// /minitalks-api/builder/get-daily-report.php
// Belirli bir günün detaylı raporunu döndürür
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

date_default_timezone_set('Europe/Istanbul');
require_once '../config/db.php';

try {
    $builder_id = isset($_GET['builder_id']) ? intval($_GET['builder_id']) : 0;
    $date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
    
    if ($builder_id === 0) {
        throw new Exception('builder_id is required');
    }
    
    // O günkü kayıtları çek
    $recordingsStmt = $pdo->prepare("
        SELECT 
            br.recording_id,
            br.scene_id,
            br.level_id,
            br.duration_seconds,
            br.character_index,
            br.created_at,
            s.scene_name,
            l.level_name
        FROM builder_recordings br
        LEFT JOIN scenes s ON br.scene_id = s.scene_id
        LEFT JOIN levels l ON br.level_id = l.level_id
        WHERE br.builder_id = ? AND DATE(br.created_at) = ?
        ORDER BY br.created_at DESC
    ");
    $recordingsStmt->execute([$builder_id, $date]);
    $recordings = $recordingsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // O günkü mission'ları çek
    $missionsStmt = $pdo->prepare("
        SELECT 
            bm.mission_id,
            bm.mission_text,
            bm.is_completed,
            bm.completed_at
        FROM builder_missions bm
        WHERE bm.builder_id = ? AND bm.mission_date = ?
    ");
    $missionsStmt->execute([$builder_id, $date]);
    $missions = $missionsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // O günkü rewards'ları çek
    $rewardsStmt = $pdo->prepare("
        SELECT 
            reward_type,
            reward_name,
            reward_amount,
            notes,
            earned_at
        FROM builder_rewards_log
        WHERE builder_id = ? AND DATE(earned_at) = ?
        ORDER BY earned_at DESC
    ");
    $rewardsStmt->execute([$builder_id, $date]);
    $rewards = $rewardsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Toplam süre ve kayıt sayısı
    $totalDuration = 0;
    $totalRecordings = count($recordings);
    foreach ($recordings as $rec) {
        $totalDuration += $rec['duration_seconds'];
    }
    
    // Tamamlanan mission sayısı
    $completedMissions = 0;
    foreach ($missions as $m) {
        if ($m['is_completed']) {
            $completedMissions++;
        }
    }
    
    // Kazanılan toplam brick
    $totalBricks = 0;
    foreach ($rewards as $r) {
        if ($r['reward_type'] === 'brick') {
            $totalBricks += $r['reward_amount'];
        }
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'date' => $date,
            'recordings' => $recordings,
            'missions' => $missions,
            'rewards' => $rewards,
            'summary' => [
                'total_recordings' => $totalRecordings,
                'total_duration' => $totalDuration,
                'total_missions' => count($missions),
                'completed_missions' => $completedMissions,
                'total_bricks' => $totalBricks
            ]
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
