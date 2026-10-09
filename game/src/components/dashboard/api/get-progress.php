<?php
// /minitalks-api/missions/get-progress.php
// MissionsProgress için - tüm mission'ları tamamlama durumlarıyla döndürür
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
    
    // Tarih hesaplamaları
    $today = date('Y-m-d');
    $yesterday = date('Y-m-d', strtotime('-1 day'));
    $weekStart = date('Y-m-d', strtotime('monday this week'));
    $monthStart = date('Y-m-01');
    
    // Preset mission'ları çek
    $presets = [];
    try {
        $stmt = $pdo->query("SELECT id, mission_text FROM mission_presets ORDER BY id ASC");
        $dbPresets = $stmt->fetchAll();
        foreach ($dbPresets as $p) {
            $presets[$p['id']] = $p['mission_text'];
        }
    } catch (Exception $e) {}
    
    // Tamamlanan mission'ları çek (en son tamamlama tarihi)
    $completions = [];
    try {
        $stmt = $pdo->prepare("SELECT mission_id, MAX(DATE(completed_at)) as completed_date 
                               FROM mission_completions 
                               WHERE mini_id = ? AND mission_id IS NOT NULL
                               GROUP BY mission_id");
        $stmt->execute([$mini_id]);
        $dbCompletions = $stmt->fetchAll();
        
        foreach ($dbCompletions as $c) {
            $missionId = intval($c['mission_id']);
            $completions[$missionId] = $c['completed_date'];
        }
    } catch (Exception $e) {}
    
    // Tüm mission'ları işle
    $allMissions = [];
    foreach ($presets as $id => $text) {
        $completedDate = isset($completions[$id]) ? $completions[$id] : null;
        $isCompleted = ($completedDate !== null);
        
        // Tarih etiketi
        $dateLabel = null;
        $completedThisWeek = false;
        $completedThisMonth = false;
        
        if ($completedDate) {
            if ($completedDate === $today) {
                $dateLabel = 'Today';
            } else if ($completedDate === $yesterday) {
                $dateLabel = 'Yesterday';
            } else {
                $dateLabel = date('M j', strtotime($completedDate));
            }
            
            $completedThisWeek = ($completedDate >= $weekStart);
            $completedThisMonth = ($completedDate >= $monthStart);
        }
        
        $allMissions[] = [
            'id' => $id,
            'text' => $text,
            'is_completed' => $isCompleted,
            'date_label' => $dateLabel,
            'completed_this_week' => $completedThisWeek,
            'completed_this_month' => $completedThisMonth
        ];
    }
    
    // Filtreleme
    $filteredMissions = $allMissions;
    if ($filter !== 'all') {
        $filteredMissions = array_filter($allMissions, function($m) use ($filter) {
            switch ($filter) {
                case 'completed':
                    return $m['is_completed'] === true;
                case 'incompleted':
                    return $m['is_completed'] === false;
                case 'completed_week':
                    return $m['completed_this_week'] === true;
                case 'completed_month':
                    return $m['completed_this_month'] === true;
                default:
                    return true;
            }
        });
        $filteredMissions = array_values($filteredMissions);
    }
    
    // İstatistikler
    $totalCompleted = count(array_filter($allMissions, function($m) { return $m['is_completed']; }));
    $thisWeekCompleted = count(array_filter($allMissions, function($m) { return $m['completed_this_week']; }));
    $thisMonthCompleted = count(array_filter($allMissions, function($m) { return $m['completed_this_month']; }));
    
    echo json_encode([
        'success' => true,
        'data' => [
            'missions' => $filteredMissions,
            'summary' => [
                'totalCompleted' => $totalCompleted,
                'thisWeekCompleted' => $thisWeekCompleted,
                'thisMonthCompleted' => $thisMonthCompleted,
                'totalMissions' => count($presets)
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
