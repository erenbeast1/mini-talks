<?php
// /minitalks-api/builder/get-scenes.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

date_default_timezone_set('Europe/Istanbul');
require_once '../config/db.php';

// Scene image base URL
$sceneImageBase = 'https://mini-talks.org/minitalks-api/uploads/scenes/';

try {
    $builder_id = isset($_GET['builder_id']) ? intval($_GET['builder_id']) : 0;
    
    if ($builder_id === 0) {
        throw new Exception('builder_id is required');
    }
    
    // Tüm scene'leri çek
    $stmt = $pdo->prepare("
        SELECT 
            s.scene_id,
            s.scene_name,
            s.scene_thumbnail,
            s.scene_background,
            s.scene_order
        FROM scenes s
        WHERE s.is_active = 1
        ORDER BY s.scene_order ASC
    ");
    $stmt->execute();
    $scenes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Global levels'ı bir kere çek
    $levelStmt = $pdo->query("SELECT level_id, level_name, level_order FROM levels ORDER BY level_order");
    $allLevels = $levelStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Her scene için builder progress'ini hesapla
    foreach ($scenes as &$scene) {
        // Scene image - tam URL oluştur (önce background, yoksa thumbnail)
        $sceneImg = null;
        if (!empty($scene['scene_background'])) {
            $sceneImg = (strpos($scene['scene_background'], 'http') === 0) 
                ? $scene['scene_background'] 
                : $sceneImageBase . $scene['scene_background'];
        } elseif (!empty($scene['scene_thumbnail'])) {
            $sceneImg = (strpos($scene['scene_thumbnail'], 'http') === 0) 
                ? $scene['scene_thumbnail'] 
                : $sceneImageBase . $scene['scene_thumbnail'];
        }
        $scene['scene_image'] = $sceneImg;
        unset($scene['scene_thumbnail']);
        unset($scene['scene_background']);
        
        // Bu scene için kaç farklı level'da kayıt var
        $levelCountStmt = $pdo->prepare("
            SELECT COUNT(DISTINCT level_id) as completed_levels
            FROM builder_recordings 
            WHERE builder_id = ? AND scene_id = ?
        ");
        $levelCountStmt->execute([$builder_id, $scene['scene_id']]);
        $levelData = $levelCountStmt->fetch(PDO::FETCH_ASSOC);
        
        // words_completed = tamamlanan level sayısı * 2 (her level = 2 brick progress)
        $scene['words_completed'] = ($levelData['completed_levels'] ?? 0) * 2;
        
        // Total recordings in this scene
        $recStmt = $pdo->prepare("
            SELECT COUNT(*) as recording_count, COALESCE(SUM(duration_seconds), 0) as play_time_seconds
            FROM builder_recordings 
            WHERE builder_id = ? AND scene_id = ?
        ");
        $recStmt->execute([$builder_id, $scene['scene_id']]);
        $recData = $recStmt->fetch(PDO::FETCH_ASSOC);
        
        $scene['recording_count'] = $recData['recording_count'] ?? 0;
        $scene['play_time_seconds'] = $recData['play_time_seconds'] ?? 0;
        
        // Builder için tüm scene'ler açık
        $scene['is_locked'] = 0;
        $scene['current_level'] = 1;
        
        // Her level için progress
        $scene['levels'] = [];
        foreach ($allLevels as $level) {
            // Bu level'da kayıt var mı
            $checkStmt = $pdo->prepare("
                SELECT COUNT(*) as cnt 
                FROM builder_recordings 
                WHERE builder_id = ? AND scene_id = ? AND level_id = ?
            ");
            $checkStmt->execute([$builder_id, $scene['scene_id'], $level['level_id']]);
            $checkData = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            $scene['levels'][] = [
                'level_id' => $level['level_id'],
                'level_name' => $level['level_name'],
                'level_order' => $level['level_order'],
                'is_completed' => ($checkData['cnt'] ?? 0) > 0 ? 1 : 0,
                'stars_earned' => ($checkData['cnt'] ?? 0) > 0 ? 3 : 0
            ];
        }
    }
    
    echo json_encode([
        'success' => true,
        'data' => $scenes
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>