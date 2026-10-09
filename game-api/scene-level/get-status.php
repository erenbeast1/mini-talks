<?php
// /minitalks-api/scene-level/get-status.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/db.php';

// Varsayılan veriler
$defaultScenes = [
    ['scene_id' => 1, 'scene_name' => 'Classroom', 'scene_order' => 1],
    ['scene_id' => 2, 'scene_name' => 'Library', 'scene_order' => 2],
    ['scene_id' => 3, 'scene_name' => 'Playground', 'scene_order' => 3],
    ['scene_id' => 4, 'scene_name' => 'Basketball Court', 'scene_order' => 4],
    ['scene_id' => 5, 'scene_name' => 'Living Room', 'scene_order' => 5],
    ['scene_id' => 6, 'scene_name' => 'Bedroom', 'scene_order' => 6],
    ['scene_id' => 7, 'scene_name' => 'Birthday Party', 'scene_order' => 7],
    ['scene_id' => 8, 'scene_name' => 'Supermarket', 'scene_order' => 8],
    ['scene_id' => 9, 'scene_name' => 'Bakery', 'scene_order' => 9],
    ['scene_id' => 10, 'scene_name' => 'Pizzeria', 'scene_order' => 10]
];

$defaultLevels = [
    ['level_id' => 1, 'level_name' => 'Sound', 'level_order' => 1],
    ['level_id' => 2, 'level_name' => 'Word', 'level_order' => 2],
    ['level_id' => 3, 'level_name' => 'Sentence', 'level_order' => 3],
    ['level_id' => 4, 'level_name' => 'Dialogue', 'level_order' => 4]
];

try {
    $mini_id = isset($_GET['mini_id']) ? intval($_GET['mini_id']) : 0;
    
    if ($mini_id === 0) {
        throw new Exception('mini_id is required');
    }
    
    // Scenes tablosunu kontrol et
    $scenes = $defaultScenes;
    try {
        $stmt = $pdo->query("SELECT scene_id, scene_name, scene_order FROM scenes WHERE is_active = 1 ORDER BY scene_order");
        $dbScenes = $stmt->fetchAll();
        if (!empty($dbScenes)) {
            $scenes = $dbScenes;
        }
    } catch (Exception $e) {
        // Tablo yoksa varsayılanları kullan
    }
    
    // Levels tablosunu kontrol et
    $levels = $defaultLevels;
    try {
        $stmt = $pdo->query("SELECT level_id, level_name, level_order FROM levels ORDER BY level_order");
        $dbLevels = $stmt->fetchAll();
        if (!empty($dbLevels)) {
            $levels = $dbLevels;
        }
    } catch (Exception $e) {
        // Tablo yoksa varsayılanları kullan
    }
    
    // Mini'nin scene/level durumlarını getir
    $status = [];
    try {
        $stmt = $pdo->prepare("SELECT scene_id, level_id, is_locked, play_time_seconds, recording_count, last_play_date, minis_customized 
                               FROM mini_scene_levels WHERE mini_id = ?");
        $stmt->execute([$mini_id]);
        $statusRows = $stmt->fetchAll();
        
        foreach ($statusRows as $row) {
            $key = $row['scene_id'] . '-' . $row['level_id'];
            $status[$key] = [
                'is_locked' => (bool)$row['is_locked'],
                'play_time_seconds' => (int)$row['play_time_seconds'],
                'recording_count' => (int)$row['recording_count'],
                'last_play_date' => $row['last_play_date'],
                'minis_customized' => (int)$row['minis_customized']
            ];
        }
    } catch (Exception $e) {
        // Tablo yoksa boş status
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'scenes' => $scenes,
            'levels' => $levels,
            'status' => $status
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
