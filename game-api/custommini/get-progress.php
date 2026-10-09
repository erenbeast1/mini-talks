<?php
// /minitalks-api/custommini/get-progress.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/db.php';

$defaultMinis = [
    ['id' => 1, 'mini_name' => 'Explorer Mini', 'character_type' => 'explorer', 'total_recording_time' => 125],
    ['id' => 2, 'mini_name' => 'Artist Mini', 'character_type' => 'artist', 'total_recording_time' => 340],
    ['id' => 3, 'mini_name' => 'Scientist Mini', 'character_type' => 'scientist', 'total_recording_time' => 89],
];

$defaultStats = [
    'totalCustomized' => 5,
    'characterTypes' => 3,
    'longestRecordingMiniId' => 2
];

try {
    $mini_id = isset($_GET['mini_id']) ? intval($_GET['mini_id']) : 0;
    
    if ($mini_id === 0) {
        throw new Exception('mini_id is required');
    }
    
    $minis = $defaultMinis;
    $stats = $defaultStats;
    
    try {
        $stmt = $pdo->prepare("SELECT id, mini_name, character_type, total_recording_time 
                               FROM customized_minis WHERE mini_id = ? AND is_hidden = 0 
                               ORDER BY display_order, created_at DESC");
        $stmt->execute([$mini_id]);
        $dbMinis = $stmt->fetchAll();
        if (!empty($dbMinis)) {
            $minis = $dbMinis;
        }
        
        // Stats
        $countStmt = $pdo->prepare("SELECT COUNT(*) as total, COUNT(DISTINCT character_type) as types FROM customized_minis WHERE mini_id = ?");
        $countStmt->execute([$mini_id]);
        $countRow = $countStmt->fetch();
        if ($countRow) {
            $stats['totalCustomized'] = (int)$countRow['total'];
            $stats['characterTypes'] = (int)$countRow['types'];
        }
        
        // Longest recording
        $longestStmt = $pdo->prepare("SELECT id FROM customized_minis WHERE mini_id = ? ORDER BY total_recording_time DESC LIMIT 1");
        $longestStmt->execute([$mini_id]);
        $longestRow = $longestStmt->fetch();
        if ($longestRow) {
            $stats['longestRecordingMiniId'] = (int)$longestRow['id'];
        }
    } catch (Exception $e) {
        // Tablo yoksa varsayılanları kullan
    }
    
    // Frontend'in beklediği formatta döndür
    echo json_encode([
        'success' => true,
        'minis' => $minis,
        'total_customized' => $stats['totalCustomized'],
        'character_types' => $stats['characterTypes'],
        'longest_recording_mini_id' => $stats['longestRecordingMiniId'],
        'data' => [
            'minis' => $minis,
            'stats' => $stats
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
