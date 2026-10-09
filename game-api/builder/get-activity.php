<?php
// /minitalks-api/builder/get-activity.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

date_default_timezone_set('Europe/Istanbul');
require_once '../config/db.php';

try {
    $builder_id = isset($_GET['builder_id']) ? intval($_GET['builder_id']) : 0;
    $month = isset($_GET['month']) ? intval($_GET['month']) : date('n');
    $year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');
    
    if ($builder_id === 0) {
        throw new Exception('builder_id is required');
    }
    
    // Ay başı ve sonu
    $startDate = sprintf('%04d-%02d-01', $year, $month);
    $endDate = date('Y-m-t', strtotime($startDate));
    
    // Builder'ın o aydaki aktivitelerini çek (recording veya mission tamamlama)
    $activityDates = [];
    
    // Recording'lerden aktivite
    try {
        $stmt = $pdo->prepare("
            SELECT DISTINCT DATE(created_at) as activity_date
            FROM builder_recordings
            WHERE builder_id = ? AND DATE(created_at) BETWEEN ? AND ?
        ");
        $stmt->execute([$builder_id, $startDate, $endDate]);
        while ($row = $stmt->fetch()) {
            $activityDates[$row['activity_date']] = true;
        }
    } catch (Exception $e) {}
    
    // Mission tamamlamalarından aktivite
    try {
        $stmt = $pdo->prepare("
            SELECT DISTINCT DATE(completed_at) as activity_date
            FROM builder_missions
            WHERE builder_id = ? AND is_completed = 1 AND DATE(completed_at) BETWEEN ? AND ?
        ");
        $stmt->execute([$builder_id, $startDate, $endDate]);
        while ($row = $stmt->fetch()) {
            $activityDates[$row['activity_date']] = true;
        }
    } catch (Exception $e) {}
    
    // Login/session'lardan aktivite
    try {
        $stmt = $pdo->prepare("
            SELECT DISTINCT DATE(login_at) as activity_date
            FROM builder_sessions
            WHERE builder_id = ? AND DATE(login_at) BETWEEN ? AND ?
        ");
        $stmt->execute([$builder_id, $startDate, $endDate]);
        while ($row = $stmt->fetch()) {
            $activityDates[$row['activity_date']] = true;
        }
    } catch (Exception $e) {}
    
    // Streak'lerden aktivite (login.php'de güncelleniyor)
    try {
        $stmt = $pdo->prepare("
            SELECT last_activity_date as activity_date
            FROM builder_streaks
            WHERE builder_id = ? AND last_activity_date BETWEEN ? AND ?
        ");
        $stmt->execute([$builder_id, $startDate, $endDate]);
        while ($row = $stmt->fetch()) {
            if ($row['activity_date']) {
                $activityDates[$row['activity_date']] = true;
            }
        }
    } catch (Exception $e) {}
    
    echo json_encode([
        'success' => true,
        'data' => $activityDates
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>