<?php
// /minitalks-api/recording/keep-recordings.php
// Belirli sayıda veya gün kadar kayıt tut, eskilerini sil

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
$keep_count = isset($input['keep_count']) ? intval($input['keep_count']) : 0;
$keep_days = isset($input['keep_days']) ? intval($input['keep_days']) : 0;

if (!$mini_id) {
    echo json_encode(['success' => false, 'error' => 'mini_id required']);
    exit;
}

if (!$keep_count && !$keep_days) {
    echo json_encode(['success' => false, 'error' => 'keep_count or keep_days required']);
    exit;
}

try {
    $pdo->beginTransaction();
    
    $deletedIds = [];
    
    if ($keep_count > 0) {
        // Son X kaydı tut, gerisini sil
        // Önce tutulacak kayıtların ID'lerini bul
        $keepStmt = $pdo->prepare("
            SELECT recording_id FROM scene_recordings 
            WHERE mini_id = ? 
            ORDER BY recorded_at DESC 
            LIMIT ?
        ");
        $keepStmt->execute([$mini_id, $keep_count]);
        $keepIds = $keepStmt->fetchAll(PDO::FETCH_COLUMN);
        
        if (!empty($keepIds)) {
            // Tutulacaklar dışındakileri bul
            $placeholders = implode(',', array_fill(0, count($keepIds), '?'));
            $toDeleteStmt = $pdo->prepare("
                SELECT recording_id FROM scene_recordings 
                WHERE mini_id = ? AND recording_id NOT IN ($placeholders)
            ");
            $params = array_merge([$mini_id], $keepIds);
            $toDeleteStmt->execute($params);
            $deletedIds = $toDeleteStmt->fetchAll(PDO::FETCH_COLUMN);
        }
    } else if ($keep_days > 0) {
        // Son X gün içindeki kayıtları tut, gerisini sil
        $cutoffDate = date('Y-m-d H:i:s', strtotime("-{$keep_days} days"));
        
        $toDeleteStmt = $pdo->prepare("
            SELECT recording_id FROM scene_recordings 
            WHERE mini_id = ? AND recorded_at < ?
        ");
        $toDeleteStmt->execute([$mini_id, $cutoffDate]);
        $deletedIds = $toDeleteStmt->fetchAll(PDO::FETCH_COLUMN);
    }
    
    $deletedCount = 0;
    
    if (!empty($deletedIds)) {
        // Silinecek kayıtların bilgilerini al
        $placeholders = implode(',', array_fill(0, count($deletedIds), '?'));
        $infoStmt = $pdo->prepare("
            SELECT mini_id, scene_id, level_id, SUM(duration_seconds) as total_duration, COUNT(*) as count
            FROM scene_recordings 
            WHERE recording_id IN ($placeholders)
            GROUP BY mini_id, scene_id, level_id
        ");
        $infoStmt->execute($deletedIds);
        $infos = $infoStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Kayıtları sil
        $deleteStmt = $pdo->prepare("DELETE FROM scene_recordings WHERE recording_id IN ($placeholders)");
        $deleteStmt->execute($deletedIds);
        $deletedCount = $deleteStmt->rowCount();
        
        // mini_scene_levels güncelle
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
    }
    
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'deleted_count' => $deletedCount,
        'message' => $deletedCount > 0 ? "$deletedCount old recording(s) deleted" : 'No recordings to delete'
    ]);
    
} catch (PDOException $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
