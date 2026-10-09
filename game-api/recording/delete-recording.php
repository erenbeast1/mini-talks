<?php
// /minitalks-api/recording/delete-recording.php
// Tek bir kaydı siler

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

$recording_id = isset($input['recording_id']) ? intval($input['recording_id']) : 0;

if (!$recording_id) {
    echo json_encode(['success' => false, 'error' => 'recording_id required']);
    exit;
}

try {
    // Önce kaydın bilgilerini al (mini_scene_levels güncellemesi için)
    $infoStmt = $pdo->prepare("SELECT mini_id, scene_id, level_id, duration_seconds FROM scene_recordings WHERE recording_id = ?");
    $infoStmt->execute([$recording_id]);
    $info = $infoStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$info) {
        echo json_encode(['success' => false, 'error' => 'Recording not found']);
        exit;
    }
    
    $pdo->beginTransaction();
    
    // 1. Kaydı sil
    $deleteStmt = $pdo->prepare("DELETE FROM scene_recordings WHERE recording_id = ?");
    $deleteStmt->execute([$recording_id]);
    
    // 2. mini_scene_levels güncelle (sayıları azalt)
    $updateStmt = $pdo->prepare("
        UPDATE mini_scene_levels 
        SET 
            recording_count = GREATEST(0, recording_count - 1),
            play_time_seconds = GREATEST(0, play_time_seconds - ?)
        WHERE mini_id = ? AND scene_id = ? AND level_id = ?
    ");
    $updateStmt->execute([$info['duration_seconds'], $info['mini_id'], $info['scene_id'], $info['level_id']]);
    
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Recording deleted'
    ]);
    
} catch (PDOException $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}