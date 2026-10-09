<?php
// /minitalks-api/scene-level/reset-recordings.php
// Kayıtları sıfırla (sahne, level veya kombinasyon bazlı)

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
$scene_id = isset($input['scene_id']) ? intval($input['scene_id']) : null;
$level_id = isset($input['level_id']) ? intval($input['level_id']) : null;

if (!$mini_id) {
    echo json_encode(['success' => false, 'error' => 'mini_id required']);
    exit;
}

try {
    $pdo->beginTransaction();
    
    // Silme koşullarını belirle
    $conditions = ['mini_id = ?'];
    $params = [$mini_id];
    
    if ($scene_id) {
        $conditions[] = 'scene_id = ?';
        $params[] = $scene_id;
    }
    
    if ($level_id) {
        $conditions[] = 'level_id = ?';
        $params[] = $level_id;
    }
    
    $whereClause = implode(' AND ', $conditions);
    
    // 1. Kayıtları sil
    $deleteStmt = $pdo->prepare("DELETE FROM scene_recordings WHERE {$whereClause}");
    $deleteStmt->execute($params);
    $deletedCount = $deleteStmt->rowCount();
    
    // 2. mini_scene_levels tablosunu güncelle
    if ($scene_id && $level_id) {
        // Tek hücre
        $updateStmt = $pdo->prepare("
            UPDATE mini_scene_levels 
            SET recording_count = 0, play_time_seconds = 0, updated_at = NOW()
            WHERE mini_id = ? AND scene_id = ? AND level_id = ?
        ");
        $updateStmt->execute([$mini_id, $scene_id, $level_id]);
    } elseif ($scene_id) {
        // Tüm sahne
        $updateStmt = $pdo->prepare("
            UPDATE mini_scene_levels 
            SET recording_count = 0, play_time_seconds = 0, updated_at = NOW()
            WHERE mini_id = ? AND scene_id = ?
        ");
        $updateStmt->execute([$mini_id, $scene_id]);
    } elseif ($level_id) {
        // Tüm level (tüm sahnelerde)
        $updateStmt = $pdo->prepare("
            UPDATE mini_scene_levels 
            SET recording_count = 0, play_time_seconds = 0, updated_at = NOW()
            WHERE mini_id = ? AND level_id = ?
        ");
        $updateStmt->execute([$mini_id, $level_id]);
    } else {
        // Tüm kayıtlar
        $updateStmt = $pdo->prepare("
            UPDATE mini_scene_levels 
            SET recording_count = 0, play_time_seconds = 0, updated_at = NOW()
            WHERE mini_id = ?
        ");
        $updateStmt->execute([$mini_id]);
    }
    
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'deleted_recordings' => $deletedCount,
        'message' => "Reset complete. {$deletedCount} recording(s) deleted."
    ]);
    
} catch (PDOException $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}