<?php
// /minitalks-api/mini/get-recordings.php
// Mini'nin kayıtlarını getir

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
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;

if (!$mini_id) {
    echo json_encode(['success' => false, 'error' => 'mini_id required']);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT 
            sr.recording_id,
            sr.scene_id,
            sr.level_id,
            sr.duration_seconds,
            sr.recorded_at as created_at,
            s.scene_name,
            s.scene_thumbnail
        FROM scene_recordings sr
        LEFT JOIN scenes s ON sr.scene_id = s.scene_id
        WHERE sr.mini_id = ?
        ORDER BY sr.recorded_at DESC
        LIMIT ?
    ");
    $stmt->execute([$mini_id, $limit]);
    $recordings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Level isimlerini map'le
    $levelNames = [1 => 'Sound', 2 => 'Word', 3 => 'Sentence', 4 => 'Dialogue'];
    
    foreach ($recordings as &$rec) {
        $rec['word_name'] = $levelNames[$rec['level_id']] ?? 'Sound';
        
        // Scene thumbnail URL'sini düzelt
        if ($rec['scene_thumbnail'] && !str_starts_with($rec['scene_thumbnail'], 'http')) {
            $rec['scene_image'] = 'https://mini-talks.org/minitalks-api/uploads/scenes/' . $rec['scene_thumbnail'];
        } else {
            $rec['scene_image'] = $rec['scene_thumbnail'];
        }
    }
    
    echo json_encode([
        'success' => true,
        'data' => $recordings
    ]);
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}