<?php
// /minitalks-api/recording/save-keep-setting.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/db.php';

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $mini_id = isset($data['mini_id']) ? intval($data['mini_id']) : 0;
    $keep_option = isset($data['keep_option']) ? $data['keep_option'] : 'all';
    
    if ($mini_id === 0) {
        throw new Exception('mini_id required');
    }
    
    // Tabloyu oluştur (yoksa)
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS recording_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            mini_id INT NOT NULL UNIQUE,
            keep_option ENUM('all', 'last_50', 'last_10', 'last_30_days', 'last_7_days') DEFAULT 'all',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    } catch (Exception $e) {}
    
    try {
        $stmt = $pdo->prepare("INSERT INTO recording_settings (mini_id, keep_option) VALUES (?, ?) ON DUPLICATE KEY UPDATE keep_option = VALUES(keep_option)");
        $stmt->execute([$mini_id, $keep_option]);
    } catch (Exception $e) {}
    
    echo json_encode([
        'success' => true,
        'message' => 'Keep setting saved',
        'keep_option' => $keep_option
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
