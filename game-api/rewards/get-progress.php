<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/db.php';
require_once 'check-conversions.php';  // ✅ EKLENDİ

try {
    $mini_id = isset($_GET['mini_id']) ? intval($_GET['mini_id']) : 0;
    
    if (!$mini_id) {
        throw new Exception('mini_id is required');
    }
    
    // ✅ HER SAYFA YÜKLEMESİNDE CONVERSION CHECK YAP
    $conversionResult = checkAndApplyConversions($pdo, $mini_id, false);
    
    // Totals from mini_profiles (artık conversion sonrası güncel değerler)
    $stmt = $pdo->prepare("SELECT total_bricks, total_medals, total_cups FROM mini_profiles WHERE mini_id = ?");
    $stmt->execute([$mini_id]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $totals = [
        'bricks' => intval($profile['total_bricks'] ?? 0),
        'medals' => intval($profile['total_medals'] ?? 0),
        'cups' => intval($profile['total_cups'] ?? 0)
    ];
    
    // Bricks breakdown
    $stmt = $pdo->prepare("SELECT reward_type, COUNT(*) as count FROM mini_rewards WHERE mini_id = ? AND reward_category = 'brick' GROUP BY reward_type");
    $stmt->execute([$mini_id]);
    $brickRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $bricks = ['daily_brick' => 0, 'recording_brick' => 0, 'streak_brick' => 0, 'mini_creation_brick' => 0, 'mission_brick' => 0];
    foreach ($brickRows as $row) {
        if (isset($bricks[$row['reward_type']])) {
            $bricks[$row['reward_type']] = intval($row['count']);
        }
    }
    
    // ✅ Daily brick'i streak_history'den hesapla (daha doğru)
    // Her aktif gün = 1 daily brick olmalı
    try {
        $stmt = $pdo->prepare("
            SELECT COUNT(DISTINCT active_date) as active_days FROM (
                SELECT activity_date as active_date FROM streak_history WHERE mini_id = ? AND app_opened = 1
                UNION
                SELECT DATE(recorded_at) as active_date FROM scene_recordings WHERE mini_id = ?
                UNION
                SELECT DATE(created_at) as active_date FROM customized_minis WHERE mini_id = ?
            ) as all_activities
        ");
        $stmt->execute([$mini_id, $mini_id, $mini_id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $bricks['daily_brick'] = intval($result['active_days'] ?? 0);
    } catch (Exception $e) {
        // Hata durumunda mini_rewards'daki değeri kullan
    }
    
    // Medals breakdown
    $stmt = $pdo->prepare("SELECT reward_type, COUNT(*) as count FROM mini_rewards WHERE mini_id = ? AND reward_category = 'medal' GROUP BY reward_type");
    $stmt->execute([$mini_id]);
    $medalRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $medals = ['new_scene_medal' => 0, 'new_level_medal' => 0, 'completion_medal' => 0, 'streak_medal' => 0, 'progress_medal' => 0, 'achievement_medal' => 0, 'conversion_medal' => 0];
    foreach ($medalRows as $row) {
        if (isset($medals[$row['reward_type']])) {
            $medals[$row['reward_type']] = intval($row['count']);
        }
    }
    
    // Cups breakdown
    $stmt = $pdo->prepare("SELECT reward_type, COUNT(*) as count FROM mini_rewards WHERE mini_id = ? AND reward_category = 'cup' GROUP BY reward_type");
    $stmt->execute([$mini_id]);
    $cupRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $cups = ['gold_cup' => 0, 'streak_champion_cup' => 0, 'mini_champion_cup' => 0, 'conversion_cup' => 0];
    foreach ($cupRows as $row) {
        if (isset($cups[$row['reward_type']])) {
            $cups[$row['reward_type']] = intval($row['count']);
        }
    }
    
    // Weekly rewards
    $stmt = $pdo->prepare("SELECT reward_category, COUNT(*) as count FROM mini_rewards WHERE mini_id = ? AND earned_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY reward_category");
    $stmt->execute([$mini_id]);
    $weeklyRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $weekly = ['bricks' => 0, 'medals' => 0, 'cups' => 0];
    foreach ($weeklyRows as $row) {
        if ($row['reward_category'] === 'brick') $weekly['bricks'] = intval($row['count']);
        if ($row['reward_category'] === 'medal') $weekly['medals'] = intval($row['count']);
        if ($row['reward_category'] === 'cup') $weekly['cups'] = intval($row['count']);
    }
    
    // Monthly rewards
    $stmt = $pdo->prepare("SELECT reward_category, COUNT(*) as count FROM mini_rewards WHERE mini_id = ? AND earned_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) GROUP BY reward_category");
    $stmt->execute([$mini_id]);
    $monthlyRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $monthly = ['bricks' => 0, 'medals' => 0, 'cups' => 0];
    foreach ($monthlyRows as $row) {
        if ($row['reward_category'] === 'brick') $monthly['bricks'] = intval($row['count']);
        if ($row['reward_category'] === 'medal') $monthly['medals'] = intval($row['count']);
        if ($row['reward_category'] === 'cup') $monthly['cups'] = intval($row['count']);
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'totals' => $totals,  // NET değerler (conversion sonrası)
            'earned' => $conversionResult['earned'] ?? [],  // Toplam kazanılan
            'weekly' => $weekly,
            'monthly' => $monthly,
            'bricks' => $bricks,
            'medals' => $medals,
            'cups' => $cups,
            'conversions_applied' => $conversionResult['conversions'] ?? []
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}