<?php
// /minitalks-api/mini/get-scenes.php
// Mini'nin sahnelerini ve ilerlemesini getir

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

if (!$mini_id) {
    echo json_encode(['success' => false, 'error' => 'mini_id required']);
    exit;
}

try {
    // Tüm sahneleri çek
    $scenesStmt = $pdo->prepare("
        SELECT 
            s.scene_id,
            s.scene_name,
            s.scene_thumbnail
        FROM scenes s
        ORDER BY s.scene_id ASC
    ");
    $scenesStmt->execute();
    $scenes = $scenesStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Her sahne için lock durumu ve ilerlemeyi çek
    $displayOrder = 0;
    foreach ($scenes as &$scene) {
        $displayOrder++;
        $scene['display_order'] = $displayOrder;
        
        // Scene thumbnail URL'sini düzelt
        if ($scene['scene_thumbnail'] && !str_starts_with($scene['scene_thumbnail'], 'http')) {
            $scene['scene_image'] = 'https://mini-talks.org/minitalks-api/uploads/scenes/' . $scene['scene_thumbnail'];
        } else {
            $scene['scene_image'] = $scene['scene_thumbnail'];
        }
        // Lock durumunu kontrol et (mini_scene_levels'dan)
        $lockStmt = $pdo->prepare("
            SELECT is_locked 
            FROM mini_scene_levels 
            WHERE mini_id = ? AND scene_id = ? AND level_id = 1
            LIMIT 1
        ");
        $lockStmt->execute([$mini_id, $scene['scene_id']]);
        $lockData = $lockStmt->fetch();
        
        // Kayıt yoksa varsayılan: KİLİTLİ
        if ($lockData) {
            $scene['is_locked'] = (bool)$lockData['is_locked'];
        } else {
            $scene['is_locked'] = true; // Kayıt yoksa kilitli
        }
        
        // Level ilerlemesini hesapla (4 level var: Sound, Word, Sentence, Dialogue)
        $progressStmt = $pdo->prepare("
            SELECT COUNT(DISTINCT level_id) as completed_levels
            FROM scene_recordings
            WHERE mini_id = ? AND scene_id = ?
        ");
        $progressStmt->execute([$mini_id, $scene['scene_id']]);
        $progressData = $progressStmt->fetch();
        
        $scene['words_completed'] = (int)($progressData['completed_levels'] ?? 0);
        $scene['total_words'] = 4; // 4 level
        
        // Her level için detaylı ilerleme
        $levelsStmt = $pdo->prepare("
            SELECT 
                l.level_id,
                l.level_name,
                CASE WHEN sr.level_id IS NOT NULL THEN 1 ELSE 0 END as is_completed
            FROM levels l
            LEFT JOIN (
                SELECT DISTINCT level_id 
                FROM scene_recordings 
                WHERE mini_id = ? AND scene_id = ?
            ) sr ON l.level_id = sr.level_id
            ORDER BY l.level_id
        ");
        $levelsStmt->execute([$mini_id, $scene['scene_id']]);
        $scene['levels'] = $levelsStmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    echo json_encode([
        'success' => true,
        'data' => $scenes
    ]);
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}