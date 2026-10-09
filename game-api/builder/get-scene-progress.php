<?php
// /minitalks-api/builder/get-scene-progress.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

date_default_timezone_set('Europe/Istanbul');
require_once '../config/db.php';

try {
    $builder_id = isset($_GET['builder_id']) ? intval($_GET['builder_id']) : 0;
    $sort_by = isset($_GET['sort_by']) ? $_GET['sort_by'] : 'scene_order';
    $sort_dir = isset($_GET['sort_dir']) ? strtoupper($_GET['sort_dir']) : 'ASC';
    
    if ($builder_id === 0) {
        throw new Exception('builder_id is required');
    }
    
    // Güvenli sort
    $allowedSorts = ['scene_order', 'scene_name', 'recording_count'];
    if (!in_array($sort_by, $allowedSorts)) {
        $sort_by = 'scene_order';
    }
    $sort_dir = ($sort_dir === 'DESC') ? 'DESC' : 'ASC';
    
    // Tüm scene'leri çek
    $stmt = $pdo->prepare("
        SELECT 
            s.scene_id,
            s.scene_name,
            s.scene_thumbnail as scene_image,
            s.scene_order
        FROM scenes s
        WHERE s.is_active = 1
        ORDER BY s.{$sort_by} {$sort_dir}
    ");
    $stmt->execute();
    $scenes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Her scene için builder progress'ini hesapla
    foreach ($scenes as &$scene) {
        // Bu scene için recording sayısı ve süre
        $recStmt = $pdo->prepare("
            SELECT 
                COUNT(*) as recording_count, 
                COALESCE(SUM(duration_seconds), 0) as total_time
            FROM builder_recordings 
            WHERE builder_id = ? AND scene_id = ?
        ");
        $recStmt->execute([$builder_id, $scene['scene_id']]);
        $recData = $recStmt->fetch(PDO::FETCH_ASSOC);
        
        $scene['recording_count'] = (int)($recData['recording_count'] ?? 0);
        $scene['total_time'] = (int)($recData['total_time'] ?? 0);
        
        // Her level için progress
        $levelStmt = $pdo->prepare("SELECT level_id, level_name, level_order FROM levels ORDER BY level_order");
        $levelStmt->execute();
        $levels = $levelStmt->fetchAll(PDO::FETCH_ASSOC);
        
        $scene['levels'] = [];
        foreach ($levels as $level) {
            $levelRecStmt = $pdo->prepare("
                SELECT COUNT(*) as cnt, COALESCE(SUM(duration_seconds), 0) as time
                FROM builder_recordings 
                WHERE builder_id = ? AND scene_id = ? AND level_id = ?
            ");
            $levelRecStmt->execute([$builder_id, $scene['scene_id'], $level['level_id']]);
            $levelRecData = $levelRecStmt->fetch(PDO::FETCH_ASSOC);
            
            $scene['levels'][] = [
                'level_id' => $level['level_id'],
                'level_name' => $level['level_name'],
                'level_order' => $level['level_order'],
                'recording_count' => (int)($levelRecData['cnt'] ?? 0),
                'total_time' => (int)($levelRecData['time'] ?? 0),
                'is_completed' => ($levelRecData['cnt'] ?? 0) > 0 ? 1 : 0
            ];
        }
        
        // Tamamlanan level sayısı
        $completedLevels = count(array_filter($scene['levels'], fn($l) => $l['is_completed']));
        $scene['completed_levels'] = $completedLevels;
        $scene['total_levels'] = count($levels);
        $scene['is_locked'] = 0; // Builder için tüm scene'ler açık
    }
    
    // Stats
    $totalRecordings = 0;
    $totalTime = 0;
    foreach ($scenes as $s) {
        $totalRecordings += $s['recording_count'];
        $totalTime += $s['total_time'];
    }
    
    echo json_encode([
        'success' => true,
        'data' => $scenes,
        'stats' => [
            'total_scenes' => count($scenes),
            'total_recordings' => $totalRecordings,
            'total_time' => $totalTime
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