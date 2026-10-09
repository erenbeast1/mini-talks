<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require_once '../config/db.php';

$mini_id = isset($_GET['mini_id']) ? intval($_GET['mini_id']) : 0;

if (!$mini_id) {
    echo json_encode(['success' => false, 'error' => 'mini_id required']);
    exit;
}

try {
    global $pdo;
    
    // Get all mission completions for this mini
    $stmt = $pdo->prepare("
        SELECT 
            mc.mission_id,
            mp.mission_text,
            mc.completed_at,
            CASE 
                WHEN DATE(mc.completed_at) = CURDATE() THEN 'Today'
                ELSE DATE_FORMAT(mc.completed_at, '%b %d')
            END as date_label
        FROM mission_completions mc
        LEFT JOIN mission_presets mp ON mc.mission_id = mp.id
        WHERE mc.mini_id = ?
        ORDER BY mc.completed_at DESC
    ");
    $stmt->execute([$mini_id]);
    $completions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get completed mission IDs
    $completedIds = array_column($completions, 'mission_id');
    
    // Get all preset missions
    $stmt = $pdo->prepare("SELECT id, mission_text FROM mission_presets ORDER BY id");
    $stmt->execute();
    $presets = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Build missions array with completion status
    $missions = [];
    foreach ($presets as $preset) {
        $completionIndex = array_search($preset['id'], $completedIds);
        $dateLabel = null;
        
        if ($completionIndex !== false) {
            $dateLabel = $completions[$completionIndex]['date_label'];
        }
        
        $missions[] = [
            'mission_id' => $preset['id'],
            'mission_text' => $preset['mission_text'],
            'is_completed' => in_array($preset['id'], $completedIds),
            'date_label' => $dateLabel
        ];
    }
    
    // Calculate summary
    $totalCompleted = count($completedIds);
    
    // This week completions
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count FROM mission_completions 
        WHERE mini_id = ? AND completed_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
    ");
    $stmt->execute([$mini_id]);
    $thisWeekCompleted = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    // Total missions assigned this week
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count FROM mission_assignments 
        WHERE mini_id = ? AND assigned_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
    ");
    $stmt->execute([$mini_id]);
    $thisWeekTotal = max($stmt->fetch(PDO::FETCH_ASSOC)['count'], 7);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'missions' => $missions,
            'summary' => [
                'totalCompleted' => $totalCompleted,
                'thisWeekCompleted' => $thisWeekCompleted,
                'thisWeekTotal' => $thisWeekTotal
            ]
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
