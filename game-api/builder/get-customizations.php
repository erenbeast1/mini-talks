<?php
// /minitalks-api/builder/get-customizations.php
// Her customized mini için kendi character_index ve zaman aralığındaki recording'leri hesapla
// Mini API'si (custommini/get-custom-minis.php) ile aynı mantık

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

date_default_timezone_set('Europe/Istanbul');
require_once '../config/db.php';

$builder_id = isset($_GET['builder_id']) ? intval($_GET['builder_id']) : 0;
$include_hidden = isset($_GET['include_hidden']) && $_GET['include_hidden'] === 'true';

if (!$builder_id) {
    echo json_encode(['success' => false, 'error' => 'builder_id required']);
    exit;
}

// Scene image base URL
$sceneImageBase = 'https://mini-talks.org/minitalks-api/uploads/scenes/';

try {
    // 1. Customized minis'leri al (created_at sıralı)
    $sql = "
        SELECT 
            bcm.custom_mini_id as id,
            bcm.builder_id,
            bcm.scene_id,
            bcm.character_type,
            bcm.customization_data,
            bcm.image_url,
            bcm.is_hidden,
            bcm.display_order,
            bcm.created_at,
            bcm.updated_at,
            s.scene_name,
            s.scene_thumbnail,
            s.scene_background
        FROM builder_customized_minis bcm
        LEFT JOIN scenes s ON bcm.scene_id = s.scene_id
        WHERE bcm.builder_id = ?
    ";
    
    if (!$include_hidden) {
        $sql .= " AND (bcm.is_hidden = 0 OR bcm.is_hidden IS NULL)";
    }
    
    $sql .= " ORDER BY bcm.scene_id ASC, bcm.created_at ASC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$builder_id]);
    $minis = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 2. Her scene+character_index çifti için zaman aralıklarını hesapla
    $timeRanges = [];
    $groupedMinis = [];
    
    foreach ($minis as $mini) {
        $customData = json_decode($mini['customization_data'], true) ?: [];
        $charIndex = $customData['character_index'] ?? 1;
        $key = $mini['scene_id'] . '-' . $charIndex;
        
        if (!isset($groupedMinis[$key])) {
            $groupedMinis[$key] = [];
        }
        $groupedMinis[$key][] = $mini;
    }
    
    // Her grup için zaman aralıklarını belirle
    foreach ($groupedMinis as $key => $group) {
        for ($i = 0; $i < count($group); $i++) {
            $mini = $group[$i];
            $startTime = $mini['created_at'];
            $endTime = isset($group[$i + 1]) ? $group[$i + 1]['created_at'] : null;
            
            $timeRanges[$mini['id']] = [
                'start' => $startTime,
                'end' => $endTime,
                'scene_id' => $mini['scene_id'],
                'character_index' => json_decode($mini['customization_data'], true)['character_index'] ?? 1
            ];
        }
    }
    
    $levelNames = [1 => 'Sound', 2 => 'Word', 3 => 'Sentence', 4 => 'Dialogue'];
    
    $processedMinis = [];
    $longestRecordingMiniId = null;
    $longestRecordingTime = 0;
    
    foreach ($minis as $mini) {
        $customData = json_decode($mini['customization_data'], true) ?: [];
        $charIndex = $customData['character_index'] ?? 1;
        $timeRange = $timeRanges[$mini['id']] ?? null;
        
        // Scene image URL oluştur
        $sceneImg = null;
        if (!empty($mini['scene_background'])) {
            $sceneImg = (strpos($mini['scene_background'], 'http') === 0) 
                ? $mini['scene_background'] 
                : $sceneImageBase . $mini['scene_background'];
        } elseif (!empty($mini['scene_thumbnail'])) {
            $sceneImg = (strpos($mini['scene_thumbnail'], 'http') === 0) 
                ? $mini['scene_thumbnail'] 
                : $sceneImageBase . $mini['scene_thumbnail'];
        }
        
        // Bu mini'nin zaman aralığı ve character_index'ine göre recording'leri al
        if ($timeRange) {
            if ($timeRange['end']) {
                $recordingStmt = $pdo->prepare("
                    SELECT 
                        level_id,
                        SUM(duration_seconds) as total_duration,
                        COUNT(*) as recording_count
                    FROM builder_recordings
                    WHERE builder_id = ? 
                      AND scene_id = ?
                      AND character_index = ?
                      AND created_at >= ?
                      AND created_at < ?
                    GROUP BY level_id
                ");
                $recordingStmt->execute([$builder_id, $mini['scene_id'], $charIndex, $timeRange['start'], $timeRange['end']]);
            } else {
                $recordingStmt = $pdo->prepare("
                    SELECT 
                        level_id,
                        SUM(duration_seconds) as total_duration,
                        COUNT(*) as recording_count
                    FROM builder_recordings
                    WHERE builder_id = ? 
                      AND scene_id = ?
                      AND character_index = ?
                      AND created_at >= ?
                    GROUP BY level_id
                ");
                $recordingStmt->execute([$builder_id, $mini['scene_id'], $charIndex, $timeRange['start']]);
            }
        } else {
            // Fallback: tüm recording'leri al
            $recordingStmt = $pdo->prepare("
                SELECT 
                    level_id,
                    SUM(duration_seconds) as total_duration,
                    COUNT(*) as recording_count
                FROM builder_recordings
                WHERE builder_id = ? AND scene_id = ? AND character_index = ?
                GROUP BY level_id
            ");
            $recordingStmt->execute([$builder_id, $mini['scene_id'], $charIndex]);
        }
        
        $recordings = $recordingStmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Toplam recording time ve kullanılan level'ları hesapla
        $totalRecordingTime = 0;
        $totalRecordingCount = 0;
        $levelsUsed = [];
        
        foreach ($recordings as $rec) {
            $totalRecordingTime += (int)$rec['total_duration'];
            $totalRecordingCount += (int)$rec['recording_count'];
            if (isset($levelNames[$rec['level_id']])) {
                $levelsUsed[] = $levelNames[$rec['level_id']];
            }
        }
        
        // En uzun kayıt kontrolü
        if ($totalRecordingTime > $longestRecordingTime) {
            $longestRecordingTime = $totalRecordingTime;
            $longestRecordingMiniId = (int)$mini['id'];
        }
        
        $processedMinis[] = [
            'id' => (int)$mini['id'],
            'customization_id' => (int)$mini['id'],
            'builder_id' => (int)$mini['builder_id'],
            'scene_id' => (int)$mini['scene_id'],
            'scene_name' => $mini['scene_name'],
            'scene_image' => $sceneImg,
            'character_type' => $mini['character_type'],
            'character_index' => $charIndex,
            'display_image' => $mini['image_url'],
            'is_hidden' => (bool)$mini['is_hidden'],
            'display_order' => (int)($mini['display_order'] ?? 0),
            'date_created' => $mini['created_at'],
            'levels_used' => array_unique($levelsUsed),
            'recording_time' => $totalRecordingTime,
            'recording_count' => $totalRecordingCount,
            'is_longest' => false
        ];
    }
    
    // En uzun kayıtlı mini'yi işaretle
    foreach ($processedMinis as &$m) {
        if ($m['id'] === $longestRecordingMiniId) {
            $m['is_longest'] = true;
        }
    }
    
    // display_order'a göre sırala (en son oluşturulan önce)
    usort($processedMinis, function($a, $b) {
        if ($a['display_order'] == $b['display_order']) {
            return strtotime($b['date_created']) - strtotime($a['date_created']);
        }
        return $a['display_order'] - $b['display_order'];
    });
    
    // 3. İstatistikleri hesapla (Mini API ile aynı SQL)
    $statsStmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as this_week,
            SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as this_month,
            SUM(CASE WHEN LOWER(COALESCE(character_type, '')) = 'female' THEN 1 ELSE 0 END) as female_count,
            SUM(CASE WHEN LOWER(COALESCE(character_type, '')) = 'male' THEN 1 ELSE 0 END) as male_count,
            SUM(CASE WHEN LOWER(COALESCE(character_type, '')) = 'child' THEN 1 ELSE 0 END) as child_count
        FROM builder_customized_minis
        WHERE builder_id = ? AND (is_hidden = 0 OR is_hidden IS NULL)
    ");
    $statsStmt->execute([$builder_id]);
    $statsRow = $statsStmt->fetch(PDO::FETCH_ASSOC);
    
    $stats = [
        'total' => (int)($statsRow['total'] ?? 0),
        'this_week' => (int)($statsRow['this_week'] ?? 0),
        'this_month' => (int)($statsRow['this_month'] ?? 0),
        'types' => [
            'female' => (int)($statsRow['female_count'] ?? 0),
            'male' => (int)($statsRow['male_count'] ?? 0),
            'child' => (int)($statsRow['child_count'] ?? 0)
        ],
        'longest_recording_mini_id' => $longestRecordingMiniId,
        'longest_recording_time' => $longestRecordingTime
    ];
    
    // Response formatı - Mini API ile aynı (data.minis + data.stats)
    echo json_encode([
        'success' => true,
        'data' => [
            'minis' => $processedMinis,
            'stats' => $stats
        ]
    ]);
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>