<?php
// /minitalks-api/builder/get-rewards.php
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
    
    if ($builder_id === 0) {
        throw new Exception('builder_id is required');
    }
    
    // Builder'ın toplam ödüllerini çek
    $stmt = $pdo->prepare("
        SELECT 
            COALESCE(total_bricks, 0) as bricks,
            COALESCE(total_medals, 0) as medals,
            COALESCE(total_cups, 0) as cups
        FROM builder_rewards
        WHERE builder_id = ?
    ");
    $stmt->execute([$builder_id]);
    $rewards = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$rewards) {
        $rewards = [
            'bricks' => 0,
            'medals' => 0,
            'cups' => 0
        ];
    }
    
    // Brick türlerine göre sayıları hesapla
    $brickTypes = [
        'daily_brick' => 0,
        'recording_brick' => 0,
        'streak_brick' => 0,
        'mini_creation_brick' => 0,
        'mission_brick' => 0,
        'customize_brick' => 0
    ];
    
    $brickStmt = $pdo->prepare("
        SELECT reward_name, COUNT(*) as cnt
        FROM builder_rewards_log
        WHERE builder_id = ? AND reward_type = 'brick'
        GROUP BY reward_name
    ");
    $brickStmt->execute([$builder_id]);
    while ($row = $brickStmt->fetch(PDO::FETCH_ASSOC)) {
        $name = $row['reward_name'] ?? 'recording_brick';
        if (isset($brickTypes[$name])) {
            $brickTypes[$name] = (int)$row['cnt'];
        } else {
            $brickTypes['recording_brick'] += (int)$row['cnt'];
        }
    }
    
    // Weekly & Monthly totals
    $weekStart = date('Y-m-d', strtotime('monday this week'));
    $monthStart = date('Y-m-01');
    
    // Weekly
    $weeklyStmt = $pdo->prepare("
        SELECT 
            SUM(CASE WHEN reward_type = 'brick' THEN reward_amount ELSE 0 END) as bricks,
            SUM(CASE WHEN reward_type = 'medal' THEN reward_amount ELSE 0 END) as medals,
            SUM(CASE WHEN reward_type = 'cup' THEN reward_amount ELSE 0 END) as cups
        FROM builder_rewards_log
        WHERE builder_id = ? AND DATE(earned_at) >= ?
    ");
    $weeklyStmt->execute([$builder_id, $weekStart]);
    $weekly = $weeklyStmt->fetch(PDO::FETCH_ASSOC) ?: ['bricks' => 0, 'medals' => 0, 'cups' => 0];
    
    // Monthly
    $monthlyStmt = $pdo->prepare("
        SELECT 
            SUM(CASE WHEN reward_type = 'brick' THEN reward_amount ELSE 0 END) as bricks,
            SUM(CASE WHEN reward_type = 'medal' THEN reward_amount ELSE 0 END) as medals,
            SUM(CASE WHEN reward_type = 'cup' THEN reward_amount ELSE 0 END) as cups
        FROM builder_rewards_log
        WHERE builder_id = ? AND DATE(earned_at) >= ?
    ");
    $monthlyStmt->execute([$builder_id, $monthStart]);
    $monthly = $monthlyStmt->fetch(PDO::FETCH_ASSOC) ?: ['bricks' => 0, 'medals' => 0, 'cups' => 0];
    
    // Son kazanılan ödülleri çek
    $stmtRecent = $pdo->prepare("
        SELECT 
            reward_type,
            reward_name,
            reward_amount,
            notes,
            earned_at
        FROM builder_rewards_log
        WHERE builder_id = ?
        ORDER BY earned_at DESC
        LIMIT 20
    ");
    $stmtRecent->execute([$builder_id]);
    $recentRewards = $stmtRecent->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'totals' => [
                'bricks' => (int)$rewards['bricks'],
                'medals' => (int)$rewards['medals'],
                'cups' => (int)$rewards['cups']
            ],
            'weekly' => [
                'bricks' => (int)($weekly['bricks'] ?? 0),
                'medals' => (int)($weekly['medals'] ?? 0),
                'cups' => (int)($weekly['cups'] ?? 0)
            ],
            'monthly' => [
                'bricks' => (int)($monthly['bricks'] ?? 0),
                'medals' => (int)($monthly['medals'] ?? 0),
                'cups' => (int)($monthly['cups'] ?? 0)
            ],
            'bricks' => $brickTypes,
            'medals' => [
                'new_scene_medal' => 0,
                'new_level_medal' => 0,
                'completion_medal' => 0,
                'streak_medal' => 0,
                'progress_medal' => 0,
                'achievement_medal' => 0
            ],
            'cups' => [
                'gold_cup' => 0,
                'streak_champion_cup' => 0,
                'mini_champion_cup' => 0
            ],
            'recent' => $recentRewards
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