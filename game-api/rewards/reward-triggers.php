<?php
/**
 * Reward Triggers - Otomatik Reward Sistemi
 * Bu dosya diğer API'ler tarafından include edilir
 * 
 * Kullanım:
 * require_once __DIR__ . '/../rewards/reward-triggers.php';
 * RewardTriggers::onDailyActivity($conn, $mini_id);
 */

class RewardTriggers {
    
    /**
     * Günlük aktivite kaydedildiğinde çağrılır
     * Tetikler: daily_brick, streak_brick (5 gün), streak_medal (10 gün), streak_champion_cup (30 gün)
     */
    public static function onDailyActivity($conn, $mini_id) {
        $rewards = [];
        
        // 1. Daily Brick - Bugün daha önce verilmemişse
        if (!self::hasRewardToday($conn, $mini_id, 'daily_brick')) {
            if (self::addReward($conn, $mini_id, 'daily_brick', 'brick', 'Daily activity reward')) {
                $rewards[] = 'daily_brick';
            }
        }
        
        // 2. Streak kontrolü
        $stmt = $conn->prepare("SELECT current_streak FROM streak_summary WHERE mini_id = ?");
        $stmt->execute([$mini_id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $currentStreak = $result ? intval($result['current_streak']) : 0;
        
        // Streak Brick - Her 5 günde bir
        if ($currentStreak > 0 && $currentStreak % 5 === 0) {
            $expectedBricks = floor($currentStreak / 5);
            $existingBricks = self::countRewards($conn, $mini_id, 'streak_brick');
            if ($existingBricks < $expectedBricks) {
                if (self::addReward($conn, $mini_id, 'streak_brick', 'brick', "5-day streak milestone (Day {$currentStreak})")) {
                    $rewards[] = 'streak_brick';
                }
            }
        }
        
        // Streak Medal - Her 10 günde bir
        if ($currentStreak > 0 && $currentStreak % 10 === 0) {
            $expectedMedals = floor($currentStreak / 10);
            $existingMedals = self::countRewards($conn, $mini_id, 'streak_medal');
            if ($existingMedals < $expectedMedals) {
                if (self::addReward($conn, $mini_id, 'streak_medal', 'medal', "10-day streak milestone (Day {$currentStreak})")) {
                    $rewards[] = 'streak_medal';
                }
            }
        }
        
        // Streak Champion Cup - Her 30 günde bir
        if ($currentStreak > 0 && $currentStreak % 30 === 0) {
            $expectedCups = floor($currentStreak / 30);
            $existingCups = self::countRewards($conn, $mini_id, 'streak_champion_cup');
            if ($existingCups < $expectedCups) {
                if (self::addReward($conn, $mini_id, 'streak_champion_cup', 'cup', "30-day streak champion (Day {$currentStreak})")) {
                    $rewards[] = 'streak_champion_cup';
                }
            }
        }
        
        return $rewards;
    }
    
    /**
     * Mission tamamlandığında çağrılır
     * Tetikler: mission_brick
     */
    public static function onMissionComplete($conn, $mini_id, $mission_text = null) {
        $rewards = [];
        
        if (self::addReward($conn, $mini_id, 'mission_brick', 'brick', "Mission completed: " . ($mission_text ?? 'Daily mission'))) {
            $rewards[] = 'mission_brick';
        }
        
        return $rewards;
    }
    
    /**
     * Kayıt yapıldığında çağrılır
     * Tetikler: recording_brick
     */
    public static function onRecording($conn, $mini_id, $scene_id = null, $level_id = null) {
        $rewards = [];
        
        if (self::addReward($conn, $mini_id, 'recording_brick', 'brick', 'Recording completed', $scene_id, $level_id)) {
            $rewards[] = 'recording_brick';
        }
        
        return $rewards;
    }
    
    /**
     * Mini özelleştirildiğinde çağrılır
     * Tetikler: mini_creation_brick
     */
    public static function onMiniCustomization($conn, $mini_id, $scene_id = null) {
        $rewards = [];
        
        if (self::addReward($conn, $mini_id, 'mini_creation_brick', 'brick', 'Mini customization created', $scene_id)) {
            $rewards[] = 'mini_creation_brick';
        }
        
        return $rewards;
    }
    
    /**
     * Yeni sahne ilk kez açıldığında çağrılır
     * Tetikler: new_scene_medal
     */
    public static function onNewScene($conn, $mini_id, $scene_id) {
        $rewards = [];
        
        // Bu sahne için daha önce medal verilmiş mi?
        $stmt = $conn->prepare("
            SELECT COUNT(*) as cnt FROM mini_rewards 
            WHERE mini_id = ? AND reward_type = 'new_scene_medal' AND scene_id = ?
        ");
        $stmt->execute([$mini_id, $scene_id]);
        if (intval($stmt->fetch(PDO::FETCH_ASSOC)['cnt']) === 0) {
            if (self::addReward($conn, $mini_id, 'new_scene_medal', 'medal', 'First time playing scene', $scene_id)) {
                $rewards[] = 'new_scene_medal';
            }
        }
        
        return $rewards;
    }
    
    /**
     * Yeni level ilk kez denendiğinde çağrılır
     * Tetikler: new_level_medal
     */
    public static function onNewLevel($conn, $mini_id, $scene_id, $level_id) {
        $rewards = [];
        
        // Bu scene+level için daha önce medal verilmiş mi?
        $stmt = $conn->prepare("
            SELECT COUNT(*) as cnt FROM mini_rewards 
            WHERE mini_id = ? AND reward_type = 'new_level_medal' AND scene_id = ? AND level_id = ?
        ");
        $stmt->execute([$mini_id, $scene_id, $level_id]);
        if (intval($stmt->fetch(PDO::FETCH_ASSOC)['cnt']) === 0) {
            if (self::addReward($conn, $mini_id, 'new_level_medal', 'medal', 'First time trying level', $scene_id, $level_id)) {
                $rewards[] = 'new_level_medal';
            }
        }
        
        return $rewards;
    }
    
    /**
     * Level tamamlandığında çağrılır
     * Tetikler: completion_medal
     */
    public static function onLevelComplete($conn, $mini_id, $scene_id, $level_id) {
        $rewards = [];
        
        if (self::addReward($conn, $mini_id, 'completion_medal', 'medal', 'Level completed', $scene_id, $level_id)) {
            $rewards[] = 'completion_medal';
        }
        
        return $rewards;
    }
    
    // ==================== HELPER FUNCTIONS ====================
    
    /**
     * Bugün bu tip reward verilmiş mi?
     */
    private static function hasRewardToday($conn, $mini_id, $reward_type) {
        $stmt = $conn->prepare("
            SELECT COUNT(*) as cnt FROM mini_rewards 
            WHERE mini_id = ? AND reward_type = ? AND DATE(earned_at) = CURDATE()
        ");
        $stmt->execute([$mini_id, $reward_type]);
        return intval($stmt->fetch(PDO::FETCH_ASSOC)['cnt']) > 0;
    }
    
    /**
     * Bu tip kaç reward var?
     */
    private static function countRewards($conn, $mini_id, $reward_type) {
        $stmt = $conn->prepare("
            SELECT COUNT(*) as cnt FROM mini_rewards 
            WHERE mini_id = ? AND reward_type = ?
        ");
        $stmt->execute([$mini_id, $reward_type]);
        return intval($stmt->fetch(PDO::FETCH_ASSOC)['cnt']);
    }
    
    /**
     * Reward ekle ve totals'ı güncelle
     */
    private static function addReward($conn, $mini_id, $reward_type, $reward_category, $notes = null, $scene_id = null, $level_id = null) {
        try {
            // Daily limit check
            $stmt = $conn->prepare("SELECT daily_limit FROM reward_settings WHERE mini_id = ?");
            $stmt->execute([$mini_id]);
            $settings = $stmt->fetch(PDO::FETCH_ASSOC);
            $dailyLimit = $settings ? intval($settings['daily_limit']) : 0;
            
            if ($dailyLimit > 0) {
                $stmt = $conn->prepare("
                    SELECT COUNT(*) as today_count FROM mini_rewards 
                    WHERE mini_id = ? AND DATE(earned_at) = CURDATE()
                ");
                $stmt->execute([$mini_id]);
                $todayCount = intval($stmt->fetch(PDO::FETCH_ASSOC)['today_count']);
                
                if ($todayCount >= $dailyLimit) {
                    return false; // Limit reached
                }
            }
            
            // Reward ekle
            $stmt = $conn->prepare("
                INSERT INTO mini_rewards (mini_id, reward_type, reward_category, scene_id, level_id, notes, earned_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([$mini_id, $reward_type, $reward_category, $scene_id, $level_id, $notes]);
            
            // Totals güncelle
            $column = '';
            if ($reward_category === 'brick') $column = 'total_bricks';
            elseif ($reward_category === 'medal') $column = 'total_medals';
            elseif ($reward_category === 'cup') $column = 'total_cups';
            
            if ($column) {
                $stmt = $conn->prepare("UPDATE mini_profiles SET {$column} = {$column} + 1 WHERE mini_id = ?");
                $stmt->execute([$mini_id]);
            }
            
            // Auto-conversion kontrol et
            self::checkAutoConversion($conn, $mini_id);
            
            return true;
        } catch (Exception $e) {
            error_log("RewardTriggers::addReward error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Brick -> Medal ve Medal -> Cup auto-conversion
     */
    private static function checkAutoConversion($conn, $mini_id) {
        // Settings al
        $stmt = $conn->prepare("SELECT brick_to_medal, medal_to_cup FROM reward_settings WHERE mini_id = ?");
        $stmt->execute([$mini_id]);
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);
        $brickToMedal = $settings ? intval($settings['brick_to_medal']) : 10;
        $medalToCup = $settings ? intval($settings['medal_to_cup']) : 10;
        
        // Totals al
        $stmt = $conn->prepare("SELECT total_bricks, total_medals, total_cups FROM mini_profiles WHERE mini_id = ?");
        $stmt->execute([$mini_id]);
        $totals = $stmt->fetch(PDO::FETCH_ASSOC);
        $totalBricks = intval($totals['total_bricks']);
        $totalMedals = intval($totals['total_medals']);
        
        // Brick -> Medal conversion
        $stmt = $conn->prepare("
            SELECT COUNT(*) as cnt FROM mini_rewards 
            WHERE mini_id = ? AND reward_type = 'progress_medal' AND notes LIKE 'Auto-converted from%bricks'
        ");
        $stmt->execute([$mini_id]);
        $convertedMedals = intval($stmt->fetch(PDO::FETCH_ASSOC)['cnt']);
        
        $shouldHaveMedals = floor($totalBricks / $brickToMedal);
        $newMedals = $shouldHaveMedals - $convertedMedals;
        
        for ($i = 0; $i < $newMedals; $i++) {
            $stmt = $conn->prepare("
                INSERT INTO mini_rewards (mini_id, reward_type, reward_category, notes, earned_at)
                VALUES (?, 'progress_medal', 'medal', ?, NOW())
            ");
            $stmt->execute([$mini_id, "Auto-converted from {$brickToMedal} bricks"]);
            
            $stmt = $conn->prepare("UPDATE mini_profiles SET total_medals = total_medals + 1 WHERE mini_id = ?");
            $stmt->execute([$mini_id]);
        }
        
        // Güncel medal sayısını al
        $stmt = $conn->prepare("SELECT total_medals FROM mini_profiles WHERE mini_id = ?");
        $stmt->execute([$mini_id]);
        $totalMedals = intval($stmt->fetch(PDO::FETCH_ASSOC)['total_medals']);
        
        // Medal -> Cup conversion
        $stmt = $conn->prepare("
            SELECT COUNT(*) as cnt FROM mini_rewards 
            WHERE mini_id = ? AND reward_type = 'gold_cup' AND notes LIKE 'Auto-converted from%medals'
        ");
        $stmt->execute([$mini_id]);
        $convertedCups = intval($stmt->fetch(PDO::FETCH_ASSOC)['cnt']);
        
        $shouldHaveCups = floor($totalMedals / $medalToCup);
        $newCups = $shouldHaveCups - $convertedCups;
        
        for ($i = 0; $i < $newCups; $i++) {
            $stmt = $conn->prepare("
                INSERT INTO mini_rewards (mini_id, reward_type, reward_category, notes, earned_at)
                VALUES (?, 'gold_cup', 'cup', ?, NOW())
            ");
            $stmt->execute([$mini_id, "Auto-converted from {$medalToCup} medals"]);
            
            $stmt = $conn->prepare("UPDATE mini_profiles SET total_cups = total_cups + 1 WHERE mini_id = ?");
            $stmt->execute([$mini_id]);
        }
    }
}
