<?php
// /minitalks-api/streak/get-daily-report.php
// Belirli bir gün için detaylı aktivite raporu

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../config/db.php';

$mini_id = isset($_GET['mini_id']) ? intval($_GET['mini_id']) : 0;
$date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');

if (!$mini_id) {
    echo json_encode(['success' => false, 'error' => 'mini_id required']);
    exit;
}

try {
    // 1. Recording verileri - scene_recordings'ten
    $recordingStmt = $pdo->prepare("
        SELECT 
            sr.level_id,
            sr.scene_id,
            sr.duration_seconds,
            s.scene_name,
            l.level_name
        FROM scene_recordings sr
        LEFT JOIN scenes s ON sr.scene_id = s.scene_id
        LEFT JOIN levels l ON sr.level_id = l.level_id
        WHERE sr.mini_id = ? AND DATE(sr.recorded_at) = ?
    ");
    $recordingStmt->execute([$mini_id, $date]);
    $recordings = $recordingStmt->fetchAll(PDO::FETCH_ASSOC);
    
    $recordingCount = count($recordings);
    $recordingDuration = 0;
    $scenesPlayed = [];
    $levelsUsed = [];
    
    foreach ($recordings as $rec) {
        $recordingDuration += (int)$rec['duration_seconds'];
        if ($rec['scene_name'] && !in_array($rec['scene_name'], $scenesPlayed)) {
            $scenesPlayed[] = $rec['scene_name'];
        }
        if ($rec['level_name'] && !in_array($rec['level_name'], $levelsUsed)) {
            $levelsUsed[] = $rec['level_name'];
        }
    }
    
    // 2. Customized Minis
    $customMinisStmt = $pdo->prepare("
        SELECT COUNT(*) as cnt 
        FROM customized_minis 
        WHERE mini_id = ? AND DATE(created_at) = ?
    ");
    $customMinisStmt->execute([$mini_id, $date]);
    $customMinisCount = (int)$customMinisStmt->fetch()['cnt'];
    
    // 3. Play Time - streak_history'den veya recording duration
    $playTimeSeconds = $recordingDuration;
    try {
        $playStmt = $pdo->prepare("SELECT play_time_seconds FROM streak_history WHERE mini_id = ? AND activity_date = ?");
        $playStmt->execute([$mini_id, $date]);
        $playData = $playStmt->fetch();
        if ($playData && (int)$playData['play_time_seconds'] > 0) {
            $playTimeSeconds = (int)$playData['play_time_seconds'];
        }
    } catch (Exception $e) {}
    
    // 4. Motivation Message - streak_history'den veya rastgele
    $motivationMessage = '';
    try {
        // Önce motivation_presets tablosunu dene
        $motStmt = $pdo->prepare("
            SELECT mp.message_text 
            FROM streak_history sh
            LEFT JOIN motivation_presets mp ON sh.motivation_message_id = mp.preset_id
            WHERE sh.mini_id = ? AND sh.activity_date = ?
        ");
        $motStmt->execute([$mini_id, $date]);
        $motData = $motStmt->fetch();
        if ($motData && !empty($motData['message_text'])) {
            $motivationMessage = $motData['message_text'];
        }
    } catch (Exception $e) {
        // motivation_presets yoksa motivation_messages dene
        try {
            $motStmt = $pdo->prepare("
                SELECT mm.message_text 
                FROM streak_history sh
                LEFT JOIN motivation_messages mm ON sh.motivation_message_id = mm.id
                WHERE sh.mini_id = ? AND sh.activity_date = ?
            ");
            $motStmt->execute([$mini_id, $date]);
            $motData = $motStmt->fetch();
            if ($motData && !empty($motData['message_text'])) {
                $motivationMessage = $motData['message_text'];
            }
        } catch (Exception $e2) {}
    }
    
    if (empty($motivationMessage) && ($recordingCount > 0 || $customMinisCount > 0)) {
        $messages = [
            "Keep going, you're doing amazing!",
            "Every recording brings you closer to fluency!",
            "Small steps create big changes!",
            "You're building something great!",
            "Practice makes perfect!"
        ];
        $motivationMessage = $messages[array_rand($messages)];
    }
    
    // 5. Rewards - o gün kazanılanlar
    $rewardsStmt = $pdo->prepare("
        SELECT 
            reward_type,
            reward_category,
            COUNT(*) as count
        FROM mini_rewards
        WHERE mini_id = ? AND DATE(earned_at) = ?
        GROUP BY reward_type, reward_category
    ");
    $rewardsStmt->execute([$mini_id, $date]);
    $rewardRows = $rewardsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    $bricks = 0;
    $brickTags = [];
    $medals = 0;
    $medalTags = [];
    $cups = 0;
    $cupTags = [];
    
    foreach ($rewardRows as $row) {
        $count = (int)$row['count'];
        $type = $row['reward_type'];
        $category = $row['reward_category'];
        $tagName = ucwords(str_replace('_', ' ', $type));
        
        switch ($category) {
            case 'brick':
                $bricks += $count;
                if (!in_array($tagName, $brickTags)) $brickTags[] = $tagName;
                break;
            case 'medal':
                $medals += $count;
                if (!in_array($tagName, $medalTags)) $medalTags[] = $tagName;
                break;
            case 'cup':
                $cups += $count;
                if (!in_array($tagName, $cupTags)) $cupTags[] = $tagName;
                break;
        }
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'date' => $date,
            'play_time_seconds' => $playTimeSeconds,
            'scenes_played' => $scenesPlayed,
            'recording_count' => $recordingCount,
            'record_time_seconds' => $recordingDuration,
            'levels_used' => $levelsUsed,
            'customized_minis_count' => $customMinisCount,
            'motivation_message' => $motivationMessage,
            'rewards' => [
                'bricks' => $bricks,
                'brickTags' => $brickTags,
                'medals' => $medals,
                'medalTags' => $medalTags,
                'cups' => $cups,
                'cupTags' => $cupTags
            ]
        ]
    ]);
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}