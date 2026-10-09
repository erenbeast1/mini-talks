<?php
// /minitalks-api/motivation/get-messages.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Türkiye saat dilimi (UTC+3)
date_default_timezone_set('Europe/Istanbul');

require_once '../config/db.php';

try {
    $mini_id = isset($_GET['mini_id']) ? intval($_GET['mini_id']) : 0;
    $parent_id = isset($_GET['parent_id']) ? intval($_GET['parent_id']) : 0;
    
    if ($mini_id === 0) {
        throw new Exception('mini_id is required');
    }
    
    // Parent ID yoksa veya 0 ise, mini_profiles tablosundan çek
    if ($parent_id === 0) {
        try {
            $stmt = $pdo->prepare("SELECT parent_id FROM mini_profiles WHERE mini_id = ?");
            $stmt->execute([$mini_id]);
            $result = $stmt->fetch();
            if ($result && $result['parent_id']) {
                $parent_id = intval($result['parent_id']);
            }
        } catch (Exception $e) {}
    }
    
    // Presets - veritabanından çek
    $presets = [];
    try {
        $stmt = $pdo->query("SELECT preset_id, message_text FROM motivation_presets WHERE is_active = 1 ORDER BY sort_order ASC");
        $presets = $stmt->fetchAll();
    } catch (Exception $e) {
        // Varsayılan presets (veritabanı yoksa)
        $defaultMessages = [
            'You are the bravest Mini ever!',
            'Your voice is getting stronger every day!',
            'You did something amazing today!',
            'Look at you go, brick by brick!',
            'You are becoming more confident!',
            'Your courage shines!',
            'You made great progress today!',
            'You try so hard, well done!',
            'Keep going, superstar!',
            'Small steps create big changes!',
            'You are growing every day!',
            'Your smile makes everything brighter!',
            'Today is your day to shine!',
            "Let's build your confidence together!",
            'You sound wonderful today!',
            'You reached your streak, nice work!',
            'You unlocked new confidence!',
            'You finished your mission, great job!',
            'You are leveling up, Mini!',
            'You can do this!',
            "You're doing amazing!",
            'Keep going, Mini!',
            "You're getting stronger!",
            'One brick at a time!',
            "Look how far you've come!",
            "You're braver every day",
            'Great job today!',
            "You're a real star!",
            "Brick by brick, you're growing!",
            "You're making awesome progress!",
        ];
        foreach ($defaultMessages as $i => $msg) {
            $presets[] = ['preset_id' => $i + 1, 'message_text' => $msg];
        }
    }
    
    // Seçilmiş preset ID'leri ve ayarları
    $selectedPresetIds = [];
    $customMessage = '';
    $displayDuration = 'today';
    $updatedAt = null;
    
    try {
        // Mini bazlı kayıt ara
        $stmt = $pdo->prepare("SELECT selected_preset_ids, custom_message, display_duration, updated_at FROM motivation_settings WHERE mini_id = ? ORDER BY updated_at DESC LIMIT 1");
        $stmt->execute([$mini_id]);
        $settings = $stmt->fetch();
        
        if ($settings) {
            $dbPresetIds = json_decode($settings['selected_preset_ids'], true) ?: [];
            // Veritabanından gelen preset_id'leri frontend index'ine çevir (-1)
            $selectedPresetIds = array_map(function($id) { return intval($id) - 1; }, $dbPresetIds);
            $customMessage = $settings['custom_message'] ?: '';
            $displayDuration = $settings['display_duration'] ?: 'today';
            $updatedAt = $settings['updated_at'];
        }
    } catch (Exception $e) {}
    
    // ✅ DISPLAY DURATION KONTROLÜ
    $today = date('Y-m-d');
    $isExpired = false;
    $daysRemaining = 0;
    
    if ($updatedAt) {
        $settingDate = date('Y-m-d', strtotime($updatedAt));
        $daysSinceSetting = floor((strtotime($today) - strtotime($settingDate)) / 86400);
        
        switch ($displayDuration) {
            case 'today':
                // Sadece ayarlandığı gün geçerli
                $isExpired = ($daysSinceSetting > 0);
                $daysRemaining = $isExpired ? 0 : 1;
                break;
                
            case 'three_days':
                // 3 gün boyunca geçerli
                $isExpired = ($daysSinceSetting >= 3);
                $daysRemaining = max(0, 3 - $daysSinceSetting);
                break;
                
            case 'week':
                // 7 gün boyunca geçerli
                $isExpired = ($daysSinceSetting >= 7);
                $daysRemaining = max(0, 7 - $daysSinceSetting);
                break;
                
            case 'rotate':
                // Rotate asla expire olmaz, her gün farklı mesaj gösterir
                $isExpired = false;
                $daysRemaining = -1; // Sonsuz
                break;
        }
    }
    
    // Kullanım istatistikleri
    $weekStart = date('Y-m-d', strtotime('monday this week'));
    $monthStart = date('Y-m-01');
    $usageStats = [];
    
    try {
        $stmt = $pdo->prepare("SELECT 
                                   preset_id,
                                   MAX(used_date) as last_used_date,
                                   SUM(CASE WHEN used_date >= ? THEN used_count ELSE 0 END) as used_this_week,
                                   SUM(CASE WHEN used_date >= ? THEN used_count ELSE 0 END) as used_this_month,
                                   SUM(used_count) as total_used
                               FROM motivation_usage_log
                               WHERE mini_id = ?
                               GROUP BY preset_id");
        $stmt->execute([$weekStart, $monthStart, $mini_id]);
        $usageData = $stmt->fetchAll();
        
        foreach ($usageData as $usage) {
            $presetId = intval($usage['preset_id']);
            $lastUsed = $usage['last_used_date'];
            
            $lastUsedFormatted = '';
            if ($lastUsed === $today) {
                $lastUsedFormatted = 'Today';
            } else if ($lastUsed === date('Y-m-d', strtotime('-1 day'))) {
                $lastUsedFormatted = 'Yesterday';
            } else if ($lastUsed) {
                $lastUsedFormatted = date('M j', strtotime($lastUsed));
            }
            
            $usageStats[$presetId] = [
                'used_this_week' => intval($usage['used_this_week']),
                'used_this_month' => intval($usage['used_this_month']),
                'total_used' => intval($usage['total_used']),
                'last_used' => $lastUsedFormatted,
                'last_used_date' => $lastUsed
            ];
        }
    } catch (Exception $e) {}
    
    // ✅ AKTİF MESAJI HESAPLA (display_duration'a göre)
    $activeMessage = '';
    $activePresetIndex = null;
    
    // Eğer süre dolmuşsa, mesaj gösterme
    if ($isExpired) {
        $activeMessage = '';
        $activePresetIndex = null;
    }
    // Custom message varsa ve dolmamışsa
    else if (!empty($customMessage) && $customMessage !== 'Add New Message') {
        $activeMessage = $customMessage;
    }
    // Preset seçilmişse
    else if (!empty($selectedPresetIds)) {
        
        if ($displayDuration === 'rotate' && count($selectedPresetIds) > 1) {
            // ✅ ROTATE: Günün tarihine göre tutarlı rastgele seçim
            $seed = intval(date('Ymd')) + $mini_id;
            $randomIndex = $seed % count($selectedPresetIds);
            $activePresetIndex = $selectedPresetIds[$randomIndex];
        } else {
            // Diğer modlarda ilk seçili preset
            $activePresetIndex = $selectedPresetIds[0];
        }
        
        // Preset metnini al
        if ($activePresetIndex !== null && $activePresetIndex >= 0 && $activePresetIndex < count($presets)) {
            $activeMessage = $presets[$activePresetIndex]['message_text'];
        }
    }
    // ✅ HİÇ SEÇİM YOKSA: Tüm presetler arasında günlük random
    else if (!empty($presets)) {
        $seed = intval(date('Ymd')) + $mini_id;
        $randomIndex = $seed % count($presets);
        $activeMessage = $presets[$randomIndex]['message_text'];
        $activePresetIndex = $randomIndex;
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'presets' => $presets,
            'selected_preset_ids' => $selectedPresetIds,
            'custom_message' => $customMessage,
            'display_duration' => $displayDuration,
            'usage_stats' => $usageStats,
            'active_message' => $activeMessage,
            'active_preset_index' => $activePresetIndex,
            'resolved_parent_id' => $parent_id,
            // Duration bilgileri
            'is_expired' => $isExpired,
            'days_remaining' => $daysRemaining,
            'setting_date' => $updatedAt ? date('Y-m-d', strtotime($updatedAt)) : null
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