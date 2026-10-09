<?php
// /minitalks-api/recording/get-scenes.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/db.php';

// Varsayılan sahneler
$defaultScenes = [
    ['id' => 1, 'name' => 'All Scenes'],
    ['id' => 2, 'name' => 'Bakery'],
    ['id' => 3, 'name' => 'Basketball Court'],
    ['id' => 4, 'name' => 'Birthday Party'],
    ['id' => 5, 'name' => 'Classroom'],
    ['id' => 6, 'name' => 'Library'],
];

try {
    $scenes = $defaultScenes;
    
    try {
        $stmt = $pdo->query("SELECT scene_id as id, scene_name as name FROM scenes WHERE is_active = 1 ORDER BY scene_order");
        $dbScenes = $stmt->fetchAll();
        if (!empty($dbScenes)) {
            $scenes = array_merge([['id' => 0, 'name' => 'All Scenes']], $dbScenes);
        }
    } catch (Exception $e) {
        // Tablo yoksa varsayılanları kullan
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'scenes' => $scenes
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
