<?php
/**
 * Expert'e bağlı mini'leri çek (Mini Selection için)
 * GET /expert/get-connected-minis.php?expert_id=X
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../config/db.php';

$expert_id = isset($_GET['expert_id']) ? intval($_GET['expert_id']) : 0;

if (!$expert_id) {
    echo json_encode(['success' => false, 'message' => 'Expert ID required']);
    exit;
}

try {
    // Expert'e bağlı onaylanmış mini'leri çek
    $stmt = $pdo->prepare("
        SELECT 
            m.mini_id,
            m.mini_name,
            m.age_range,
            m.parent_id,
            p.full_name as parent_name,
            COALESCE(s.current_streak, 0) as current_streak,
            COALESCE(r.total_bricks, 0) as bricks,
            COALESCE(r.total_medals, 0) as medals,
            COALESCE(r.total_cups, 0) as cups
        FROM expert_mini_connections emc
        JOIN minis m ON emc.mini_id = m.mini_id
        LEFT JOIN users p ON m.parent_id = p.user_id
        LEFT JOIN mini_streaks s ON m.mini_id = s.mini_id
        LEFT JOIN mini_rewards r ON m.mini_id = r.mini_id
        WHERE emc.expert_id = :expert_id 
        AND emc.status = 'approved'
        ORDER BY m.mini_name ASC
    ");
    
    $stmt->execute(['expert_id' => $expert_id]);
    $minis = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Rewards objesini düzenle
    foreach ($minis as &$mini) {
        $mini['rewards'] = [
            'bricks' => (int)$mini['bricks'],
            'medals' => (int)$mini['medals'],
            'cups' => (int)$mini['cups']
        ];
        unset($mini['bricks'], $mini['medals'], $mini['cups']);
    }
    
    echo json_encode([
        'success' => true,
        'data' => $minis
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
