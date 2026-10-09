<?php
// /minitalks-api/streak/record-activity.php
// Mini her login olduğunda veya aktivite yaptığında çağrılır
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Türkiye saat dilimi (UTC+3)
date_default_timezone_set('Europe/Istanbul');

require_once '../config/db.php';
require_once '../rewards/check-conversions.php';

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $mini_id = isset($data['mini_id']) ? intval($data['mini_id']) : 0;
    $activity_type = isset($data['activity_type']) ? $data['activity_type'] : 'login'; // login, play, record
    $duration_seconds = isset($data['duration_seconds']) ? intval($data['duration_seconds']) : 0;
    $scene_id = isset($data['scene_id']) ? intval($data['scene_id']) : null;
    $level_id = isset($data['level_id']) ? intval($data['level_id']) : null;
    
    if ($mini_id === 0) {
        throw new Exception('mini_id is required');
    }
    
    $today = date('Y-m-d');
    
    // O mini için aktif motivation message'ı bul
    $motivation_message_id = null;
    $motivation_text = null;
    
    // motivation_settings'den mini'nin ayarlarını çek
    $stmt = $pdo->prepare("SELECT selected_preset_ids, custom_message, display_duration 
                           FROM motivation_settings 
                           WHERE mini_id = ? 
                           ORDER BY updated_at DESC LIMIT 1");
    $stmt->execute([$mini_id]);
    $motivationSettings = $stmt->fetch();
    
    if ($motivationSettings) {
        $presetIds = json_decode($motivationSettings['selected_preset_ids'], true);
        $customMessage = $motivationSettings['custom_message'];
        $displayDuration = $motivationSettings['display_duration'];
        
        // Custom message varsa onu kullan (preset_id = NULL, text olarak sakle)
        if (!empty($customMessage) && trim($customMessage) !== '' && trim($customMessage) !== 'Add New Message') {
            $motivation_text = $customMessage;
            $motivation_message_id = null; // Custom message için NULL
        } 
        // Preset seçiliyse (Bu ID'ler zaten save-messages.php'de +1 ile kaydedildi)
        else if (!empty($presetIds) && is_array($presetIds)) {
            if ($displayDuration === 'rotate') {
                // Rastgele bir preset seç
                $motivation_message_id = $presetIds[array_rand($presetIds)];
            } else {
                // İlk preset'i kullan
                $motivation_message_id = $presetIds[0];
            }
        }
    }
    
    // Bugünün kaydını kontrol et
    $stmt = $pdo->prepare("SELECT history_id, scenes_played, levels_used FROM streak_history WHERE mini_id = ? AND activity_date = ?");
    $stmt->execute([$mini_id, $today]);
    $existing = $stmt->fetch();
    
    if ($existing) {
        // Mevcut kaydı güncelle
        $scenesPlayed = $existing['scenes_played'] ? json_decode($existing['scenes_played'], true) : [];
        $levelsUsed = $existing['levels_used'] ? json_decode($existing['levels_used'], true) : [];
        
        // Sahne ekle (eğer yeni ise)
        if ($scene_id && !in_array($scene_id, $scenesPlayed)) {
            $scenesPlayed[] = $scene_id;
        }
        
        // Level ekle (eğer yeni ise)
        if ($level_id && !in_array($level_id, $levelsUsed)) {
            $levelsUsed[] = $level_id;
        }
        
        $updateFields = ["app_opened = 1"];
        $updateParams = [];
        
        if ($activity_type === 'play' && $duration_seconds > 0) {
            $updateFields[] = "play_time_seconds = play_time_seconds + ?";
            $updateParams[] = $duration_seconds;
        }
        
        if ($activity_type === 'record' && $duration_seconds > 0) {
            $updateFields[] = "record_time_seconds = record_time_seconds + ?";
            $updateFields[] = "recording_count = recording_count + 1";
            $updateParams[] = $duration_seconds;
        }
        
        $updateFields[] = "scenes_played = ?";
        $updateParams[] = json_encode($scenesPlayed);
        
        $updateFields[] = "levels_used = ?";
        $updateParams[] = json_encode($levelsUsed);
        
        // Motivation message'ı her zaman güncelle (gün içinde değişebilir)
        $updateFields[] = "motivation_message_id = ?";
        $updateParams[] = $motivation_message_id;
        
        $updateParams[] = $mini_id;
        $updateParams[] = $today;
        
        $sql = "UPDATE streak_history SET " . implode(", ", $updateFields) . " WHERE mini_id = ? AND activity_date = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($updateParams);
        
    } else {
        // Yeni kayıt oluştur
        $scenesPlayed = $scene_id ? json_encode([$scene_id]) : null;
        $levelsUsed = $level_id ? json_encode([$level_id]) : null;
        $playTime = ($activity_type === 'play') ? $duration_seconds : 0;
        $recordTime = ($activity_type === 'record') ? $duration_seconds : 0;
        $recordCount = ($activity_type === 'record') ? 1 : 0;
        
        $stmt = $pdo->prepare("INSERT INTO streak_history 
            (mini_id, activity_date, app_opened, play_time_seconds, record_time_seconds, recording_count, scenes_played, levels_used, motivation_message_id, streak_valid)
            VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, 0)");
        $stmt->execute([$mini_id, $today, $playTime, $recordTime, $recordCount, $scenesPlayed, $levelsUsed, $motivation_message_id]);
        
        // ✅ DAILY BRICK REWARD - O gün ilk giriş, brick ver
        try {
            // Bugün zaten daily_brick verilmiş mi kontrol et
            $checkStmt = $pdo->prepare("
                SELECT COUNT(*) as cnt FROM mini_rewards 
                WHERE mini_id = ? AND reward_type = 'daily_brick' AND DATE(earned_at) = CURDATE()
            ");
            $checkStmt->execute([$mini_id]);
            $alreadyGiven = intval($checkStmt->fetch(PDO::FETCH_ASSOC)['cnt']) > 0;
            
            if (!$alreadyGiven) {
                // Reward ekle
                $rewardStmt = $pdo->prepare("
                    INSERT INTO mini_rewards (mini_id, reward_type, reward_category, earned_at, notes)
                    VALUES (?, 'daily_brick', 'brick', NOW(), 'Daily activity reward')
                ");
                $rewardStmt->execute([$mini_id]);
                
                // ✅ mini_profiles.total_bricks'i de güncelle
                $updateStmt = $pdo->prepare("
                    UPDATE mini_profiles SET total_bricks = total_bricks + 1 WHERE mini_id = ?
                ");
                $updateStmt->execute([$mini_id]);
            }
        } catch (Exception $e) {
            // Reward hatası kritik değil, devam et
        }
        
        // ✅ STREAK MISSION CHECK - streak_continue tipi missionları tamamla
        try {
            $missionStmt = $pdo->prepare("
                SELECT ma.id, ma.mission_id, ma.mission_text
                FROM mission_assignments ma
                LEFT JOIN mission_presets m ON ma.mission_id = m.id AND ma.is_custom = 0
                WHERE ma.mini_id = ? AND ma.is_completed = 0 
                  AND m.trigger_type = 'streak_continue'
            ");
            $missionStmt->execute([$mini_id]);
            $streakMissions = $missionStmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($streakMissions as $mission) {
                // mission_assignments'ı güncelle
                $completeStmt = $pdo->prepare("
                    UPDATE mission_assignments 
                    SET is_completed = 1, completed_at = NOW() 
                    WHERE id = ?
                ");
                $completeStmt->execute([$mission['id']]);
                
                // mission_completions'a log ekle
                $logStmt = $pdo->prepare("
                    INSERT INTO mission_completions (mini_id, mission_id, assignment_id, completed_at)
                    VALUES (?, ?, ?, NOW())
                ");
                $logStmt->execute([$mini_id, $mission['mission_id'], $mission['id']]);
                
                // Reward ver
                $missionRewardStmt = $pdo->prepare("
                    INSERT INTO mini_rewards (mini_id, reward_type, reward_category, earned_at, notes)
                    VALUES (?, 'mission_brick', 'brick', NOW(), ?)
                ");
                $missionRewardStmt->execute([$mini_id, 'Mission completed: ' . $mission['mission_text']]);
                
                // ✅ mini_profiles.total_bricks'i de güncelle
                $updateBrickStmt = $pdo->prepare("
                    UPDATE mini_profiles SET total_bricks = total_bricks + 1 WHERE mini_id = ?
                ");
                $updateBrickStmt->execute([$mini_id]);
            }
        } catch (Exception $e) {
            // Mission check hatası kritik değil, devam et
        }
    }
    
    // Streak ayarlarını kontrol et ve streak_valid hesapla
    $stmt = $pdo->prepare("SELECT req_open_app, req_record_1min, req_play_1min FROM streak_settings WHERE mini_id = ?");
    $stmt->execute([$mini_id]);
    $settings = $stmt->fetch();
    
    // Varsayılan: open_app yeterli
    $reqOpenApp = $settings ? (bool)$settings['req_open_app'] : true;
    $reqRecord1min = $settings ? (bool)$settings['req_record_1min'] : false;
    $reqPlay1min = $settings ? (bool)$settings['req_play_1min'] : false;
    
    // Bugünün aktivitesini kontrol et
    $stmt = $pdo->prepare("SELECT app_opened, play_time_seconds, record_time_seconds FROM streak_history WHERE mini_id = ? AND activity_date = ?");
    $stmt->execute([$mini_id, $today]);
    $todayActivity = $stmt->fetch();
    
    // Varsayılan olarak geçerli (eğer ayar yoksa open_app yeterli)
    $streakValid = true;
    
    // Sadece seçili olan requirement'ı kontrol et (radio button - sadece 1 aktif)
    if ($reqRecord1min) {
        $streakValid = $todayActivity['record_time_seconds'] >= 60;
    } else if ($reqPlay1min) {
        $streakValid = $todayActivity['play_time_seconds'] >= 60;
    } else {
        // req_open_app veya hiçbiri seçili değilse, app açmak yeterli
        $streakValid = (bool)$todayActivity['app_opened'];
    }
    
    // streak_valid güncelle
    $stmt = $pdo->prepare("UPDATE streak_history SET streak_valid = ? WHERE mini_id = ? AND activity_date = ?");
    $stmt->execute([$streakValid ? 1 : 0, $mini_id, $today]);
    
    // ✅ MOTIVATION_USAGE_LOG'A LOG KAYDI EKLE (sadece login'de)
    if ($motivation_message_id && $activity_type === 'login') {
        try {
            // Tabloyu oluştur (yoksa)
            $pdo->exec("CREATE TABLE IF NOT EXISTS motivation_usage_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                mini_id INT NOT NULL,
                preset_id INT NOT NULL,
                used_date DATE NOT NULL,
                used_count INT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_mini_preset_date (mini_id, preset_id, used_date),
                KEY idx_mini_id (mini_id),
                KEY idx_used_date (used_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            
            // Log kaydı ekle veya güncelle
            $stmt = $pdo->prepare("INSERT INTO motivation_usage_log (mini_id, preset_id, used_date, used_count) 
                                   VALUES (?, ?, ?, 1)
                                   ON DUPLICATE KEY UPDATE 
                                   used_count = used_count + 1,
                                   updated_at = CURRENT_TIMESTAMP");
            $stmt->execute([$mini_id, $motivation_message_id, $today]);
        } catch (Exception $e) {
            // Log hatası kritik değil, devam et
        }
    }
    
    // Streak hesapla ve streak_summary güncelle
    updateStreakSummary($pdo, $mini_id);
    
    // ✅ CONVERSION CHECK - Brick → Medal → Cup dönüşümlerini kontrol et
    $conversionResult = null;
    try {
        $conversionResult = checkAndApplyConversions($pdo, $mini_id);
    } catch (Exception $e) {
        // Conversion hatası kritik değil
    }
    
    // Güncel streak bilgisini döndür
    $stmt = $pdo->prepare("SELECT current_streak, longest_streak, total_active_days FROM streak_summary WHERE mini_id = ?");
    $stmt->execute([$mini_id]);
    $summary = $stmt->fetch();
    
    echo json_encode([
        'success' => true,
        'data' => [
            'current_streak' => $summary ? (int)$summary['current_streak'] : 0,
            'longest_streak' => $summary ? (int)$summary['longest_streak'] : 0,
            'total_active_days' => $summary ? (int)$summary['total_active_days'] : 0,
            'today_valid' => $streakValid,
            'motivation_message_id' => $motivation_message_id,
            'activity_date' => $today,
            'mini_id' => $mini_id,
            'conversions' => $conversionResult ? $conversionResult['conversions'] : [],
            'totals' => $conversionResult ? $conversionResult['totals'] : null
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

function updateStreakSummary($pdo, $mini_id) {
    $today = date('Y-m-d');
    
    // Tüm geçerli streak günlerini çek (streak_valid = 1)
    $stmt = $pdo->prepare("SELECT activity_date FROM streak_history WHERE mini_id = ? AND streak_valid = 1 ORDER BY activity_date DESC");
    $stmt->execute([$mini_id]);
    $dates = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    $currentStreak = 0;
    $longestStreak = 0;
    $totalActiveDays = count($dates);
    
    if (!empty($dates)) {
        // Current streak hesapla - bugünden geriye doğru ardışık günleri say
        $checkDate = new DateTime($today);
        
        foreach ($dates as $date) {
            $activityDate = new DateTime($date);
            $diff = $checkDate->diff($activityDate)->days;
            
            if ($diff === 0 || $diff === 1) {
                $currentStreak++;
                $checkDate = $activityDate;
            } else {
                break;
            }
        }
        
        // Longest streak hesapla
        $tempStreak = 1;
        for ($i = 1; $i < count($dates); $i++) {
            $prevDate = new DateTime($dates[$i - 1]);
            $currDate = new DateTime($dates[$i]);
            $diff = $prevDate->diff($currDate)->days;
            
            if ($diff === 1) {
                $tempStreak++;
            } else {
                if ($tempStreak > $longestStreak) {
                    $longestStreak = $tempStreak;
                }
                $tempStreak = 1;
            }
        }
        if ($tempStreak > $longestStreak) {
            $longestStreak = $tempStreak;
        }
        
        if ($currentStreak > $longestStreak) {
            $longestStreak = $currentStreak;
        }
    }
    
    // streak_summary güncelle veya oluştur
    $stmt = $pdo->prepare("SELECT summary_id FROM streak_summary WHERE mini_id = ?");
    $stmt->execute([$mini_id]);
    $existing = $stmt->fetch();
    
    if ($existing) {
        $stmt = $pdo->prepare("UPDATE streak_summary SET current_streak = ?, longest_streak = GREATEST(longest_streak, ?), total_active_days = ?, last_active_date = ? WHERE mini_id = ?");
        $stmt->execute([$currentStreak, $longestStreak, $totalActiveDays, $today, $mini_id]);
    } else {
        $stmt = $pdo->prepare("INSERT INTO streak_summary (mini_id, current_streak, longest_streak, total_active_days, last_active_date) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$mini_id, $currentStreak, $longestStreak, $totalActiveDays, $today]);
    }
}
?>