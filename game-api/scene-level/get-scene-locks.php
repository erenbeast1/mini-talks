<?php
// /minitalks-api/scene-level/get-scene-locks.php
// Mini için sahne kilit durumlarını getir

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

if (!$mini_id) {
    echo json_encode(['success' => false, 'error' => 'mini_id required']);
    exit;
}

try {
    // Tüm sahneleri getir
    $scenesStmt = $pdo->query("SELECT scene_id, scene_name, scene_order FROM scenes WHERE is_active = 1 ORDER BY scene_order");
    $scenes = $scenesStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Tüm level'ları getir
    $levelsStmt = $pdo->query("SELECT level_id, level_name FROM levels ORDER BY level_order");
    $levels = $levelsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Mini için scene-level kilit durumlarını getir
    $lockStmt = $pdo->prepare("
        SELECT scene_id, level_id, is_locked 
        FROM mini_scene_levels 
        WHERE mini_id = ?
    ");
    $lockStmt->execute([$mini_id]);
    $locks = $lockStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Lock map oluştur
    $lockMap = [];
    foreach ($locks as $lock) {
        $key = $lock['scene_id'] . '-' . $lock['level_id'];
        $lockMap[$key] = (bool)$lock['is_locked'];
    }
    
    // Her sahne için kilit durumunu hesapla
    $sceneStatus = [];
    foreach ($scenes as $scene) {
        $sceneId = $scene['scene_id'];
        $allLocked = true;
        $anyUnlocked = false;
        $levelLocks = [];
        
        foreach ($levels as $level) {
            $key = $sceneId . '-' . $level['level_id'];
            // Kayıt yoksa varsayılan olarak kilitli
            $isLocked = isset($lockMap[$key]) ? $lockMap[$key] : true;
            $levelLocks[$level['level_id']] = $isLocked;
            
            if (!$isLocked) {
                $allLocked = false;
                $anyUnlocked = true;
            }
        }
        
        $sceneStatus[] = [
            'scene_id' => $sceneId,
            'scene_name' => $scene['scene_name'],
            'scene_order' => $scene['scene_order'],
            'is_locked' => $allLocked, // Tüm level'lar kilitliyse sahne kilitli
            'is_unlocked' => $anyUnlocked, // En az bir level açıksa erişilebilir
            'level_locks' => $levelLocks
        ];
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'scenes' => $sceneStatus,
            'levels' => $levels
        ]
    ]);
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
