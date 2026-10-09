<?php
// auth/get-scenes.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/db.php';

try {
    $user_id = $_GET['user_id'] ?? null;
    
    if (!$user_id) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'User ID is required'
        ]);
        exit;
    }

    // Tüm sahneleri al
    $stmt = $pdo->prepare("
        SELECT 
            scene_id,
            scene_name,
            scene_description,
            scene_order,
            is_active,
            thumbnail_url,
            background_url
        FROM scenes
        WHERE is_active = 1
        ORDER BY scene_order ASC
    ");
    $stmt->execute();
    $allScenes = $stmt->fetchAll();

    // Kullanıcının tamamladığı sahneleri al
    $stmt = $pdo->prepare("
        SELECT 
            sp.scene_id,
            sp.is_completed,
            sp.stars_earned,
            sp.last_played
        FROM scene_progress sp
        WHERE sp.user_id = ?
    ");
    $stmt->execute([$user_id]);
    $userProgress = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Progress'i scene_id ile indexle
    $progressMap = [];
    foreach ($userProgress as $progress) {
        $progressMap[$progress['scene_id']] = $progress;
    }

    // Sahneleri progress ile birleştir
    $scenes = [];
    $previousCompleted = true; // İlk sahne her zaman açık
    
    foreach ($allScenes as $scene) {
        $sceneId = $scene['scene_id'];
        $progress = $progressMap[$sceneId] ?? null;
        
        $isUnlocked = $previousCompleted; // Bir önceki sahne tamamlanmışsa bu açık
        $isCompleted = $progress ? (bool)$progress['is_completed'] : false;
        
        $scenes[] = [
            'scene_id' => $sceneId,
            'scene_name' => $scene['scene_name'],
            'scene_description' => $scene['scene_description'],
            'scene_order' => (int)$scene['scene_order'],
            'thumbnail_url' => $scene['thumbnail_url'],
            'background_url' => $scene['background_url'],
            'is_unlocked' => $isUnlocked,
            'is_completed' => $isCompleted,
            'stars_earned' => $progress ? (int)$progress['stars_earned'] : 0,
            'last_played' => $progress ? $progress['last_played'] : null
        ];
        
        $previousCompleted = $isCompleted;
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => [
            'scenes' => $scenes,
            'total_scenes' => count($scenes),
            'completed_scenes' => count(array_filter($scenes, fn($s) => $s['is_completed']))
        ]
    ]);

} catch (Throwable $e) {
    error_log('GET SCENES ERROR: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error'
    ]);
}