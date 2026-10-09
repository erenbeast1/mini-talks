<?php
// /minitalks-api/builder/get-recordings.php
// Dashboard ve RecordingProgress bileşenleri için kayıt listesi
// Her iki format da döndürülüyor

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

date_default_timezone_set('Europe/Istanbul');
require_once '../config/db.php';

$builder_id = isset($_GET['builder_id']) ? intval($_GET['builder_id']) : 0;
$sort_by = isset($_GET['sort_by']) ? $_GET['sort_by'] : 'date';
$sort_dir = isset($_GET['sort_dir']) && strtoupper($_GET['sort_dir']) === 'ASC' ? 'ASC' : 'DESC';

if (!$builder_id) {
    echo json_encode(['success' => false, 'error' => 'builder_id required']);
    exit;
}

// Sort mapping
$sortMap = [
    'date' => 'r.created_at',
    'time' => 'TIME(r.created_at)',
    'scene' => 's.scene_name',
    'level' => 'l.level_name',
    'duration' => 'r.duration_seconds'
];
$orderBy = isset($sortMap[$sort_by]) ? $sortMap[$sort_by] : 'r.created_at';

// Scene image base URL
$sceneImageBase = 'https://mini-talks.org/minitalks-api/uploads/scenes/';

// Level names mapping
$levelNames = [1 => 'Sound', 2 => 'Word', 3 => 'Sentence', 4 => 'Dialogue'];

try {
    // 1. Kayıt listesi
    $stmt = $pdo->prepare("
        SELECT 
            r.recording_id as id,
            r.created_at,
            DATE_FORMAT(r.created_at, '%b %d') as date,
            TIME_FORMAT(r.created_at, '%H:%i') as time,
            r.scene_id,
            s.scene_name,
            s.scene_name as scene,
            r.level_id,
            l.level_name,
            l.level_name as level,
            r.duration_seconds,
            CONCAT(
                LPAD(FLOOR(r.duration_seconds / 60), 2, '0'), 
                ':', 
                LPAD(r.duration_seconds % 60, 2, '0')
            ) as duration,
            r.character_index,
            s.scene_thumbnail,
            s.scene_background
        FROM builder_recordings r
        LEFT JOIN scenes s ON r.scene_id = s.scene_id
        LEFT JOIN levels l ON r.level_id = l.level_id
        WHERE r.builder_id = ?
        ORDER BY {$orderBy} {$sort_dir}
        LIMIT 100
    ");
    $stmt->execute([$builder_id]);
    $recordings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Scene image URL ve word_name ekle
    foreach ($recordings as &$rec) {
        // Scene image - tam URL
        $sceneImg = null;
        if (!empty($rec['scene_background'])) {
            $sceneImg = (strpos($rec['scene_background'], 'http') === 0) 
                ? $rec['scene_background'] 
                : $sceneImageBase . $rec['scene_background'];
        } elseif (!empty($rec['scene_thumbnail'])) {
            $sceneImg = (strpos($rec['scene_thumbnail'], 'http') === 0) 
                ? $rec['scene_thumbnail'] 
                : $sceneImageBase . $rec['scene_thumbnail'];
        }
        $rec['scene_image'] = $sceneImg;
        
        // word_name (Dashboard için)
        $rec['word_name'] = $levelNames[$rec['level_id']] ?? 'Sound';
        
        // Gereksiz alanları temizle
        unset($rec['scene_thumbnail']);
        unset($rec['scene_background']);
    }
    
    // 2. İstatistikler
    $statsStmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total_recordings,
            COALESCE(SUM(duration_seconds), 0) as total_seconds,
            COALESCE(AVG(duration_seconds), 0) as avg_seconds
        FROM builder_recordings
        WHERE builder_id = ?
    ");
    $statsStmt->execute([$builder_id]);
    $statsRow = $statsStmt->fetch(PDO::FETCH_ASSOC);
    
    // 3. En uzun kayıt yapılan sahne
    $longestSceneStmt = $pdo->prepare("
        SELECT s.scene_name, SUM(r.duration_seconds) as total
        FROM builder_recordings r
        JOIN scenes s ON r.scene_id = s.scene_id
        WHERE r.builder_id = ?
        GROUP BY r.scene_id
        ORDER BY total DESC
        LIMIT 1
    ");
    $longestSceneStmt->execute([$builder_id]);
    $longestScene = $longestSceneStmt->fetch(PDO::FETCH_ASSOC);
    
    // 4. En uzun kayıt yapılan level
    $longestLevelStmt = $pdo->prepare("
        SELECT l.level_name, SUM(r.duration_seconds) as total
        FROM builder_recordings r
        JOIN levels l ON r.level_id = l.level_id
        WHERE r.builder_id = ?
        GROUP BY r.level_id
        ORDER BY total DESC
        LIMIT 1
    ");
    $longestLevelStmt->execute([$builder_id]);
    $longestLevel = $longestLevelStmt->fetch(PDO::FETCH_ASSOC);
    
    // Format total time (HH:MM:SS)
    $totalSeconds = intval($statsRow['total_seconds']);
    $hours = floor($totalSeconds / 3600);
    $minutes = floor(($totalSeconds % 3600) / 60);
    $seconds = $totalSeconds % 60;
    $totalTime = sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds);
    
    // Format average (MM:SS)
    $avgSeconds = intval($statsRow['avg_seconds']);
    $avgTime = sprintf('%02d:%02d', floor($avgSeconds / 60), $avgSeconds % 60);
    
    $stats = [
        'totalRecordings' => intval($statsRow['total_recordings']),
        'totalRecordingTime' => $totalTime,
        'longestScene' => $longestScene ? $longestScene['scene_name'] : '-',
        'longestLevel' => $longestLevel ? $longestLevel['level_name'] : '-',
        'averageDuration' => $avgTime
    ];
    
    // Response - RecordingProgress format (data.recordings + data.stats)
    echo json_encode([
        'success' => true,
        'data' => [
            'recordings' => $recordings,
            'stats' => $stats
        ]
    ]);
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>