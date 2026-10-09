<?php
/**
 * Seed Rewards - Test Data Generator
 * BU DOSYAYI BİR KEZ ÇALIŞTIR, SONRA SİL!
 * 
 * URL: https://mini-talks.org/minitalks-api/rewards/seed-rewards.php?mini_id=4
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once '../config/db.php';


try {
    $mini_id = isset($_GET['mini_id']) ? intval($_GET['mini_id']) : 0;
    
    if (!$mini_id) {
        throw new Exception('mini_id is required');
    }
    
    $conn = getDBConnection();
    
    // Önce mevcut test verilerini temizle
    $stmt = $conn->prepare("DELETE FROM mini_rewards WHERE mini_id = ?");
    $stmt->execute([$mini_id]);
    
    // Rewards to seed
    $rewards = [
        // Bricks (son 30 gün içinde rastgele)
        ['daily_brick', 'brick', 45],
        ['recording_brick', 'brick', 30],
        ['streak_brick', 'brick', 25],
        ['mini_creation_brick', 'brick', 15],
        ['mission_brick', 'brick', 10],
        
        // Medals
        ['new_scene_medal', 'medal', 3],
        ['new_level_medal', 'medal', 4],
        ['completion_medal', 'medal', 2],
        ['streak_medal', 'medal', 1],
        ['progress_medal', 'medal', 1],
        ['achievement_medal', 'medal', 1],
        
        // Cups
        ['gold_cup', 'cup', 1],
        ['streak_champion_cup', 'cup', 1],
        ['mini_champion_cup', 'cup', 1]
    ];
    
    $totalBricks = 0;
    $totalMedals = 0;
    $totalCups = 0;
    $insertedCount = 0;
    
    foreach ($rewards as $reward) {
        $type = $reward[0];
        $category = $reward[1];
        $count = $reward[2];
        
        for ($i = 0; $i < $count; $i++) {
            // Rastgele tarih (son 30 gün)
            $daysAgo = rand(0, 30);
            $hoursAgo = rand(0, 23);
            $date = date('Y-m-d H:i:s', strtotime("-{$daysAgo} days -{$hoursAgo} hours"));
            
            $stmt = $conn->prepare("
                INSERT INTO mini_rewards (mini_id, reward_type, reward_category, earned_at, notes)
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmt->execute([$mini_id, $type, $category, $date, 'Seeded test data']);
            $insertedCount++;
        }
        
        // Toplam sayıları güncelle
        if ($category === 'brick') $totalBricks += $count;
        elseif ($category === 'medal') $totalMedals += $count;
        elseif ($category === 'cup') $totalCups += $count;
    }
    
    // mini_profiles'ı güncelle
    $stmt = $conn->prepare("
        UPDATE mini_profiles 
        SET total_bricks = ?, total_medals = ?, total_cups = ?, updated_at = NOW()
        WHERE mini_id = ?
    ");
    $stmt->execute([$totalBricks, $totalMedals, $totalCups, $mini_id]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Rewards seeded successfully',
        'data' => [
            'inserted_rewards' => $insertedCount,
            'totals' => [
                'bricks' => $totalBricks,
                'medals' => $totalMedals,
                'cups' => $totalCups
            ]
        ],
        'warning' => 'DELETE THIS FILE AFTER TESTING!'
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
