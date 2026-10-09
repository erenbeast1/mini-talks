<?php
// /minitalks-api/missions/complete-mission.php
// Mission tamamlama - kayıt yapıldığında veya aktivite gerçekleştiğinde çağrılır
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
    $mission_id = isset($data['mission_id']) ? intval($data['mission_id']) : 0;
    $activity_type = isset($data['activity_type']) ? $data['activity_type'] : null;
    $scene_id = isset($data['scene_id']) ? intval($data['scene_id']) : null;
    $level_id = isset($data['level_id']) ? intval($data['level_id']) : null;
    
    if ($mini_id === 0) {
        throw new Exception('mini_id is required');
    }
    
    $completedMissions = [];
    $today = date('Y-m-d');
    $now = date('Y-m-d H:i:s');
    
    // Helper: Mission zaten bugün tamamlanmış mı kontrol et
    $checkCompleted = function($missionId) use ($pdo, $mini_id, $today) {
        $stmt = $pdo->prepare("SELECT id FROM mission_completions 
                               WHERE mini_id = ? AND mission_id = ? AND DATE(completed_at) = ?");
        $stmt->execute([$mini_id, $missionId, $today]);
        return $stmt->fetch() ? true : false;
    };
    
    // Helper: Mission tamamla
    $completeMission = function($missionId) use ($pdo, $mini_id, $now, &$completedMissions, $checkCompleted) {
        if (!$checkCompleted($missionId)) {
            $stmt = $pdo->prepare("INSERT INTO mission_completions (mini_id, mission_id, completed_at) VALUES (?, ?, ?)");
            $stmt->execute([$mini_id, $missionId, $now]);
            $completedMissions[] = $missionId;
            return true;
        }
        return false;
    };
    
    // Eğer spesifik mission_id verilmişse direkt tamamla
    if ($mission_id > 0) {
        $completeMission($mission_id);
    }
    
    // Aktivite tipine göre otomatik mission tamamlama
    if ($activity_type) {
        // Mini'nin aktif mission'larını çek
        $activeMissionIds = [];
        try {
            $stmt = $pdo->prepare("SELECT selected_mission_ids FROM mission_settings WHERE mini_id = ?");
            $stmt->execute([$mini_id]);
            $settings = $stmt->fetch();
            if ($settings && $settings['selected_mission_ids']) {
                $activeMissionIds = json_decode($settings['selected_mission_ids'], true) ?: [];
            }
        } catch (Exception $e) {}
        
        // Mission tamamlama kuralları
        // ID => Koşul açıklaması
        $missionRules = [
            // Recording yapınca tamamlanan mission'lar
            1 => ['type' => 'record', 'any' => true],  // Choose one scene and record one level
            2 => ['type' => 'record', 'any' => true],  // Record a level in your favorite scene
            3 => ['type' => 'record', 'any' => true],  // Start a new scene today
            4 => ['type' => 'record', 'any' => true],  // Finish the level you played last time
            5 => ['type' => 'record', 'any' => true],  // Try a level you have never played
            6 => ['type' => 'record', 'any' => true],  // Say the first word in your scene
            7 => ['type' => 'record', 'level' => 1],   // Record the Sound Level in any scene
            8 => ['type' => 'record', 'level' => 2],   // Record the Word Level in any scene
            9 => ['type' => 'record', 'level' => 3],   // Record the Sentence Level in any scene
            10 => ['type' => 'record', 'level' => 4],  // Record the Dialogue Level in any scene
            11 => ['type' => 'record', 'any' => true], // Say one word a little louder
            12 => ['type' => 'record', 'any' => true], // Try saying your line before character speaks
            13 => ['type' => 'record', 'any' => true], // Finish a level without pausing
            14 => ['type' => 'record', 'any' => true], // Record the same level two times
            15 => ['type' => 'record', 'any' => true], // Record in calm scene
            16 => ['type' => 'record', 'any' => true], // Try a level you feel comfortable in
            17 => ['type' => 'record', 'any' => true], // Finish using brave voice
            18 => ['type' => 'record', 'any' => true], // Record a scene level you paused earlier
            19 => ['type' => 'record', 'any' => true], // Record a level you really like again
            24 => ['type' => 'play', 'any' => true],   // Continue your streak by playing any scene
            30 => ['type' => 'record', 'any' => true], // Say one new word in any scene
        ];
        
        foreach ($activeMissionIds as $missionId) {
            $missionId = intval($missionId);
            
            if (!isset($missionRules[$missionId])) continue;
            
            $rule = $missionRules[$missionId];
            
            // Aktivite tipi eşleşmeli
            if ($rule['type'] !== $activity_type) continue;
            
            // Level kontrolü
            if (isset($rule['level']) && $level_id !== $rule['level']) continue;
            
            // Tamamla
            $completeMission($missionId);
        }
    }
    
    echo json_encode([
        'success' => true,
        'data' => [
            'completed_missions' => $completedMissions,
            'date' => $today
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
