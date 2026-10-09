<?php
// /minitalks-api/builder/record-activity.php
// Builder her login olduğunda veya aktivite yaptığında çağrılır
// Mini'nin streak/record-activity.php ile aynı mantık

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

date_default_timezone_set('Europe/Istanbul');
require_once '../config/db.php';

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $builder_id = isset($data['builder_id']) ? intval($data['builder_id']) : 0;
    $activity_type = isset($data['activity_type']) ? $data['activity_type'] : 'login'; // login, play, record
    $duration_seconds = isset($data['duration_seconds']) ? intval($data['duration_seconds']) : 0;
    $scene_id = isset($data['scene_id']) ? intval($data['scene_id']) : null;
    $level_id = isset($data['level_id']) ? intval($data['level_id']) : null;
    
    if ($builder_id === 0) {
        throw new Exception('builder_id is required');
    }
    
    $today = date('Y-m-d');
    $yesterday = date('Y-m-d', strtotime('-1 day'));
    
    // =============================================
    // 1. STREAK GÜNCELLEME
    // =============================================
    
    // Mevcut streak bilgisini çek
    $stmt = $pdo->prepare("SELECT * FROM builder_streaks WHERE builder_id = ?");
    $stmt->execute([$builder_id]);
    $streak = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $currentStreak = 0;
    $longestStreak = 0;
    $streakStartDate = $today;
    
    if ($streak) {
        $lastActivity = $streak['last_activity_date'];
        $currentStreak = intval($streak['current_streak']);
        $longestStreak = intval($streak['longest_streak']);
        $streakStartDate = $streak['streak_start_date'] ?: $today;
        
        if ($lastActivity === $today) {
            // Bugün zaten giriş yapmış, streak değişmez
        } elseif ($lastActivity === $yesterday) {
            // Dün giriş yapmış, streak devam
            $currentStreak++;
        } else {
            // Streak kırıldı, yeniden başla
            $currentStreak = 1;
            $streakStartDate = $today;
        }
        
        // Longest streak güncelle
        if ($currentStreak > $longestStreak) {
            $longestStreak = $currentStreak;
        }
        
        // Güncelle
        $updateStmt = $pdo->prepare("
            UPDATE builder_streaks 
            SET current_streak = ?, longest_streak = ?, last_activity_date = ?, streak_start_date = ?, updated_at = NOW()
            WHERE builder_id = ?
        ");
        $updateStmt->execute([$currentStreak, $longestStreak, $today, $streakStartDate, $builder_id]);
        
    } else {
        // İlk kez giriş - yeni kayıt oluştur
        $currentStreak = 1;
        $longestStreak = 1;
        $streakStartDate = $today;
        
        $insertStmt = $pdo->prepare("
            INSERT INTO builder_streaks (builder_id, current_streak, longest_streak, last_activity_date, streak_start_date, updated_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        $insertStmt->execute([$builder_id, $currentStreak, $longestStreak, $today, $streakStartDate]);
    }
    
    // =============================================
    // 2. GÜNLÜK DAİLY BRICK ÖDÜLÜ
    // =============================================
    $dailyBrickGiven = false;
    
    // Bugün zaten daily_brick verilmiş mi kontrol et
    $checkStmt = $pdo->prepare("
        SELECT COUNT(*) as cnt FROM builder_rewards_log 
        WHERE builder_id = ? AND reward_name = 'daily_brick' AND DATE(earned_at) = ?
    ");
    $checkStmt->execute([$builder_id, $today]);
    $alreadyGiven = intval($checkStmt->fetch(PDO::FETCH_ASSOC)['cnt']) > 0;
    
    if (!$alreadyGiven && $activity_type === 'login') {
        // Daily brick ver
        $rewardStmt = $pdo->prepare("
            INSERT INTO builder_rewards_log (builder_id, reward_type, reward_name, reward_amount, notes, earned_at)
            VALUES (?, 'brick', 'daily_brick', 1, 'Daily activity reward', NOW())
        ");
        $rewardStmt->execute([$builder_id]);
        
        // builder_rewards toplamını güncelle
        $updateRewardsStmt = $pdo->prepare("
            INSERT INTO builder_rewards (builder_id, total_bricks, total_medals, total_cups, updated_at)
            VALUES (?, 1, 0, 0, NOW())
            ON DUPLICATE KEY UPDATE total_bricks = total_bricks + 1, updated_at = NOW()
        ");
        $updateRewardsStmt->execute([$builder_id]);
        
        $dailyBrickGiven = true;
    }
    
    // =============================================
    // 3. GÜNLÜK 2 RANDOM MİSSİON ATAMA
    // =============================================
    $assignedMissions = [];
    
    // Bugün için mission atanmış mı kontrol et
    $missionCheckStmt = $pdo->prepare("
        SELECT COUNT(*) as cnt FROM builder_missions 
        WHERE builder_id = ? AND mission_date = ?
    ");
    $missionCheckStmt->execute([$builder_id, $today]);
    $missionsAssigned = intval($missionCheckStmt->fetch(PDO::FETCH_ASSOC)['cnt']);
    
    if ($missionsAssigned === 0 && $activity_type === 'login') {
        // Tüm mission preset'lerini çek
        $presetStmt = $pdo->query("SELECT id, mission_text, trigger_type, trigger_value FROM mission_presets ORDER BY RAND() LIMIT 2");
        $randomMissions = $presetStmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($randomMissions as $mission) {
            $insertMissionStmt = $pdo->prepare("
                INSERT INTO builder_missions (builder_id, mission_id, mission_text, mission_date, is_completed, created_at)
                VALUES (?, ?, ?, ?, 0, NOW())
            ");
            $insertMissionStmt->execute([$builder_id, $mission['id'], $mission['mission_text'], $today]);
            
            $assignedMissions[] = [
                'mission_id' => $mission['id'],
                'mission_text' => $mission['mission_text'],
                'trigger_type' => $mission['trigger_type'],
                'trigger_value' => $mission['trigger_value']
            ];
        }
    } else {
        // Mevcut bugünkü mission'ları çek
        $todayMissionsStmt = $pdo->prepare("
            SELECT bm.mission_id, bm.mission_text, bm.is_completed, mp.trigger_type, mp.trigger_value
            FROM builder_missions bm
            LEFT JOIN mission_presets mp ON bm.mission_id = mp.id
            WHERE bm.builder_id = ? AND bm.mission_date = ?
        ");
        $todayMissionsStmt->execute([$builder_id, $today]);
        $assignedMissions = $todayMissionsStmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    // =============================================
    // 4. GÜNCEL REWARD TOPLAMLARINI ÇEK
    // =============================================
    $totalsStmt = $pdo->prepare("SELECT total_bricks, total_medals, total_cups FROM builder_rewards WHERE builder_id = ?");
    $totalsStmt->execute([$builder_id]);
    $totals = $totalsStmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => [
            'current_streak' => $currentStreak,
            'longest_streak' => $longestStreak,
            'streak_start_date' => $streakStartDate,
            'last_activity_date' => $today,
            'daily_brick_given' => $dailyBrickGiven,
            'missions' => $assignedMissions,
            'totals' => $totals,
            'activity_type' => $activity_type,
            'builder_id' => $builder_id
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
