<?php
// /minitalks-api/builder/get-stats.php
// Builder Hub - Platform istatistikleri
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
    // Get total scenes
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM scenes WHERE is_active = 1");
    $totalScenes = $stmt->fetch()['total'] ?? 0;
    
    // Get total levels
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM levels WHERE is_active = 1");
    $totalLevels = $stmt->fetch()['total'] ?? 0;
    
    // Get total minis
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM mini_profiles");
    $totalMinis = $stmt->fetch()['total'] ?? 0;
    
    // Get total parents
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM parent_profiles");
    $totalParents = $stmt->fetch()['total'] ?? 0;
    
    // Get total experts
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM expert_profiles");
    $totalExperts = $stmt->fetch()['total'] ?? 0;
    
    // Get total builders
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM builder_profiles");
    $totalBuilders = $stmt->fetch()['total'] ?? 0;
    
    // Get total recordings
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM mini_recordings");
    $totalRecordings = $stmt->fetch()['total'] ?? 0;
    
    // Get total play time
    $stmt = $pdo->query("SELECT COALESCE(SUM(duration_seconds), 0) as total FROM mini_recordings");
    $totalPlayTime = $stmt->fetch()['total'] ?? 0;
    
    echo json_encode([
        'success' => true,
        'data' => [
            'totalScenes' => (int)$totalScenes,
            'totalLevels' => (int)$totalLevels,
            'totalMinis' => (int)$totalMinis,
            'totalParents' => (int)$totalParents,
            'totalExperts' => (int)$totalExperts,
            'totalBuilders' => (int)$totalBuilders,
            'totalRecordings' => (int)$totalRecordings,
            'totalPlayTime' => (int)$totalPlayTime
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
