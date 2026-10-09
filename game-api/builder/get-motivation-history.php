<?php
// /minitalks-api/builder/get-motivation-history.php
// Builder motivation mesajları geçmişi - hangileri kullanıldı, ne zaman
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

date_default_timezone_set('Europe/Istanbul');
require_once '../config/db.php';

// 30 Preset Messages
$presetMessages = [
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

try {
    $builder_id = isset($_GET['builder_id']) ? intval($_GET['builder_id']) : 0;
    $filter = isset($_GET['filter']) ? $_GET['filter'] : 'all';
    
    if ($builder_id === 0) {
        throw new Exception('builder_id is required');
    }
    
    // Kullanım geçmişini çek
    $usageData = [];
    try {
        // Tablo var mı kontrol et ve oluştur
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS builder_motivation_usage_log (
                id INT AUTO_INCREMENT PRIMARY KEY,
                builder_id INT NOT NULL,
                preset_id INT NOT NULL,
                used_date DATE NOT NULL,
                INDEX idx_builder_date (builder_id, used_date),
                UNIQUE KEY unique_builder_preset_date (builder_id, preset_id, used_date)
            )
        ");
        
        $usageStmt = $pdo->prepare("
            SELECT preset_id, MAX(used_date) as last_used, COUNT(*) as used_count
            FROM builder_motivation_usage_log
            WHERE builder_id = ?
            GROUP BY preset_id
        ");
        $usageStmt->execute([$builder_id]);
        while ($row = $usageStmt->fetch(PDO::FETCH_ASSOC)) {
            $usageData[(int)$row['preset_id']] = [
                'last_used' => $row['last_used'],
                'used_count' => (int)$row['used_count']
            ];
        }
    } catch (Exception $e) {
        // Tablo yoksa boş devam et
    }
    
    // Tarih helper'ları
    $today = date('Y-m-d');
    $yesterday = date('Y-m-d', strtotime('-1 day'));
    $weekStart = date('Y-m-d', strtotime('-7 days'));
    $monthStart = date('Y-m-d', strtotime('-30 days'));
    
    function getDateLabel($usedDate, $today, $yesterday) {
        if (!$usedDate) return null;
        if ($usedDate === $today) return 'Today';
        if ($usedDate === $yesterday) return 'Yesterday';
        return date('M j', strtotime($usedDate));
    }
    
    // Tüm preset'leri oluştur
    $allPresets = [];
    $usedCount = 0;
    $notUsedCount = 0;
    
    foreach ($presetMessages as $index => $message) {
        $usage = $usageData[$index] ?? null;
        $lastUsed = $usage ? $usage['last_used'] : null;
        $timesUsed = $usage ? $usage['used_count'] : 0;
        $isUsed = $lastUsed !== null;
        
        if ($isUsed) $usedCount++;
        else $notUsedCount++;
        
        // Filter kontrolü
        // "selected" = kullanılmış, "not_selected" = hiç kullanılmamış
        $includeInResult = true;
        switch ($filter) {
            case 'selected':
                $includeInResult = $isUsed;
                break;
            case 'not_selected':
                $includeInResult = !$isUsed;
                break;
            case 'used_week':
                $includeInResult = $lastUsed && $lastUsed >= $weekStart;
                break;
            case 'used_month':
                $includeInResult = $lastUsed && $lastUsed >= $monthStart;
                break;
            default:
                $includeInResult = true;
        }
        
        if ($includeInResult) {
            $allPresets[] = [
                'preset_id' => $index,
                'message_text' => $message,
                'is_selected' => $isUsed, // UI için: kullanılmış = selected
                'last_used' => $lastUsed,
                'date_label' => getDateLabel($lastUsed, $today, $yesterday),
                'used_count' => $timesUsed
            ];
        }
    }
    
    // Bugünkü aktif mesajı bul
    $todayStmt = $pdo->prepare("
        SELECT preset_id FROM builder_motivation_usage_log 
        WHERE builder_id = ? AND used_date = ?
        LIMIT 1
    ");
    $todayStmt->execute([$builder_id, $today]);
    $todayPreset = $todayStmt->fetch(PDO::FETCH_ASSOC);
    
    $activeMessage = 'The bravest Mini ever!';
    if ($todayPreset && isset($presetMessages[$todayPreset['preset_id']])) {
        $activeMessage = $presetMessages[$todayPreset['preset_id']];
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'all_presets' => $allPresets,
            'active_message' => $activeMessage,
            'used_count' => $usedCount,
            'not_used_count' => $notUsedCount,
            'total_presets' => count($presetMessages)
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