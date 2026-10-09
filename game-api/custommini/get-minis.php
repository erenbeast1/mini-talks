<?php
// /minitalks-api/custommini/get-minis.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/db.php';

// Varsayılan customized minis
$defaultMinis = [
    ['id' => 1, 'mini_name' => 'Explorer Mini', 'character_type' => 'explorer', 'is_hidden' => false, 'display_order' => 1],
    ['id' => 2, 'mini_name' => 'Artist Mini', 'character_type' => 'artist', 'is_hidden' => false, 'display_order' => 2],
    ['id' => 3, 'mini_name' => 'Scientist Mini', 'character_type' => 'scientist', 'is_hidden' => false, 'display_order' => 3],
    ['id' => 4, 'mini_name' => 'Athlete Mini', 'character_type' => 'athlete', 'is_hidden' => true, 'display_order' => 4],
    ['id' => 5, 'mini_name' => 'Chef Mini', 'character_type' => 'chef', 'is_hidden' => false, 'display_order' => 5],
];

try {
    $mini_id = isset($_GET['mini_id']) ? intval($_GET['mini_id']) : 0;
    
    if ($mini_id === 0) {
        throw new Exception('mini_id is required');
    }
    
    $minis = $defaultMinis;
    
    try {
        $stmt = $pdo->prepare("SELECT id, mini_name, character_type, is_hidden, display_order, thumbnail_url 
                               FROM customized_minis WHERE mini_id = ? ORDER BY display_order, created_at DESC");
        $stmt->execute([$mini_id]);
        $dbMinis = $stmt->fetchAll();
        if (!empty($dbMinis)) {
            $minis = $dbMinis;
        }
    } catch (Exception $e) {
        // Tablo yoksa varsayılanları kullan
    }
    
    // Frontend array bekliyor
    echo json_encode([
        'success' => true,
        'minis' => $minis,
        'data' => $minis
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
