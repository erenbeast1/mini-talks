<?php
// /minitalks-api/recording/delete-recordings.php
// Birden fazla kaydı siler

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

$recording_ids = isset($input['recording_ids']) ? $input['recording_ids'] : [];

if (empty($recording_ids)) {
    echo json_encode(['success' => false, 'error' => 'recording_ids required']);
    exit;
}

// ID'leri integer'a çevir ve filtrele
$recording_ids = array_filter(array_map('intval', $recording_ids));

if (empty($recording_ids)) {
    echo json_encode(['success' => false, 'error' => 'Valid recording_ids required']);
    exit;
}

try {
    $pdo->beginTransaction();
    
    // 1. Silinecek kayıtların bilgilerini al
    $placeholders = implode(',', array_fill(0, count($recording_ids), '?'));
    $infoStmt = $pdo->prepare("
        SELECT mini_id, scene_id, level_id, SUM(duration_seconds) as total_duration, COUNT(*) as count
        FROM scene_recordings 
        WHERE recording_id IN ($placeholders)
        GROUP BY mini_id, scene_id, level_id
    ");
    $infoStmt->execute($recording_ids);
    $infos = $infoStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 2. Kayıtları sil
    $deleteStmt = $pdo->prepare("DELETE FROM scene_recordings WHERE recording_id IN ($placeholders)");
    $deleteStmt->execute($recording_ids);
    $deletedCount = $deleteStmt->rowCount();
    
    // 3. mini_scene_levels güncelle
    foreach ($infos as $info) {
        $updateStmt = $pdo->prepare("
            UPDATE mini_scene_levels 
            SET 
                recording_count = GREATEST(0, recording_count - ?),
                play_time_seconds = GREATEST(0, play_time_seconds - ?)
            WHERE mini_id = ? AND scene_id = ? AND level_id = ?
        ");
        $updateStmt->execute([
            $info['count'], 
            $info['total_duration'], 
            $info['mini_id'], 
            $info['scene_id'], 
            $info['level_id']
        ]);
    }
    
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'deleted_count' => $deletedCount,
        'message' => "$deletedCount recording(s) deleted"
    ]);
    
} catch (PDOException $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}