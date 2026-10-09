<?php
/**
 * Log Daily Activity API
 * Uygulama her açıldığında/kullanıldığında çağrılır
 * - streak_history tablosuna kayıt ekler
 * - streak_summary günceller
 * - daily_brick + streak rewards verir
 * 
 * POST /streak/log-activity.php
 * Body: { mini_id, play_time_seconds?, record_time_seconds?, recording_count?, scenes_played?, levels_used?, customized_minis_count? }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

date_default_timezone_set('Europe/Istanbul');
require_once '../config/db.php';

require_once '../rewards/reward-triggers.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $mini_id = isset($input['mini_id']) ? intval($input['mini_id']) : 0;
    $play_time_seconds = isset($input['play_time_seconds']) ? intval($input['play_time_seconds']) : 0;
    $record_time_seconds = isset($input['record_time_seconds']) ? intval($input['record_time_seconds']) : 0;
    $recording_count = isset($input['recording_count']) ? intval($input['recording_count']) : 0;
    $scenes_played = isset($input['scenes_played']) ? $input['scenes_played'] : [];
    $levels_used = isset($input['levels_used']) ? $input['levels_used'] : [];
    $customized_minis_count = isset($input['customized_minis_count']) ? intval($input['customized_minis_count']) : 0;
    
    if (!$mini_id) {
        throw new Exception('mini_id is required');
    }
    
    $today = date('Y-m-d');
    
    // 1. Bugün için streak_history var mı kontrol et
    $stmt = $pdo->prepare("SELECT history_id, play_time_seconds, record_time_seconds, recording_count, customized_minis_count 
                           FROM streak_history WHERE mini_id = ? AND activity_date = ?");
    $stmt->execute([$mini_id, $today]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $isNewActivity = false;
    
    if ($existing) {
        // Mevcut kaydı güncelle (değerleri topla)
        $stmt = $pdo->prepare("UPDATE streak_history SET 
                               app_opened = 1,
                               play_time_seconds = play_time_seconds + ?,
                               record_time_seconds = record_time_seconds + ?,
                               recording_count = recording_count + ?,
                               scenes_played = ?,
                               levels_used = ?,
                               customized_minis_count = customized_minis_count + ?,
                               streak_valid = 1
                               WHERE history_id = ?");
        $stmt->execute([
            $play_time_seconds,
            $record_time_seconds,
            $recording_count,
            json_encode($scenes_played),
            json_encode($levels_used),
            $customized_minis_count,
            $existing['history_id']
        ]);
    } else {
        // Yeni kayıt oluştur
        $isNewActivity = true;
        
        // Rastgele motivation message seç
        $stmt = $pdo->prepare("SELECT preset_id FROM motivation_presets WHERE is_active = 1 ORDER BY RAND() LIMIT 1");
        $stmt->execute();
        $motivation = $stmt->fetch(PDO::FETCH_ASSOC);
        $motivation_id = $motivation ? $motivation['preset_id'] : null;
        
        $stmt = $pdo->prepare("INSERT INTO streak_history 
                               (mini_id, activity_date, app_opened, play_time_seconds, record_time_seconds, 
                                recording_count, scenes_played, levels_used, customized_minis_count, 
                                motivation_message_id, streak_valid, created_at)
                               VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, 1, NOW())");
        $stmt->execute([
            $mini_id,
            $today,
            $play_time_seconds,
            $record_time_seconds,
            $recording_count,
            json_encode($scenes_played),
            json_encode($levels_used),
            $customized_minis_count,
            $motivation_id
        ]);
    }
    
    // 2. streak_summary güncelle
    $stmt = $pdo->prepare("SELECT summary_id, current_streak, longest_streak, total_active_days, last_active_date 
                           FROM streak_summary WHERE mini_id = ?");
    $stmt->execute([$mini_id]);
    $summary = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($summary) {
        $lastDate = $summary['last_active_date'];
        $currentStreak = intval($summary['current_streak']);
        $longestStreak = intval($summary['longest_streak']);
        $totalDays = intval($summary['total_active_days']);
        
        // Streak hesapla
        if ($lastDate === $today) {
            // Bugün zaten kaydedilmiş, değişiklik yok
        } else {
            $yesterday = date('Y-m-d', strtotime('-1 day'));
            
            if ($lastDate === $yesterday) {
                // Dün aktifti, streak devam ediyor
                $currentStreak++;
            } else {
                // Streak kırıldı, yeniden başla
                $currentStreak = 1;
            }
            
            $totalDays++;
            if ($currentStreak > $longestStreak) {
                $longestStreak = $currentStreak;
            }
            
            $stmt = $pdo->prepare("UPDATE streak_summary SET 
                                   current_streak = ?, longest_streak = ?, 
                                   total_active_days = ?, last_active_date = ?, updated_at = NOW()
                                   WHERE summary_id = ?");
            $stmt->execute([$currentStreak, $longestStreak, $totalDays, $today, $summary['summary_id']]);
        }
    } else {
        // İlk kayıt
        $currentStreak = 1;
        $longestStreak = 1;
        $totalDays = 1;
        
        $stmt = $pdo->prepare("INSERT INTO streak_summary 
                               (mini_id, current_streak, longest_streak, total_active_days, last_active_date, updated_at)
                               VALUES (?, 1, 1, 1, ?, NOW())");
        $stmt->execute([$mini_id, $today]);
    }
    
    // 3. ✨ REWARDS: Günlük aktivite + streak rewards
    $rewards = [];
    if ($isNewActivity) {
        $rewards = RewardTriggers::onDailyActivity($pdo, $mini_id);
    }
    
    // Güncel streak bilgisini al
    $stmt = $pdo->prepare("SELECT current_streak, longest_streak, total_active_days FROM streak_summary WHERE mini_id = ?");
    $stmt->execute([$mini_id]);
    $finalSummary = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'message' => $isNewActivity ? 'Activity logged successfully' : 'Activity updated',
        'is_new_activity' => $isNewActivity,
        'rewards_earned' => $rewards,
        'streak' => [
            'current_streak' => intval($finalSummary['current_streak']),
            'longest_streak' => intval($finalSummary['longest_streak']),
            'total_active_days' => intval($finalSummary['total_active_days'])
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
