<?php
// /minitalks-api/custommini/get-custom-minis.php
// Her customized mini için kendi character_index ve zaman aralığındaki recording'leri hesapla

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
$include_hidden = isset($_GET['include_hidden']) && $_GET['include_hidden'] === 'true';

if (!$mini_id) {
    echo json_encode(['success' => false, 'error' => 'mini_id required']);
    exit;
}

try {
    // 1. Customized minis'leri al (created_at sıralı)
    $sql = "
        SELECT 
            cm.id,
            cm.mini_id,
            cm.scene_id,
            cm.character_type,
            cm.customization_data,
            cm.image_url,
            cm.is_hidden,
            cm.display_order,
            cm.created_at,
            cm.updated_at,
            s.scene_name
        FROM customized_minis cm
        LEFT JOIN scenes s ON cm.scene_id = s.scene_id
        WHERE cm.mini_id = ?
    ";
    
    if (!$include_hidden) {
        $sql .= " AND (cm.is_hidden = 0 OR cm.is_hidden IS NULL)";
    }
    
    $sql .= " ORDER BY cm.scene_id ASC, cm.created_at ASC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$mini_id]);
    $minis = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 2. Her scene+character_index çifti için zaman aralıklarını hesapla
    // Aynı scene ve character_index'e sahip mini'ler için sonraki mini'nin başlangıç zamanı = bu mini'nin bitiş zamanı
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
    
    // character_index kolonu var mı kontrol et
    $hasCharIndexCol = false;
    try {
        $checkCol = $pdo->query("SHOW COLUMNS FROM scene_recordings LIKE 'character_index'");
        $hasCharIndexCol = $checkCol->rowCount() > 0;
    } catch (Exception $e) {
        $hasCharIndexCol = false;
    }
    
    foreach ($minis as $mini) {
        $customData = json_decode($mini['customization_data'], true) ?: [];
        $charIndex = $customData['character_index'] ?? 1;
        $timeRange = $timeRanges[$mini['id']] ?? null;
        
        // Bu mini'nin zaman aralığı ve character_index'ine göre recording'leri al
        if ($hasCharIndexCol && $timeRange) {
            if ($timeRange['end']) {
                $recordingStmt = $pdo->prepare("
                    SELECT 
                        level_id,
                        SUM(duration_seconds) as total_duration,
                        COUNT(*) as recording_count
                    FROM scene_recordings
                    WHERE mini_id = ? 
                      AND scene_id = ?
                      AND character_index = ?
                      AND recorded_at >= ?
                      AND recorded_at < ?
                    GROUP BY level_id
                ");
                $recordingStmt->execute([$mini_id, $mini['scene_id'], $charIndex, $timeRange['start'], $timeRange['end']]);
            } else {
                $recordingStmt = $pdo->prepare("
                    SELECT 
                        level_id,
                        SUM(duration_seconds) as total_duration,
                        COUNT(*) as recording_count
                    FROM scene_recordings
                    WHERE mini_id = ? 
                      AND scene_id = ?
                      AND character_index = ?
                      AND recorded_at >= ?
                    GROUP BY level_id
                ");
                $recordingStmt->execute([$mini_id, $mini['scene_id'], $charIndex, $timeRange['start']]);
            }
        } else {
            // character_index kolonu yoksa veya timeRange yoksa, sadece zaman aralığı kullan
            if ($timeRange && $timeRange['end']) {
                $recordingStmt = $pdo->prepare("
                    SELECT 
                        level_id,
                        SUM(duration_seconds) as total_duration,
                        COUNT(*) as recording_count
                    FROM scene_recordings
                    WHERE mini_id = ? 
                      AND scene_id = ?
                      AND recorded_at >= ?
                      AND recorded_at < ?
                    GROUP BY level_id
                ");
                $recordingStmt->execute([$mini_id, $mini['scene_id'], $timeRange['start'], $timeRange['end']]);
            } elseif ($timeRange) {
                $recordingStmt = $pdo->prepare("
                    SELECT 
                        level_id,
                        SUM(duration_seconds) as total_duration,
                        COUNT(*) as recording_count
                    FROM scene_recordings
                    WHERE mini_id = ? 
                      AND scene_id = ?
                      AND recorded_at >= ?
                    GROUP BY level_id
                ");
                $recordingStmt->execute([$mini_id, $mini['scene_id'], $timeRange['start']]);
            } else {
                // Fallback: tüm recording'leri al
                $recordingStmt = $pdo->prepare("
                    SELECT 
                        level_id,
                        SUM(duration_seconds) as total_duration,
                        COUNT(*) as recording_count
                    FROM scene_recordings
                    WHERE mini_id = ? AND scene_id = ?
                    GROUP BY level_id
                ");
                $recordingStmt->execute([$mini_id, $mini['scene_id']]);
            }
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
            'mini_id' => (int)$mini['mini_id'],
            'scene_id' => (int)$mini['scene_id'],
            'scene_name' => $mini['scene_name'],
            'character_type' => $mini['character_type'],
            'character_index' => $charIndex,
            'customization_data' => $customData,
            'image_url' => $mini['image_url'],
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
    
    // display_order'a göre sırala
    usort($processedMinis, function($a, $b) {
        if ($a['display_order'] == $b['display_order']) {
            return strtotime($b['date_created']) - strtotime($a['date_created']);
        }
        return $a['display_order'] - $b['display_order'];
    });
    
    // 3. İstatistikleri hesapla
    $statsStmt = $pdo->prepare("
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as this_week,
            SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as this_month,
            SUM(CASE WHEN character_type = 'female' THEN 1 ELSE 0 END) as female_count,
            SUM(CASE WHEN character_type = 'male' THEN 1 ELSE 0 END) as male_count,
            SUM(CASE WHEN character_type = 'child' THEN 1 ELSE 0 END) as child_count
        FROM customized_minis
        WHERE mini_id = ?
    ");
    $statsStmt->execute([$mini_id]);
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