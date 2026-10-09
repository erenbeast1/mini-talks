<?php
// /minitalks-api/missions/save-missions.php
// Mission ayarlarını kaydeder VE mission_assignments tablosuna bugünkü görevleri ekler
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
    $input = json_decode(file_get_contents('php://input'), true);
    
    $mini_id = isset($input['mini_id']) ? intval($input['mini_id']) : 0;
    $parent_id = isset($input['parent_id']) ? intval($input['parent_id']) : 0;
    $selected_ids = isset($input['selected_ids']) ? $input['selected_ids'] : [];
    $custom_message = isset($input['custom_message']) ? trim($input['custom_message']) : '';
    $show_for = isset($input['show_for']) ? $input['show_for'] : 'today';
    
    if ($mini_id === 0) {
        throw new Exception('mini_id is required');
    }
    
    $today = date('Y-m-d');
    
    // 1. mission_settings tablosunu güncelle (mevcut davranış)
    $stmt = $pdo->prepare("SELECT id FROM mission_settings WHERE mini_id = ?");
    $stmt->execute([$mini_id]);
    $existing = $stmt->fetch();
    
    if ($existing) {
        $stmt = $pdo->prepare("UPDATE mission_settings SET 
            selected_mission_ids = ?, 
            custom_message = ?, 
            show_for = ?,
            updated_at = NOW() 
            WHERE mini_id = ?");
        $stmt->execute([
            json_encode($selected_ids),
            $custom_message,
            $show_for,
            $mini_id
        ]);
    } else {
        $stmt = $pdo->prepare("INSERT INTO mission_settings 
            (mini_id, parent_id, selected_mission_ids, custom_message, show_for, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, NOW(), NOW())");
        $stmt->execute([
            $mini_id,
            $parent_id,
            json_encode($selected_ids),
            $custom_message,
            $show_for
        ]);
    }
    
    // 2. mission_assignments tablosuna bugünkü görevleri ekle/güncelle
    // Önce bugün için mevcut incomplete assignment'ları sil (yeniden assign için)
    $stmt = $pdo->prepare("DELETE FROM mission_assignments 
                           WHERE mini_id = ? AND assigned_date = ? AND is_completed = FALSE");
    $stmt->execute([$mini_id, $today]);
    
    // Mission preset metinlerini çek
    $presetTexts = [];
    if (!empty($selected_ids)) {
        $placeholders = implode(',', array_fill(0, count($selected_ids), '?'));
        $stmt = $pdo->prepare("SELECT id, mission_text FROM mission_presets WHERE id IN ($placeholders)");
        $stmt->execute($selected_ids);
        $presets = $stmt->fetchAll();
        foreach ($presets as $p) {
            $presetTexts[$p['id']] = $p['mission_text'];
        }
    }
    
    // Bugünkü completed mission'ları çek (bunları tekrar eklemeyeceğiz)
    $completedToday = [];
    $stmt = $pdo->prepare("SELECT mission_id FROM mission_assignments 
                           WHERE mini_id = ? AND assigned_date = ? AND is_completed = TRUE");
    $stmt->execute([$mini_id, $today]);
    $completed = $stmt->fetchAll();
    foreach ($completed as $c) {
        $completedToday[] = intval($c['mission_id']);
    }
    
    // Seçili mission'ları ekle (max 2)
    $count = 0;
    foreach ($selected_ids as $missionId) {
        if ($count >= 2) break;
        
        $missionId = intval($missionId);
        
        // Zaten bugün completed ise skip
        if (in_array($missionId, $completedToday)) {
            $count++;
            continue;
        }
        
        $missionText = isset($presetTexts[$missionId]) ? $presetTexts[$missionId] : "Mission #$missionId";
        
        // UPSERT - varsa güncelle, yoksa ekle
        $stmt = $pdo->prepare("INSERT INTO mission_assignments 
            (mini_id, mission_id, mission_text, assigned_date, is_completed, is_custom, created_at) 
            VALUES (?, ?, ?, ?, FALSE, FALSE, NOW())
            ON DUPLICATE KEY UPDATE mission_text = VALUES(mission_text), updated_at = NOW()");
        $stmt->execute([$mini_id, $missionId, $missionText, $today]);
        
        $count++;
    }
    
    // Custom message varsa ve 2'ye ulaşmadıysak ekle
    if ($count < 2 && !empty($custom_message)) {
        $stmt = $pdo->prepare("INSERT INTO mission_assignments 
            (mini_id, mission_id, mission_text, assigned_date, is_completed, is_custom, created_at) 
            VALUES (?, 0, ?, ?, FALSE, TRUE, NOW())
            ON DUPLICATE KEY UPDATE mission_text = VALUES(mission_text), updated_at = NOW()");
        $stmt->execute([$mini_id, $custom_message, $today]);
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Settings saved successfully'
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>