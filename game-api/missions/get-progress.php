<?php
// /minitalks-api/missions/get-progress.php
// MissionsProgress için - tüm mission geçmişini filtreli döndürür
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
    $mini_id = isset($_GET['mini_id']) ? intval($_GET['mini_id']) : 0;
    $filter = isset($_GET['filter']) ? $_GET['filter'] : 'all';
    
    if ($mini_id === 0) {
        throw new Exception('mini_id is required');
    }
    
    $today = date('Y-m-d');
    $weekStart = date('Y-m-d', strtotime('monday this week'));
    $monthStart = date('Y-m-01');
    
    // Filtreye göre WHERE clause oluştur
    $whereClause = "WHERE mini_id = ?";
    $params = [$mini_id];
    
    switch ($filter) {
        case 'completed':
            $whereClause .= " AND is_completed = TRUE";
            break;
        case 'incompleted':
            $whereClause .= " AND is_completed = FALSE";
            break;
        case 'completed_week':
            $whereClause .= " AND is_completed = TRUE AND assigned_date >= ?";
            $params[] = $weekStart;
            break;
        case 'completed_month':
            $whereClause .= " AND is_completed = TRUE AND assigned_date >= ?";
            $params[] = $monthStart;
            break;
        // 'all' için ek filtre yok
    }
    
    // Mission'ları çek
    $stmt = $pdo->prepare("
        SELECT 
            id,
            mission_id,
            mission_text,
            assigned_date,
            is_completed,
            is_custom,
            completed_at
        FROM mission_assignments 
        $whereClause
        ORDER BY assigned_date DESC, id DESC
        LIMIT 90
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    
    $missions = [];
    foreach ($rows as $row) {
        $dateLabel = null;
        if ($row['is_completed']) {
            $assignedDate = $row['assigned_date'];
            if ($assignedDate === $today) {
                $dateLabel = 'Today';
            } else {
                $dateLabel = date('M j', strtotime($assignedDate));
            }
        }
        
        $missions[] = [
            'id' => intval($row['mission_id']),
            'text' => $row['mission_text'],
            'date_label' => $dateLabel,
            'is_completed' => (bool)$row['is_completed'],
            'is_custom' => (bool)$row['is_custom'],
            'assigned_date' => $row['assigned_date']
        ];
    }
    
    // Summary hesapla
    $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM mission_assignments WHERE mini_id = ? AND is_completed = TRUE");
    $stmt->execute([$mini_id]);
    $totalCompleted = $stmt->fetch()['total'];
    
    $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM mission_assignments WHERE mini_id = ? AND assigned_date >= ? AND is_completed = TRUE");
    $stmt->execute([$mini_id, $weekStart]);
    $weekCompleted = $stmt->fetch()['total'];
    
    $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM mission_assignments WHERE mini_id = ? AND assigned_date >= ?");
    $stmt->execute([$mini_id, $weekStart]);
    $weekTotal = $stmt->fetch()['total'];
    
    echo json_encode([
        'success' => true,
        'data' => [
            'missions' => $missions,
            'summary' => [
                'totalCompleted' => intval($totalCompleted),
                'thisWeekCompleted' => intval($weekCompleted),
                'thisWeekTotal' => intval($weekTotal)
            ]
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