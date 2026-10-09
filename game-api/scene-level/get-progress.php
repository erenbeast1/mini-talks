<?php
// /minitalks-api/scene-level/get-progress.php
// SceneLevelProgress bileşeni için sahne/level ilerleme verileri

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../config/db.php';

$mini_id = isset($_GET['mini_id']) ? intval($_GET['mini_id']) : 0;
$sort_by = isset($_GET['sort_by']) ? $_GET['sort_by'] : 'scene_order';
$sort_dir = isset($_GET['sort_dir']) && strtoupper($_GET['sort_dir']) === 'DESC' ? 'DESC' : 'ASC';

if (!$mini_id) {
    echo json_encode(['success' => false, 'error' => 'mini_id required']);
    exit;
}

// Sort mapping
$sortMap = [
    'scene_order' => 's.scene_id',
    'play_time' => 'total_play_time',
    'recordings' => 'total_recordings',
    'last_play' => 'latest_play'
];
$orderBy = isset($sortMap[$sort_by]) ? $sortMap[$sort_by] : 's.scene_id';

try {
    // 1. Tüm level'ları getir
    $levelsStmt = $pdo->query("SELECT level_id, level_name FROM levels ORDER BY level_id");
    $levels = $levelsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 2. Tüm sahneleri getir (istatistiklerle birlikte)
    $scenesStmt = $pdo->prepare("
        SELECT 
            s.scene_id,
            s.scene_name,
            COALESCE(SUM(msl.play_time_seconds), 0) as total_play_time,
            COALESCE(SUM(msl.recording_count), 0) as total_recordings,
            MAX(msl.last_play_date) as latest_play,
            COALESCE(MAX(msl.minis_customized), 0) as total_minis_customized
        FROM scenes s
        LEFT JOIN mini_scene_levels msl ON s.scene_id = msl.scene_id AND msl.mini_id = ?
        GROUP BY s.scene_id, s.scene_name
        ORDER BY {$orderBy} {$sort_dir}
    ");
    $scenesStmt->execute([$mini_id]);
    $scenes = $scenesStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 3. Her sahne-level kombinasyonu için detayları getir
    $detailsStmt = $pdo->prepare("
        SELECT 
            msl.scene_id,
            msl.level_id,
            msl.is_locked,
            msl.play_time_seconds,
            msl.recording_count,
            msl.last_play_date
        FROM mini_scene_levels msl
        WHERE msl.mini_id = ?
    ");
    $detailsStmt->execute([$mini_id]);
    $detailRows = $detailsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 4. scene_recordings tablosundan gerçek kayıt süreleri
    $recordingsStmt = $pdo->prepare("
        SELECT 
            scene_id,
            level_id,
            SUM(duration_seconds) as total_duration,
            COUNT(*) as recording_count,
            MAX(recorded_at) as last_recording
        FROM scene_recordings
        WHERE mini_id = ?
        GROUP BY scene_id, level_id
    ");
    $recordingsStmt->execute([$mini_id]);
    $recordingData = [];
    while ($row = $recordingsStmt->fetch(PDO::FETCH_ASSOC)) {
        $key = $row['scene_id'] . '-' . $row['level_id'];
        $recordingData[$key] = $row;
    }
    
    // 5. customized_minis tablosundan gerçek sayılar
    $customStmt = $pdo->prepare("
        SELECT scene_id, COUNT(*) as count
        FROM customized_minis
        WHERE mini_id = ?
        GROUP BY scene_id
    ");
    $customStmt->execute([$mini_id]);
    $customData = $customStmt->fetchAll(PDO::FETCH_KEY_PAIR);
    
    // 6. Details map oluştur
    $details = [];
    foreach ($detailRows as $row) {
        $key = $row['scene_id'] . '-' . $row['level_id'];
        $recKey = $row['scene_id'] . '-' . $row['level_id'];
        
        // Gerçek recording verisini kullan
        $recInfo = isset($recordingData[$recKey]) ? $recordingData[$recKey] : null;
        
        $details[$key] = [
            'is_locked' => (bool)$row['is_locked'],
            'play_time_seconds' => $recInfo ? intval($recInfo['total_duration']) : 0,
            'recording_count' => $recInfo ? intval($recInfo['recording_count']) : 0,
            'last_play_date' => $recInfo ? $recInfo['last_recording'] : null
        ];
    }
    
    // 7. Scene totals'ı güncelle (gerçek verilerle)
    foreach ($scenes as &$scene) {
        $sceneId = $scene['scene_id'];
        
        // Recording totals
        $totalTime = 0;
        $totalRecs = 0;
        $latestPlay = null;
        
        foreach ($levels as $level) {
            $key = $sceneId . '-' . $level['level_id'];
            if (isset($details[$key])) {
                $totalTime += $details[$key]['play_time_seconds'];
                $totalRecs += $details[$key]['recording_count'];
                if ($details[$key]['last_play_date']) {
                    if (!$latestPlay || $details[$key]['last_play_date'] > $latestPlay) {
                        $latestPlay = $details[$key]['last_play_date'];
                    }
                }
            }
        }
        
        $scene['total_play_time'] = $totalTime;
        $scene['total_recordings'] = $totalRecs;
        $scene['latest_play'] = $latestPlay;
        $scene['total_minis_customized'] = isset($customData[$sceneId]) ? intval($customData[$sceneId]) : 0;
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'scenes' => $scenes,
            'levels' => $levels,
            'details' => $details
        ]
    ]);
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}