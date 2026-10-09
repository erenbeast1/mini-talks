<?php
// /minitalks-api/builder/get-motivation.php
// Builder için günlük otomatik random motivation mesajı
// 5 gün cooldown - aynı mesaj 5 gün içinde tekrar gelmez
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
    
    if ($builder_id === 0) {
        throw new Exception('builder_id is required');
    }
    
    $today = date('Y-m-d');
    $selectedPresetId = null;
    $activeMessage = 'The bravest Mini ever!';
    
    // builder_motivation_usage_log tablosu yoksa oluştur
    try {
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
    } catch (Exception $e) {
        // Tablo zaten varsa devam et
    }
    
    // Bugün için zaten seçilmiş mesaj var mı?
    $todayStmt = $pdo->prepare("
        SELECT preset_id 
        FROM builder_motivation_usage_log 
        WHERE builder_id = ? AND used_date = ?
        LIMIT 1
    ");
    $todayStmt->execute([$builder_id, $today]);
    $todayPreset = $todayStmt->fetch(PDO::FETCH_ASSOC);
    
    if ($todayPreset) {
        // Bugün zaten bir mesaj seçilmiş, onu kullan
        $selectedPresetId = (int)$todayPreset['preset_id'];
    } else {
        // Bugün için yeni mesaj seç
        // Son 5 günde kullanılan preset'leri çek
        $cooldownDate = date('Y-m-d', strtotime('-5 days'));
        $usedStmt = $pdo->prepare("
            SELECT DISTINCT preset_id 
            FROM builder_motivation_usage_log 
            WHERE builder_id = ? AND used_date >= ?
        ");
        $usedStmt->execute([$builder_id, $cooldownDate]);
        $recentlyUsed = $usedStmt->fetchAll(PDO::FETCH_COLUMN);
        
        // Tüm preset ID'leri (0-29)
        $allIds = range(0, count($presetMessages) - 1);
        
        // Kullanılabilir preset'leri filtrele (son 5 günde kullanılmamış)
        $availableIds = array_values(array_diff($allIds, $recentlyUsed));
        
        // Eğer tüm preset'ler cooldown'daysa, hepsini kullanılabilir yap
        if (empty($availableIds)) {
            $availableIds = $allIds;
        }
        
        // Random seç
        $randomKey = array_rand($availableIds);
        $selectedPresetId = (int)$availableIds[$randomKey];
        
        // Bugün için kullanım loguna kaydet
        try {
            $logStmt = $pdo->prepare("
                INSERT IGNORE INTO builder_motivation_usage_log (builder_id, preset_id, used_date)
                VALUES (?, ?, ?)
            ");
            $logStmt->execute([$builder_id, $selectedPresetId, $today]);
        } catch (Exception $e) {
            // Log hatası olursa devam et
        }
    }
    
    // Mesajı al
    if (isset($presetMessages[$selectedPresetId])) {
        $activeMessage = $presetMessages[$selectedPresetId];
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'active_message' => $activeMessage,
            'preset_id' => $selectedPresetId,
            'date' => $today
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