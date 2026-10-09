<?php
// /minitalks-api/mini/get-customizations.php
// Mini'nin customize edilmiş figürlerini getir

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
            cm.id as customization_id,
            cm.scene_id,
            cm.character_type,
            cm.customization_data,
            cm.image_url,
            cm.created_at,
            s.scene_name,
            s.scene_background
        FROM customized_minis cm
        LEFT JOIN scenes s ON cm.scene_id = s.scene_id
        WHERE cm.mini_id = ?
        ORDER BY cm.created_at DESC
        LIMIT ?
    ");
    $stmt->execute([$mini_id, $limit]);
    $customizations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Image URL'lerini düzelt
    foreach ($customizations as &$custom) {
        // Screenshot varsa onu kullan
        if ($custom['image_url'] && !str_starts_with($custom['image_url'], 'http')) {
            $custom['image_url'] = 'https://mini-talks.org/minitalks-api/' . $custom['image_url'];
        }
        
        // Scene background URL'sini düzelt
        if ($custom['scene_background'] && !str_starts_with($custom['scene_background'], 'http')) {
            $custom['scene_image'] = 'https://mini-talks.org/minitalks-api/uploads/scenes/' . $custom['scene_background'];
        } else {
            $custom['scene_image'] = $custom['scene_background'];
        }
        
        // Display image - figür screenshot'ı
        $custom['display_image'] = $custom['image_url'];
    }
    
    echo json_encode([
        'success' => true,
        'data' => $customizations
    ]);
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}