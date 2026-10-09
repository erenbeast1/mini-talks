<?php
// /minitalks-api/streak/get-settings.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
// Türkiye saat dilimi (UTC+3)
date_default_timezone_set('Europe/Istanbul');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/db.php';

$defaultSettings = [
    'req_open_app' => 1,
    'req_record_1min' => 0,
    'req_play_1min' => 0,
    'play_time_limit' => 'no_limit',
    'break_tolerance' => 'no_grace',
    'active_days' => []
];

try {
    $mini_id = isset($_GET['mini_id']) ? intval($_GET['mini_id']) : 0;
    $parent_id = isset($_GET['parent_id']) ? intval($_GET['parent_id']) : 0;
    
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
    
    $settings = $defaultSettings;
    
    // Ayarları çek
    try {
        $stmt = $pdo->prepare("SELECT req_open_app, req_record_1min, req_play_1min, play_time_limit, break_tolerance 
                               FROM streak_settings WHERE mini_id = ?");
        $stmt->execute([$mini_id]);
        $dbSettings = $stmt->fetch();
        
        if ($dbSettings) {
            $settings['req_open_app'] = (int)$dbSettings['req_open_app'];
            $settings['req_record_1min'] = (int)$dbSettings['req_record_1min'];
            $settings['req_play_1min'] = (int)$dbSettings['req_play_1min'];
            $settings['play_time_limit'] = $dbSettings['play_time_limit'] ?: 'no_limit';
            $settings['break_tolerance'] = $dbSettings['break_tolerance'] ?: 'no_grace';
        }
    } catch (Exception $e) {
        // Tablo yoksa varsayılanları kullan
    }
    
    // Bu ayki aktif günleri çek
    $month = date('n');
    $year = date('Y');
    try {
        $stmt = $pdo->prepare("SELECT DAY(activity_date) as day 
                               FROM streak_history 
                               WHERE mini_id = ? AND MONTH(activity_date) = ? AND YEAR(activity_date) = ? AND has_activity = 1");
        $stmt->execute([$mini_id, $month, $year]);
        $settings['active_days'] = $stmt->fetchAll(PDO::FETCH_COLUMN);
    } catch (Exception $e) {
        // Tablo yoksa boş array
    }
    
    echo json_encode([
        'success' => true,
        'data' => $settings
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>