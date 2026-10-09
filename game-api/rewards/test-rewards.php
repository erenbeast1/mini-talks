<?php
/**
 * Test Rewards System
 * Tüm reward trigger'larını test eder
 * 
 * GET /rewards/test-rewards.php?mini_id=4&action=daily|mission|recording|customization|status
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

date_default_timezone_set('Europe/Istanbul');
require_once '../config/db.php';
require_once  'reward-triggers.php';

try {
    $mini_id = isset($_GET['mini_id']) ? intval($_GET['mini_id']) : 0;
    $action = isset($_GET['action']) ? $_GET['action'] : 'status';
    
    if (!$mini_id) {
        throw new Exception('mini_id is required');
    }
    
    $result = [];
    
    switch ($action) {
        case 'daily':
            // Günlük aktivite simüle et
            $rewards = RewardTriggers::onDailyActivity($pdo, $mini_id);
            $result = [
                'action' => 'daily_activity',
                'rewards_earned' => $rewards,
                'description' => 'Simulated daily activity - should give daily_brick and streak rewards if applicable'
            ];
            break;
            
        case 'mission':
            // Mission tamamlama simüle et
            $rewards = RewardTriggers::onMissionComplete($pdo, $mini_id, 'Test mission completed');
            $result = [
                'action' => 'mission_complete',
                'rewards_earned' => $rewards,
                'description' => 'Simulated mission completion - should give mission_brick'
            ];
            break;
            
        case 'recording':
            // Recording simüle et
            $rewards = RewardTriggers::onRecording($pdo, $mini_id, 1, 1);
            $result = [
                'action' => 'recording',
                'rewards_earned' => $rewards,
                'description' => 'Simulated recording - should give recording_brick'
            ];
            break;
            
        case 'customization':
            // Mini customization simüle et
            $rewards = RewardTriggers::onMiniCustomization($pdo, $mini_id, 1);
            $result = [
                'action' => 'mini_customization',
                'rewards_earned' => $rewards,
                'description' => 'Simulated mini customization - should give mini_creation_brick'
            ];
            break;
            
        case 'status':
        default:
            // Mevcut durumu göster
            $stmt = $pdo->prepare("SELECT total_bricks, total_medals, total_cups FROM mini_profiles WHERE mini_id = ?");
            $stmt->execute([$mini_id]);
            $totals = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Son 10 reward
            $stmt = $pdo->prepare("SELECT reward_type, reward_category, notes, earned_at 
                                   FROM mini_rewards WHERE mini_id = ? 
                                   ORDER BY earned_at DESC LIMIT 10");
            $stmt->execute([$mini_id]);
            $recentRewards = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Streak bilgisi
            $stmt = $pdo->prepare("SELECT current_streak, longest_streak, total_active_days FROM streak_summary WHERE mini_id = ?");
            $stmt->execute([$mini_id]);
            $streak = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Bugün kazanılan
            $stmt = $pdo->prepare("SELECT reward_type, COUNT(*) as cnt FROM mini_rewards 
                                   WHERE mini_id = ? AND DATE(earned_at) = CURDATE() 
                                   GROUP BY reward_type");
            $stmt->execute([$mini_id]);
            $todayRewards = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Settings
            $stmt = $pdo->prepare("SELECT brick_to_medal, medal_to_cup, daily_limit FROM reward_settings WHERE mini_id = ?");
            $stmt->execute([$mini_id]);
            $settings = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $result = [
                'action' => 'status',
                'totals' => [
                    'bricks' => intval($totals['total_bricks'] ?? 0),
                    'medals' => intval($totals['total_medals'] ?? 0),
                    'cups' => intval($totals['total_cups'] ?? 0)
                ],
                'streak' => [
                    'current' => intval($streak['current_streak'] ?? 0),
                    'longest' => intval($streak['longest_streak'] ?? 0),
                    'total_days' => intval($streak['total_active_days'] ?? 0)
                ],
                'settings' => $settings ?: ['brick_to_medal' => 10, 'medal_to_cup' => 10, 'daily_limit' => 0],
                'today_rewards' => $todayRewards,
                'recent_rewards' => $recentRewards
            ];
            break;
    }
    
    // Her zaman güncel totals'ı ekle
    $stmt = $pdo->prepare("SELECT total_bricks, total_medals, total_cups FROM mini_profiles WHERE mini_id = ?");
    $stmt->execute([$mini_id]);
    $totals = $stmt->fetch(PDO::FETCH_ASSOC);
    $result['current_totals'] = [
        'bricks' => intval($totals['total_bricks'] ?? 0),
        'medals' => intval($totals['total_medals'] ?? 0),
        'cups' => intval($totals['total_cups'] ?? 0)
    ];
    
    echo json_encode([
        'success' => true,
        'data' => $result
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
