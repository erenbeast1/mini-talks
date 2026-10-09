<?php
// /minitalks-api/scene-level/update-scene-lock.php
// Tüm sahneyi veya belirli level'ları kilitle/aç

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../config/db.php';

$input = json_decode(file_get_contents('php://input'), true);

$mini_id = isset($input['mini_id']) ? intval($input['mini_id']) : 0;
$scene_id = isset($input['scene_id']) ? intval($input['scene_id']) : 0;
$level_id = isset($input['level_id']) ? intval($input['level_id']) : null; // null = tüm sahne
$is_locked = isset($input['is_locked']) ? (bool)$input['is_locked'] : true;
$action = isset($input['action']) ? $input['action'] : 'single'; // single, lock_scene, unlock_scene

if (!$mini_id || !$scene_id) {
    echo json_encode(['success' => false, 'error' => 'mini_id and scene_id required']);
    exit;
}

try {
    // Tüm level'ları getir
    $levelsStmt = $pdo->query("SELECT level_id FROM levels ORDER BY level_order");
    $levels = $levelsStmt->fetchAll(PDO::FETCH_COLUMN);
    
    $pdo->beginTransaction();
    
    // Hangi level'ları güncelleyeceğiz?
    $targetLevels = [];
    
    if ($action === 'lock_scene' || $action === 'unlock_scene') {
        // Tüm sahneyi kilitle/aç
        $targetLevels = $levels;
        $is_locked = ($action === 'lock_scene');
    } elseif ($level_id !== null) {
        // Tek level
        $targetLevels = [$level_id];
    } else {
        // Tüm sahne (level_id null ama action belirtilmemiş)
        $targetLevels = $levels;
    }
    
    // Upsert işlemi
    $upsertStmt = $pdo->prepare("
        INSERT INTO mini_scene_levels (mini_id, scene_id, level_id, is_locked)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE is_locked = ?, updated_at = NOW()
    ");
    
    foreach ($targetLevels as $lid) {
        $lockValue = $is_locked ? 1 : 0;
        $upsertStmt->execute([$mini_id, $scene_id, $lid, $lockValue, $lockValue]);
    }
    
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'message' => $action === 'lock_scene' ? 'Scene locked' : ($action === 'unlock_scene' ? 'Scene unlocked' : 'Lock status updated'),
        'updated_levels' => count($targetLevels)
    ]);
    
} catch (PDOException $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
