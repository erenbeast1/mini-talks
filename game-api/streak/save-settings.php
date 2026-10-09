<?php
// /minitalks-api/streak/save-settings.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
// Türkiye saat dilimi (UTC+3)
date_default_timezone_set('Europe/Istanbul');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/db.php';

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $mini_id = isset($data['mini_id']) ? intval($data['mini_id']) : 0;
    $parent_id = isset($data['parent_id']) ? intval($data['parent_id']) : 0;
    $req_open_app = isset($data['req_open_app']) ? intval($data['req_open_app']) : 1;
    $req_record_1min = isset($data['req_record_1min']) ? intval($data['req_record_1min']) : 0;
    $req_play_1min = isset($data['req_play_1min']) ? intval($data['req_play_1min']) : 0;
    $play_time_limit = isset($data['play_time_limit']) ? $data['play_time_limit'] : 'no_limit';
    $break_tolerance = isset($data['break_tolerance']) ? $data['break_tolerance'] : 'no_grace';
    
    if ($mini_id === 0) {
        throw new Exception('mini_id is required');
    }
    
    // Parent ID yoksa mini_profiles'dan çek
    if ($parent_id === 0) {
        try {
            $stmt = $pdo->prepare("SELECT parent_id FROM mini_profiles WHERE mini_id = ?");
            $stmt->execute([$mini_id]);
            $result = $stmt->fetch();
            if ($result && $result['parent_id']) {
                $parent_id = intval($result['parent_id']);
            }
        } catch (Exception $e) {}
    }
    
    // Tabloyu oluştur (yoksa)
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS streak_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            mini_id INT NOT NULL UNIQUE,
            parent_id INT DEFAULT 0,
            req_open_app TINYINT(1) DEFAULT 1,
            req_record_1min TINYINT(1) DEFAULT 0,
            req_play_1min TINYINT(1) DEFAULT 0,
            play_time_limit VARCHAR(50) DEFAULT 'no_limit',
            break_tolerance VARCHAR(50) DEFAULT 'no_grace',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    } catch (Exception $e) {}
    
    // Kaydet veya güncelle
    $stmt = $pdo->prepare("INSERT INTO streak_settings (mini_id, parent_id, req_open_app, req_record_1min, req_play_1min, play_time_limit, break_tolerance)
                           VALUES (?, ?, ?, ?, ?, ?, ?)
                           ON DUPLICATE KEY UPDATE 
                           parent_id = VALUES(parent_id),
                           req_open_app = VALUES(req_open_app),
                           req_record_1min = VALUES(req_record_1min),
                           req_play_1min = VALUES(req_play_1min),
                           play_time_limit = VALUES(play_time_limit),
                           break_tolerance = VALUES(break_tolerance)");
    $stmt->execute([$mini_id, $parent_id, $req_open_app, $req_record_1min, $req_play_1min, $play_time_limit, $break_tolerance]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Settings saved successfully'
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>