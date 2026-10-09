<?php
// /minitalks-api/scene-level/update-lock.php
// Sahne/Level kilit durumunu güncelle

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
$is_locked = isset($input['is_locked']) ? intval($input['is_locked']) : 1;
$action = isset($input['action']) ? $input['action'] : 'single';

if (!$mini_id) {
    echo json_encode(['success' => false, 'error' => 'mini_id required']);
    exit;
}

try {
    $updated = 0;
    
    switch ($action) {
        case 'single':
            // Tek bir hücre güncelle
            if (!$scene_id || !$level_id) {
                echo json_encode(['success' => false, 'error' => 'scene_id and level_id required for single update']);
                exit;
            }
            
            $stmt = $pdo->prepare("
                INSERT INTO mini_scene_levels (mini_id, scene_id, level_id, is_locked)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE is_locked = ?, updated_at = NOW()
            ");
            $stmt->execute([$mini_id, $scene_id, $level_id, $is_locked, $is_locked]);
            $updated = 1;
            break;
            
        case 'lock_scene':
        case 'unlock_scene':
            // Bir sahnenin tüm level'larını güncelle
            if (!$scene_id) {
                echo json_encode(['success' => false, 'error' => 'scene_id required for scene update']);
                exit;
            }
            
            // Tüm level'ları al
            $levelsStmt = $pdo->query("SELECT level_id FROM levels");
            $levels = $levelsStmt->fetchAll(PDO::FETCH_COLUMN);
            
            foreach ($levels as $lid) {
                $stmt = $pdo->prepare("
                    INSERT INTO mini_scene_levels (mini_id, scene_id, level_id, is_locked)
                    VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE is_locked = ?, updated_at = NOW()
                ");
                $stmt->execute([$mini_id, $scene_id, $lid, $is_locked, $is_locked]);
                $updated++;
            }
            break;
            
        case 'lock_level':
        case 'unlock_level':
            // Bir level'ın tüm sahnelerdeki durumunu güncelle
            if (!$level_id) {
                echo json_encode(['success' => false, 'error' => 'level_id required for level update']);
                exit;
            }
            
            // Tüm sahneleri al
            $scenesStmt = $pdo->query("SELECT scene_id FROM scenes");
            $scenes = $scenesStmt->fetchAll(PDO::FETCH_COLUMN);
            
            foreach ($scenes as $sid) {
                $stmt = $pdo->prepare("
                    INSERT INTO mini_scene_levels (mini_id, scene_id, level_id, is_locked)
                    VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE is_locked = ?, updated_at = NOW()
                ");
                $stmt->execute([$mini_id, $sid, $level_id, $is_locked, $is_locked]);
                $updated++;
            }
            break;
            
        case 'lock_all':
        case 'unlock_all':
            // Tüm sahne-level kombinasyonlarını güncelle
            $scenesStmt = $pdo->query("SELECT scene_id FROM scenes");
            $scenes = $scenesStmt->fetchAll(PDO::FETCH_COLUMN);
            
            $levelsStmt = $pdo->query("SELECT level_id FROM levels");
            $levels = $levelsStmt->fetchAll(PDO::FETCH_COLUMN);
            
            foreach ($scenes as $sid) {
                foreach ($levels as $lid) {
                    $stmt = $pdo->prepare("
                        INSERT INTO mini_scene_levels (mini_id, scene_id, level_id, is_locked)
                        VALUES (?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE is_locked = ?, updated_at = NOW()
                    ");
                    $stmt->execute([$mini_id, $sid, $lid, $is_locked, $is_locked]);
                    $updated++;
                }
            }
            break;
            
        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
            exit;
    }
    
    echo json_encode([
        'success' => true,
        'updated' => $updated,
        'action' => $action,
        'is_locked' => $is_locked
    ]);
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}