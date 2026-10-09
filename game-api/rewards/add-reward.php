<?php
/**
 * Add Reward API
 * Mini'ye yeni reward ekler ve totals'ı günceller
 * 
 * POST /rewards/add-reward.php
 * Body: { mini_id, reward_type, scene_id?, level_id?, notes? }
 * 
 * Reward Types:
 * - Bricks: daily_brick, recording_brick, streak_brick, mini_creation_brick, mission_brick
 * - Medals: new_scene_medal, new_level_medal, completion_medal, streak_medal, progress_medal, achievement_medal
 * - Cups: gold_cup, streak_champion_cup, mini_champion_cup
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/db.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $mini_id = isset($input['mini_id']) ? intval($input['mini_id']) : 0;
    $reward_type = isset($input['reward_type']) ? trim($input['reward_type']) : '';
    $scene_id = isset($input['scene_id']) ? intval($input['scene_id']) : null;
    $level_id = isset($input['level_id']) ? intval($input['level_id']) : null;
    $notes = isset($input['notes']) ? trim($input['notes']) : null;
    
    if (!$mini_id || !$reward_type) {
        throw new Exception('mini_id and reward_type are required');
    }
    
    // Reward type validasyonu ve kategori belirleme
    $brickTypes = ['daily_brick', 'recording_brick', 'streak_brick', 'mini_creation_brick', 'mission_brick'];
    $medalTypes = ['new_scene_medal', 'new_level_medal', 'completion_medal', 'streak_medal', 'progress_medal', 'achievement_medal'];
    $cupTypes = ['gold_cup', 'streak_champion_cup', 'mini_champion_cup'];
    
    $reward_category = null;
    if (in_array($reward_type, $brickTypes)) {
        $reward_category = 'brick';
    } elseif (in_array($reward_type, $medalTypes)) {
        $reward_category = 'medal';
    } elseif (in_array($reward_type, $cupTypes)) {
        $reward_category = 'cup';
    } else {
        throw new Exception('Invalid reward_type');
    }
    
    $conn = getDBConnection();
    $conn->beginTransaction();
    
    try {
        // Daily limit check
        $stmt = $conn->prepare("SELECT daily_limit FROM reward_settings WHERE mini_id = ?");
        $stmt->execute([$mini_id]);
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);
        $dailyLimit = $settings ? intval($settings['daily_limit']) : 0;
        
        if ($dailyLimit > 0) {
            // How many rewards were earned today
            $stmt = $conn->prepare("
                SELECT COUNT(*) as today_count 
                FROM mini_rewards 
                WHERE mini_id = ? AND DATE(earned_at) = CURDATE()
            ");
            $stmt->execute([$mini_id]);
            $todayCount = intval($stmt->fetch(PDO::FETCH_ASSOC)['today_count']);
            
            if ($todayCount >= $dailyLimit) {
                throw new Exception('Daily reward limit reached');
            }
        }
        
        // Reward ekle
        $stmt = $conn->prepare("
            INSERT INTO mini_rewards (mini_id, reward_type, reward_category, scene_id, level_id, notes, earned_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$mini_id, $reward_type, $reward_category, $scene_id, $level_id, $notes]);
        $reward_id = $conn->lastInsertId();
        
        // mini_profiles totals güncelle
        $column = '';
        if ($reward_category === 'brick') $column = 'total_bricks';
        elseif ($reward_category === 'medal') $column = 'total_medals';
        elseif ($reward_category === 'cup') $column = 'total_cups';
        
        if ($column) {
            $stmt = $conn->prepare("
                UPDATE mini_profiles 
                SET {$column} = {$column} + 1, updated_at = NOW()
                WHERE mini_id = ?
            ");
            $stmt->execute([$mini_id]);
        }
        
        // Auto-conversion kontrolü (brick -> medal, medal -> cup)
        $conversions = [];
        
        // Brick to Medal conversion
        if ($reward_category === 'brick') {
            $stmt = $conn->prepare("SELECT brick_to_medal FROM reward_settings WHERE mini_id = ?");
            $stmt->execute([$mini_id]);
            $convSettings = $stmt->fetch(PDO::FETCH_ASSOC);
            $brickToMedal = $convSettings ? intval($convSettings['brick_to_medal']) : 10;
            
            // Total brick count
            $stmt = $conn->prepare("SELECT total_bricks FROM mini_profiles WHERE mini_id = ?");
            $stmt->execute([$mini_id]);
            $totalBricks = intval($stmt->fetch(PDO::FETCH_ASSOC)['total_bricks']);
            
            // Medals already converted before now
            $stmt = $conn->prepare("
                SELECT COUNT(*) as converted 
                FROM mini_rewards 
                WHERE mini_id = ? AND reward_type = 'progress_medal' AND notes LIKE 'Auto-converted from%bricks'
            ");
            $stmt->execute([$mini_id]);
            $convertedMedals = intval($stmt->fetch(PDO::FETCH_ASSOC)['converted']);
            
            // How many new medals are owed
            $shouldHaveMedals = floor($totalBricks / $brickToMedal);
            $newMedals = $shouldHaveMedals - $convertedMedals;
            
            if ($newMedals > 0) {
                for ($i = 0; $i < $newMedals; $i++) {
                    $stmt = $conn->prepare("
                        INSERT INTO mini_rewards (mini_id, reward_type, reward_category, notes, earned_at)
                        VALUES (?, 'progress_medal', 'medal', ?, NOW())
                    ");
                    $stmt->execute([$mini_id, "Auto-converted from {$brickToMedal} bricks"]);
                    
                    // Update the medal total
                    $stmt = $conn->prepare("UPDATE mini_profiles SET total_medals = total_medals + 1 WHERE mini_id = ?");
                    $stmt->execute([$mini_id]);
                }
                $conversions[] = ['type' => 'brick_to_medal', 'count' => $newMedals];
            }
        }
        
        // Medal to Cup conversion
        if ($reward_category === 'medal' || !empty($conversions)) {
            $stmt = $conn->prepare("SELECT medal_to_cup FROM reward_settings WHERE mini_id = ?");
            $stmt->execute([$mini_id]);
            $convSettings = $stmt->fetch(PDO::FETCH_ASSOC);
            $medalToCup = $convSettings ? intval($convSettings['medal_to_cup']) : 10;
            
            // Toplam medal sayısı
            $stmt = $conn->prepare("SELECT total_medals FROM mini_profiles WHERE mini_id = ?");
            $stmt->execute([$mini_id]);
            $totalMedals = intval($stmt->fetch(PDO::FETCH_ASSOC)['total_medals']);
            
            // Daha önce convert edilen cup sayısı
            $stmt = $conn->prepare("
                SELECT COUNT(*) as converted 
                FROM mini_rewards 
                WHERE mini_id = ? AND reward_type = 'gold_cup' AND notes LIKE 'Auto-converted from%medals'
            ");
            $stmt->execute([$mini_id]);
            $convertedCups = intval($stmt->fetch(PDO::FETCH_ASSOC)['converted']);
            
            // Yeni convert edilmesi gereken cup sayısı
            $shouldHaveCups = floor($totalMedals / $medalToCup);
            $newCups = $shouldHaveCups - $convertedCups;
            
            if ($newCups > 0) {
                for ($i = 0; $i < $newCups; $i++) {
                    $stmt = $conn->prepare("
                        INSERT INTO mini_rewards (mini_id, reward_type, reward_category, notes, earned_at)
                        VALUES (?, 'gold_cup', 'cup', ?, NOW())
                    ");
                    $stmt->execute([$mini_id, "Auto-converted from {$medalToCup} medals"]);
                    
                    // Total cups güncelle
                    $stmt = $conn->prepare("UPDATE mini_profiles SET total_cups = total_cups + 1 WHERE mini_id = ?");
                    $stmt->execute([$mini_id]);
                }
                $conversions[] = ['type' => 'medal_to_cup', 'count' => $newCups];
            }
        }
        
        $conn->commit();
        
        // Güncel totals'ı döndür
        $stmt = $conn->prepare("SELECT total_bricks, total_medals, total_cups FROM mini_profiles WHERE mini_id = ?");
        $stmt->execute([$mini_id]);
        $totals = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'message' => 'Reward added successfully',
            'data' => [
                'reward_id' => intval($reward_id),
                'reward_type' => $reward_type,
                'reward_category' => $reward_category,
                'conversions' => $conversions,
                'totals' => [
                    'bricks' => intval($totals['total_bricks']),
                    'medals' => intval($totals['total_medals']),
                    'cups' => intval($totals['total_cups'])
                ]
            ]
        ]);
        
    } catch (Exception $e) {
        $conn->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
