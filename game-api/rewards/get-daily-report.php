<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/db.php';

try {
    $mini_id = isset($_GET['mini_id']) ? intval($_GET['mini_id']) : 0;
    $date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
    
    if (!$mini_id) {
        throw new Exception('mini_id is required');
    }
    
    // Validate date format
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        $date = date('Y-m-d');
    }
    
    // Get streak_history for this date
    $stmt = $pdo->prepare("
        SELECT sh.*, mp.message_text as motivation_message
        FROM streak_history sh
        LEFT JOIN motivation_presets mp ON sh.motivation_message_id = mp.preset_id
        WHERE sh.mini_id = ? AND sh.activity_date = ?
    ");
    $stmt->execute([$mini_id, $date]);
    $history = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Get missions for this date
    $stmt = $pdo->prepare("
        SELECT mission_text, is_completed 
        FROM mission_assignments 
        WHERE mini_id = ? AND assigned_date = ?
        ORDER BY id ASC
    ");
    $stmt->execute([$mini_id, $date]);
    $missionRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $missions = [];
    foreach ($missionRows as $row) {
        $missions[] = [
            'text' => $row['mission_text'],
            'completed' => (bool)$row['is_completed']
        ];
    }
    
    // Get rewards for this date
    $stmt = $pdo->prepare("
        SELECT reward_type, reward_category 
        FROM mini_rewards 
        WHERE mini_id = ? AND DATE(earned_at) = ?
        ORDER BY earned_at ASC
    ");
    $stmt->execute([$mini_id, $date]);
    $rewardRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $brickTags = [];
    $medalTags = [];
    $cupTags = [];
    
    // Reward type to display name mapping
    $rewardNames = [
        'daily_brick' => 'Daily Brick',
        'recording_brick' => 'Recording Brick',
        'streak_brick' => 'Streak Brick',
        'mini_creation_brick' => 'Mini Creation Brick',
        'mission_brick' => 'Mission Brick',
        'new_scene_medal' => 'New Scene Medal',
        'new_level_medal' => 'New Level Medal',
        'completion_medal' => 'Completion Medal',
        'streak_medal' => 'Streak Medal',
        'progress_medal' => 'Progress Medal',
        'achievement_medal' => 'Achievement Medal',
        'gold_cup' => 'Gold Cup',
        'streak_champion_cup' => 'Streak Champion Cup',
        'mini_champion_cup' => 'Mini Champion Cup'
    ];
    
    foreach ($rewardRows as $row) {
        $type = $row['reward_type'];
        $category = $row['reward_category'];
        $displayName = $rewardNames[$type] ?? $type;
        
        if ($category === 'brick') {
            $brickTags[] = $displayName;
        } elseif ($category === 'medal') {
            $medalTags[] = $displayName;
        } elseif ($category === 'cup') {
            $cupTags[] = $displayName;
        }
    }
    
    $rewards = [
        'bricks' => count($brickTags),
        'brickTags' => $brickTags,
        'medals' => count($medalTags),
        'medalTags' => $medalTags,
        'cups' => count($cupTags),
        'cupTags' => $cupTags
    ];
    
    if ($history) {
        echo json_encode([
            'success' => true,
            'data' => [
                'play_time_seconds' => intval($history['play_time_seconds']),
                'record_time_seconds' => intval($history['record_time_seconds']),
                'recording_count' => intval($history['recording_count']),
                'scenes_played' => json_decode($history['scenes_played'] ?? '[]', true) ?: [],
                'levels_used' => json_decode($history['levels_used'] ?? '[]', true) ?: [],
                'customized_minis_count' => intval($history['customized_minis_count']),
                'motivation_message' => $history['motivation_message'] ?? '',
                'missions' => $missions,
                'rewards' => $rewards
            ]
        ]);
    } else {
        // No activity on this date
        echo json_encode([
            'success' => true,
            'data' => [
                'play_time_seconds' => 0,
                'record_time_seconds' => 0,
                'recording_count' => 0,
                'scenes_played' => [],
                'levels_used' => [],
                'customized_minis_count' => 0,
                'motivation_message' => '',
                'missions' => $missions,
                'rewards' => $rewards
            ]
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
