<?php
// /minitalks-api/motivation/save-messages.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Türkiye saat dilimi (UTC+3)
date_default_timezone_set('Europe/Istanbul');

require_once '../config/db.php';

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $mini_id = isset($data['mini_id']) ? intval($data['mini_id']) : 0;
    $parent_id = isset($data['parent_id']) ? intval($data['parent_id']) : 0;
    $selected_presets = isset($data['selected_presets']) ? $data['selected_presets'] : [];
    $custom_message = isset($data['custom_message']) ? trim($data['custom_message']) : '';
    $display_duration = isset($data['display_duration']) ? $data['display_duration'] : 'today';
    
    if ($mini_id === 0) {
        throw new Exception('mini_id is required');
    }
    
    // Parent ID yoksa, mini_profiles'dan çek
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
    
    // ⚠️ Frontend 0-indexed gönderir, veritabanı 1-indexed
    // Index'leri preset_id'ye çevir (+1)
    $preset_ids = [];
    if (!empty($selected_presets) && is_array($selected_presets)) {
        foreach ($selected_presets as $index) {
            $preset_ids[] = intval($index) + 1;
        }
    }
    
    // motivation_settings tablosunu oluştur (yoksa)
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS motivation_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            mini_id INT NOT NULL,
            parent_id INT NOT NULL DEFAULT 0,
            selected_preset_ids JSON,
            custom_message VARCHAR(255),
            display_duration ENUM('today', 'three_days', 'week', 'rotate') DEFAULT 'today',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_mini (mini_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    } catch (Exception $e) {}
    
    // Kaydet veya güncelle (mini_id bazlı unique)
    $now = date('Y-m-d H:i:s'); // PHP timezone'u kullan
    
    $stmt = $pdo->prepare("INSERT INTO motivation_settings (mini_id, parent_id, selected_preset_ids, custom_message, display_duration, updated_at) 
                           VALUES (?, ?, ?, ?, ?, ?)
                           ON DUPLICATE KEY UPDATE 
                           parent_id = VALUES(parent_id),
                           selected_preset_ids = VALUES(selected_preset_ids),
                           custom_message = VALUES(custom_message),
                           display_duration = VALUES(display_duration),
                           updated_at = VALUES(updated_at)");
    
    $stmt->execute([
        $mini_id,
        $parent_id,
        json_encode($preset_ids),
        $custom_message,
        $display_duration,
        $now
    ]);
    
    // Aktif mesajı belirle
    $motivation_message_id = null;
    $active_message_text = '';
    
    if (!empty($custom_message) && $custom_message !== 'Add New Message') {
        $active_message_text = $custom_message;
        $motivation_message_id = null;
    } else if (!empty($preset_ids)) {
        if ($display_duration === 'rotate') {
            $motivation_message_id = $preset_ids[array_rand($preset_ids)];
        } else {
            $motivation_message_id = $preset_ids[0];
        }
        
        // Preset metnini çek
        $stmt = $pdo->prepare("SELECT message_text FROM motivation_presets WHERE preset_id = ?");
        $stmt->execute([$motivation_message_id]);
        $preset = $stmt->fetch();
        if ($preset) {
            $active_message_text = $preset['message_text'];
        }
    }
    
    // Bugünün streak_history kaydını güncelle
    $today = date('Y-m-d');
    $stmt = $pdo->prepare("UPDATE streak_history 
                           SET motivation_message_id = ? 
                           WHERE mini_id = ? AND activity_date = ?");
    $stmt->execute([$motivation_message_id, $mini_id, $today]);
    $streakUpdated = $stmt->rowCount() > 0;
    
    echo json_encode([
        'success' => true,
        'message' => 'Settings saved successfully',
        'data' => [
            'mini_id' => $mini_id,
            'parent_id' => $parent_id,
            'selected_preset_ids' => $preset_ids,
            'motivation_message_id' => $motivation_message_id,
            'active_message' => $active_message_text,
            'streak_history_updated' => $streakUpdated,
            'activity_date' => $today
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
