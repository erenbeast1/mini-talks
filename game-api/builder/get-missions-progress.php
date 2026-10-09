<?php
// /minitalks-api/builder/get-missions-progress.php
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
    $filter = isset($_GET['filter']) ? $_GET['filter'] : 'all'; // all, completed, pending
    $date = isset($_GET['date']) ? $_GET['date'] : null;
    
    if ($builder_id === 0) {
        throw new Exception('builder_id is required');
    }
    
    // Base query
    $whereClause = "WHERE bm.builder_id = ?";
    $params = [$builder_id];
    
    // Filter
    if ($filter === 'completed') {
        $whereClause .= " AND bm.is_completed = 1";
    } elseif ($filter === 'pending') {
        $whereClause .= " AND bm.is_completed = 0";
    }
    
    // Date filter
    if ($date) {
        $whereClause .= " AND bm.mission_date = ?";
        $params[] = $date;
    }
    
    // Missions'ları çek
    $stmt = $pdo->prepare("
        SELECT 
            bm.mission_id,
            bm.builder_id,
            bm.mission_text,
            bm.is_completed,
            bm.completed_at,
            bm.mission_date,
            mp.trigger_type,
            mp.trigger_value
        FROM builder_missions bm
        LEFT JOIN mission_presets mp ON bm.mission_id = mp.id
        {$whereClause}
        ORDER BY bm.mission_date DESC, bm.mission_id ASC
        LIMIT 100
    ");
    $stmt->execute($params);
    $missions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Stats hesapla
    $totalMissions = count($missions);
    $completedMissions = count(array_filter($missions, fn($m) => $m['is_completed']));
    $pendingMissions = $totalMissions - $completedMissions;
    
    // Bu hafta tamamlanan
    $weekStart = date('Y-m-d', strtotime('monday this week'));
    $completedThisWeek = 0;
    foreach ($missions as $m) {
        if ($m['is_completed'] && $m['mission_date'] >= $weekStart) {
            $completedThisWeek++;
        }
    }
    
    // Bu ay tamamlanan
    $monthStart = date('Y-m-01');
    $completedThisMonth = 0;
    foreach ($missions as $m) {
        if ($m['is_completed'] && $m['mission_date'] >= $monthStart) {
            $completedThisMonth++;
        }
    }
    
    // Günlere göre grupla
    $byDate = [];
    foreach ($missions as $m) {
        $date = $m['mission_date'];
        if (!isset($byDate[$date])) {
            $byDate[$date] = [
                'date' => $date,
                'total' => 0,
                'completed' => 0,
                'missions' => []
            ];
        }
        $byDate[$date]['total']++;
        if ($m['is_completed']) {
            $byDate[$date]['completed']++;
        }
        $byDate[$date]['missions'][] = $m;
    }
    
    echo json_encode([
        'success' => true,
        'data' => $missions,
        'by_date' => array_values($byDate),
        'stats' => [
            'total' => $totalMissions,
            'completed' => $completedMissions,
            'pending' => $pendingMissions,
            'completed_this_week' => $completedThisWeek,
            'completed_this_month' => $completedThisMonth,
            'completion_rate' => $totalMissions > 0 ? round(($completedMissions / $totalMissions) * 100) : 0
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
