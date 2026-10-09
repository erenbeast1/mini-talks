<?php
// /minitalks-api/builder/get-streak.php
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
    
    // Builder'ın streak bilgisini çek
    $stmt = $pdo->prepare("
        SELECT 
            current_streak,
            longest_streak,
            last_activity_date,
            streak_start_date
        FROM builder_streaks
        WHERE builder_id = ?
    ");
    $stmt->execute([$builder_id]);
    $streak = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$streak) {
        $streak = [
            'current_streak' => 0,
            'longest_streak' => 0,
            'last_activity_date' => null,
            'streak_start_date' => null
        ];
    }
    
    // Streak hedefini çek (varsa)
    $target = 7; // Default hedef
    try {
        $stmtTarget = $pdo->prepare("SELECT streak_target FROM builder_streak_settings WHERE builder_id = ?");
        $stmtTarget->execute([$builder_id]);
        $targetRow = $stmtTarget->fetch();
        if ($targetRow) {
            $target = $targetRow['streak_target'];
        }
    } catch (Exception $e) {}
    
    // Calendar data - o aydaki aktif günler
    $startDate = sprintf('%04d-%02d-01', $year, $month);
    $endDate = date('Y-m-t', strtotime($startDate));
    
    $calendarData = [];
    
    // Recording'lerden aktivite
    try {
        $calStmt = $pdo->prepare("
            SELECT DISTINCT DATE(created_at) as activity_date
            FROM builder_recordings
            WHERE builder_id = ? AND DATE(created_at) BETWEEN ? AND ?
        ");
        $calStmt->execute([$builder_id, $startDate, $endDate]);
        while ($row = $calStmt->fetch()) {
            $calendarData[$row['activity_date']] = true;
        }
    } catch (Exception $e) {}
    
    // Mission tamamlamalarından aktivite
    try {
        $calStmt = $pdo->prepare("
            SELECT DISTINCT mission_date as activity_date
            FROM builder_missions
            WHERE builder_id = ? AND mission_date BETWEEN ? AND ?
        ");
        $calStmt->execute([$builder_id, $startDate, $endDate]);
        while ($row = $calStmt->fetch()) {
            $calendarData[$row['activity_date']] = true;
        }
    } catch (Exception $e) {}
    
    // Streak'ten aktivite
    if ($streak['last_activity_date'] && $streak['last_activity_date'] >= $startDate && $streak['last_activity_date'] <= $endDate) {
        $calendarData[$streak['last_activity_date']] = true;
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'current_streak' => (int)$streak['current_streak'],
            'longest_streak' => (int)$streak['longest_streak'],
            'last_activity_date' => $streak['last_activity_date'],
            'streak_start_date' => $streak['streak_start_date'],
            'target' => $target,
            'calendar' => $calendarData
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>