<?php
// /minitalks-api/missions/save-missions.php
// MissionsManager'dan mission ayarlarını kaydeder
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

date_default_timezone_set('Europe/Istanbul');
require_once '../config/db.php';

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $mini_id = isset($data['mini_id']) ? intval($data['mini_id']) : 0;
    $parent_id = isset($data['parent_id']) ? intval($data['parent_id']) : 0;
    $selected_ids = isset($data['selected_ids']) ? $data['selected_ids'] : [];
    $custom_message = isset($data['custom_message']) ? trim($data['custom_message']) : '';
    $show_for = isset($data['show_for']) ? $data['show_for'] : 'today';
    
    if ($mini_id === 0) {
        throw new Exception('mini_id is required');
    }
    
    // Parent ID yoksa mini_profiles'dan çek
    if ($parent_id === 0) {
        try {
            $stmt = $pdo->prepare("SELECT parent_id FROM mini_profiles WHERE mini_id = ?");
            $stmt->execute([$mini_id]);
            $result = $stmt->fetch();
            if ($result && $result['parent_id']) {
                $parent_id = intval($result['parent_id']);
            }
        } catch (Exception $e) {}
    }
    
    // selected_ids'i integer array'e çevir
    $missionIds = [];
    if (!empty($selected_ids) && is_array($selected_ids)) {
        foreach ($selected_ids as $id) {
            $missionIds[] = intval($id);
        }
    }
    
    $now = date('Y-m-d H:i:s');
    
    // Kaydet veya güncelle (mini_id bazlı unique)
    $stmt = $pdo->prepare("INSERT INTO mission_settings (mini_id, parent_id, selected_mission_ids, custom_message, show_for, updated_at) 
                           VALUES (?, ?, ?, ?, ?, ?)
                           ON DUPLICATE KEY UPDATE 
                           parent_id = VALUES(parent_id),
                           selected_mission_ids = VALUES(selected_mission_ids),
                           custom_message = VALUES(custom_message),
                           show_for = VALUES(show_for),
                           updated_at = VALUES(updated_at)");
    
    $stmt->execute([
        $mini_id,
        $parent_id,
        json_encode($missionIds),
        $custom_message,
        $show_for,
        $now
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Mission settings saved successfully',
        'data' => [
            'mini_id' => $mini_id,
            'selected_mission_ids' => $missionIds,
            'custom_message' => $custom_message,
            'show_for' => $show_for
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
