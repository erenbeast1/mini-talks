<?php
// /minitalks-api/mini/get-activity.php
// MiniManage takvimi için aktivite verisi - streak_history'den çeker
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Türkiye saat dilimi (UTC+3)
date_default_timezone_set('Europe/Istanbul');

require_once '../config/db.php';

try {
    $mini_id = isset($_GET['mini_id']) ? intval($_GET['mini_id']) : 0;
    $month = isset($_GET['month']) ? intval($_GET['month']) : date('n');
    $year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');
    
    if ($mini_id === 0) {
        throw new Exception('mini_id is required');
    }
    
    $activityData = [];
    
    // streak_history'den bu ayki aktiviteleri çek
    $stmt = $pdo->prepare("SELECT DATE_FORMAT(activity_date, '%Y-%m-%d') as activity_date 
                           FROM streak_history 
                           WHERE mini_id = ? AND MONTH(activity_date) = ? AND YEAR(activity_date) = ? AND app_opened = 1
                           ORDER BY activity_date ASC");
    $stmt->execute([$mini_id, $month, $year]);
    $dates = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Tarihleri obje formatına çevir: { "2025-12-23": true }
    foreach ($dates as $date) {
        $activityData[$date] = true;
    }
    
    echo json_encode([
        'success' => true,
        'data' => $activityData
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'data' => []
    ]);
}
?>