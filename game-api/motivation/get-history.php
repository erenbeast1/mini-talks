<?php
// /minitalks-api/motivation/get-history.php
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
    $filter = isset($_GET['filter']) ? $_GET['filter'] : 'all';
    
    if ($mini_id === 0) {
        throw new Exception('mini_id is required');
    }
    
    // Tarih hesaplamaları
    $today = date('Y-m-d');
    $yesterday = date('Y-m-d', strtotime('-1 day'));
    $weekStart = date('Y-m-d', strtotime('monday this week'));
    $monthStart = date('Y-m-01');
    
    // Veritabanından preset'leri çek
    $presets = [];
    try {
        $stmt = $pdo->query("SELECT preset_id, message_text FROM motivation_presets WHERE is_active = 1 ORDER BY sort_order ASC");
        $presets = $stmt->fetchAll();
    } catch (Exception $e) {
        // Varsayılan presets
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
    
    // Şu an seçili preset'leri çek
    $selectedPresetIds = [];
    $customMessage = '';
    $displayDuration = 'today';
    
    try {
        $stmt = $pdo->prepare("SELECT selected_preset_ids, custom_message, display_duration 
                               FROM motivation_settings 
                               WHERE mini_id = ? 
                               ORDER BY updated_at DESC LIMIT 1");
        $stmt->execute([$mini_id]);
        $settings = $stmt->fetch();
        
        if ($settings) {
            $selectedPresetIds = json_decode($settings['selected_preset_ids'], true) ?: [];
            $selectedPresetIds = array_map('intval', $selectedPresetIds);
            $customMessage = $settings['custom_message'] ?: '';
            $displayDuration = $settings['display_duration'] ?: 'today';
        }
    } catch (Exception $e) {}
    
    // ✅ GEÇMİŞ KULLANIMLARI streak_history'den çek
    $usageHistory = [];
    try {
        $stmt = $pdo->prepare("SELECT motivation_message_id, MAX(activity_date) as last_used_date
                               FROM streak_history 
                               WHERE mini_id = ? AND motivation_message_id IS NOT NULL
                               GROUP BY motivation_message_id");
        $stmt->execute([$mini_id]);
        $historyData = $stmt->fetchAll();
        
        foreach ($historyData as $h) {
            $presetId = intval($h['motivation_message_id']);
            $lastUsed = $h['last_used_date'];
            $usageHistory[$presetId] = [
                'last_used_date' => $lastUsed,
                'used_this_week' => ($lastUsed >= $weekStart),
                'used_this_month' => ($lastUsed >= $monthStart)
            ];
        }
    } catch (Exception $e) {}
    
    // Tüm preset'leri işle
    $allPresets = [];
    foreach ($presets as $p) {
        $presetId = intval($p['preset_id']);
        $isSelected = in_array($presetId, $selectedPresetIds);
        $usage = isset($usageHistory[$presetId]) ? $usageHistory[$presetId] : null;
        
        // Tarih etiketi - KULLANIM GEÇMİŞİNDEN
        $dateLabel = null;
        $usedThisWeek = false;
        $usedThisMonth = false;
        
        if ($usage) {
            $lastUsed = $usage['last_used_date'];
            
            // Tarih formatı
            if ($lastUsed === $today) {
                $dateLabel = 'Today';
            } else if ($lastUsed === $yesterday) {
                $dateLabel = 'Yesterday';
            } else {
                $dateLabel = date('M j', strtotime($lastUsed));
            }
            
            $usedThisWeek = $usage['used_this_week'];
            $usedThisMonth = $usage['used_this_month'];
        }
        
        $preset = [
            'preset_id' => $presetId,
            'message_text' => $p['message_text'],
            'is_selected' => $isSelected,
            'date_label' => $dateLabel,
            'used_this_week' => $usedThisWeek,
            'used_this_month' => $usedThisMonth
        ];
        
        $allPresets[] = $preset;
    }
    
    // Filtreleme
    if ($filter !== 'all') {
        $allPresets = array_filter($allPresets, function($p) use ($filter) {
            switch ($filter) {
                case 'selected':
                    return $p['is_selected'] === true;
                case 'not_selected':
                    return $p['is_selected'] === false;
                case 'used_week':
                    return $p['used_this_week'] === true;
                case 'used_month':
                    return $p['used_this_month'] === true;
                default:
                    return true;
            }
        });
        $allPresets = array_values($allPresets);
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'all_presets' => $allPresets,
            'custom_message' => $customMessage,
            'display_duration' => $displayDuration,
            'selected_count' => count($selectedPresetIds)
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
