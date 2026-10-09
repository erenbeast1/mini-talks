<?php
// /minitalks-api/recording/get-progress.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/db.php';

// Varsayılan veriler
$defaultRecordings = [
    ['id' => 1, 'date' => 'Word', 'time' => 'Word', 'scene' => '6', 'level' => '00:12:25', 'duration' => 'Nov 21'],
    ['id' => 2, 'date' => 'Sound', 'time' => 'Sound', 'scene' => '8', 'level' => '', 'duration' => ''],
    ['id' => 3, 'date' => 'Sentence', 'time' => 'Sentence', 'scene' => '', 'level' => '', 'duration' => ''],
    ['id' => 4, 'date' => 'Dialogue', 'time' => 'Dialogue', 'scene' => '', 'level' => '', 'duration' => ''],
];

$defaultStats = [
    'totalRecordings' => 'X',
    'totalRecordingTime' => '00:00:00',
    'longestScene' => 'Classroom',
    'longestLevel' => 'Sound',
    'averageDuration' => '00:16'
];

try {
    $mini_id = isset($_GET['mini_id']) ? intval($_GET['mini_id']) : 0;
    
    if ($mini_id === 0) {
        throw new Exception('mini_id is required');
    }
    
    $recordings = $defaultRecordings;
    $stats = $defaultStats;
    
    try {
        // Kayıtları getir
        $stmt = $pdo->prepare("
            SELECT id, scene_name, level_name, duration_seconds,
                   DATE_FORMAT(recorded_at, '%b %d') as date,
                   DATE_FORMAT(recorded_at, '%H:%i') as time
            FROM recordings 
            WHERE mini_id = ?
            ORDER BY recorded_at DESC
        ");
        $stmt->execute([$mini_id]);
        $dbRecordings = $stmt->fetchAll();
        
        if (!empty($dbRecordings)) {
            $recordings = array_map(function($r) {
                $mins = floor($r['duration_seconds'] / 60);
                $secs = $r['duration_seconds'] % 60;
                return [
                    'id' => (int)$r['id'],
                    'date' => $r['date'],
                    'time' => $r['time'],
                    'scene' => $r['scene_name'],
                    'level' => $r['level_name'],
                    'duration' => sprintf('%02d:%02d', $mins, $secs)
                ];
            }, $dbRecordings);
        }
        
        // İstatistikler
        $statsStmt = $pdo->prepare("
            SELECT COUNT(*) as total, COALESCE(SUM(duration_seconds), 0) as total_secs, COALESCE(AVG(duration_seconds), 0) as avg_secs
            FROM recordings WHERE mini_id = ?
        ");
        $statsStmt->execute([$mini_id]);
        $statsRow = $statsStmt->fetch();
        
        if ($statsRow && $statsRow['total'] > 0) {
            $totalSecs = (int)$statsRow['total_secs'];
            $hours = floor($totalSecs / 3600);
            $mins = floor(($totalSecs % 3600) / 60);
            $secs = $totalSecs % 60;
            
            $avgSecs = (int)$statsRow['avg_secs'];
            $avgMins = floor($avgSecs / 60);
            $avgS = $avgSecs % 60;
            
            $stats['totalRecordings'] = (int)$statsRow['total'];
            $stats['totalRecordingTime'] = sprintf('%02d:%02d:%02d', $hours, $mins, $secs);
            $stats['averageDuration'] = sprintf('%02d:%02d', $avgMins, $avgS);
        }
        
        // En uzun scene
        $sceneStmt = $pdo->prepare("SELECT scene_name, SUM(duration_seconds) as total FROM recordings WHERE mini_id = ? GROUP BY scene_name ORDER BY total DESC LIMIT 1");
        $sceneStmt->execute([$mini_id]);
        $sceneRow = $sceneStmt->fetch();
        if ($sceneRow) $stats['longestScene'] = $sceneRow['scene_name'];
        
        // En uzun level
        $levelStmt = $pdo->prepare("SELECT level_name, SUM(duration_seconds) as total FROM recordings WHERE mini_id = ? GROUP BY level_name ORDER BY total DESC LIMIT 1");
        $levelStmt->execute([$mini_id]);
        $levelRow = $levelStmt->fetch();
        if ($levelRow) $stats['longestLevel'] = $levelRow['level_name'];
        
    } catch (Exception $e) {
        // Tablo yoksa varsayılanları kullan
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'recordings' => $recordings,
            'stats' => $stats
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
