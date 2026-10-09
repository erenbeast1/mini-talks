<?php
// /minitalks-api/recording/get-recordings.php
// RecordingProgress bileşeni için kayıt listesi ve istatistikler

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
$sort_by = isset($_GET['sort_by']) ? $_GET['sort_by'] : 'date';
$sort_dir = isset($_GET['sort_dir']) && strtoupper($_GET['sort_dir']) === 'ASC' ? 'ASC' : 'DESC';

if (!$mini_id) {
    echo json_encode(['success' => false, 'error' => 'mini_id required']);
    exit;
}

// Sort mapping
$sortMap = [
    'date' => 'r.recorded_at',
    'time' => 'TIME(r.recorded_at)',
    'scene' => 's.scene_name',
    'level' => 'l.level_name',
    'duration' => 'r.duration_seconds'
];
$orderBy = isset($sortMap[$sort_by]) ? $sortMap[$sort_by] : 'r.recorded_at';

try {
    // 1. Kayıt listesi
    $stmt = $pdo->prepare("
        SELECT 
            r.recording_id,
            DATE_FORMAT(r.recorded_at, '%b %d') as date,
            TIME_FORMAT(r.recorded_at, '%H:%i') as time,
            s.scene_name as scene,
            l.level_name as level,
            CONCAT(
                LPAD(FLOOR(r.duration_seconds / 60), 2, '0'), 
                ':', 
                LPAD(r.duration_seconds % 60, 2, '0')
            ) as duration,
            r.duration_seconds
        FROM scene_recordings r
        LEFT JOIN scenes s ON r.scene_id = s.scene_id
        LEFT JOIN levels l ON r.level_id = l.level_id
        WHERE r.mini_id = ?
        ORDER BY {$orderBy} {$sort_dir}
        LIMIT 100
    ");
    $stmt->execute([$mini_id]);
    $recordings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 2. İstatistikler
    $statsStmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total_recordings,
            COALESCE(SUM(duration_seconds), 0) as total_seconds,
            COALESCE(AVG(duration_seconds), 0) as avg_seconds
        FROM scene_recordings
        WHERE mini_id = ?
    ");
    $statsStmt->execute([$mini_id]);
    $statsRow = $statsStmt->fetch(PDO::FETCH_ASSOC);
    
    // 3. En uzun kayıt yapılan sahne
    $longestSceneStmt = $pdo->prepare("
        SELECT s.scene_name, SUM(r.duration_seconds) as total
        FROM scene_recordings r
        JOIN scenes s ON r.scene_id = s.scene_id
        WHERE r.mini_id = ?
        GROUP BY r.scene_id
        ORDER BY total DESC
        LIMIT 1
    ");
    $longestSceneStmt->execute([$mini_id]);
    $longestScene = $longestSceneStmt->fetch(PDO::FETCH_ASSOC);
    
    // 4. En uzun kayıt yapılan level
    $longestLevelStmt = $pdo->prepare("
        SELECT l.level_name, SUM(r.duration_seconds) as total
        FROM scene_recordings r
        JOIN levels l ON r.level_id = l.level_id
        WHERE r.mini_id = ?
        GROUP BY r.level_id
        ORDER BY total DESC
        LIMIT 1
    ");
    $longestLevelStmt->execute([$mini_id]);
    $longestLevel = $longestLevelStmt->fetch(PDO::FETCH_ASSOC);
    
    // Format total time
    $totalSeconds = intval($statsRow['total_seconds']);
    $hours = floor($totalSeconds / 3600);
    $minutes = floor(($totalSeconds % 3600) / 60);
    $seconds = $totalSeconds % 60;
    $totalTime = sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds);
    
    // Format average
    $avgSeconds = intval($statsRow['avg_seconds']);
    $avgTime = sprintf('%02d:%02d', floor($avgSeconds / 60), $avgSeconds % 60);
    
    $stats = [
        'totalRecordings' => intval($statsRow['total_recordings']),
        'totalRecordingTime' => $totalTime,
        'longestScene' => $longestScene ? $longestScene['scene_name'] : '-',
        'longestLevel' => $longestLevel ? $longestLevel['level_name'] : '-',
        'averageDuration' => $avgTime
    ];
    
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