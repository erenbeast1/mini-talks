<?php
// /minitalks-api/mini/get-missions.php
// MiniManage için - belirtilen tarihteki mission'ları döndürür
// mission_assignments tablosundan okur (completed + incomplete)
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
    $mini_id = isset($_GET['mini_id']) ? intval($_GET['mini_id']) : 0;
    $date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
    
    if ($mini_id === 0) {
        throw new Exception('mini_id is required');
    }
    
    // Tarih formatını doğrula
    $dateObj = DateTime::createFromFormat('Y-m-d', $date);
    if (!$dateObj || $dateObj->format('Y-m-d') !== $date) {
        $date = date('Y-m-d');
    }
    
    $today = date('Y-m-d');
    $isToday = ($date === $today);
    
    $missions = [];
    
    // mission_assignments tablosundan o tarihteki kayıtları çek
    $stmt = $pdo->prepare("
        SELECT mission_id, mission_text, is_completed, is_custom, completed_at
        FROM mission_assignments 
        WHERE mini_id = ? AND assigned_date = ?
        ORDER BY is_custom ASC, id ASC
        LIMIT 2
    ");
    $stmt->execute([$mini_id, $date]);
    $assignments = $stmt->fetchAll();
    
    if (count($assignments) > 0) {
        // mission_assignments tablosundan veri var
        foreach ($assignments as $a) {
            $missions[] = [
                'mission_id' => intval($a['mission_id']),
                'mission_title' => $a['mission_text'],
                'is_completed' => (bool)$a['is_completed'],
                'is_custom' => (bool)$a['is_custom']
            ];
        }
    } else if ($isToday) {
        // Bugün için assignment yok, mission_settings'den oluştur
        // (İlk kez açılıyorsa veya henüz save edilmediyse)
        
        $selectedMissionIds = [];
        $customMessage = '';
        
        $stmt = $pdo->prepare("SELECT selected_mission_ids, custom_message 
                               FROM mission_settings 
                               WHERE mini_id = ? 
                               ORDER BY updated_at DESC LIMIT 1");
        $stmt->execute([$mini_id]);
        $settings = $stmt->fetch();
        
        if ($settings) {
            $selectedMissionIds = json_decode($settings['selected_mission_ids'], true) ?: [];
            $customMessage = $settings['custom_message'] ?: '';
        }
        
        // Mission preset metinlerini çek
        $presetTexts = [];
        if (!empty($selectedMissionIds)) {
            $placeholders = implode(',', array_fill(0, count($selectedMissionIds), '?'));
            $stmt = $pdo->prepare("SELECT id, mission_text FROM mission_presets WHERE id IN ($placeholders)");
            $stmt->execute($selectedMissionIds);
            $dbPresets = $stmt->fetchAll();
            foreach ($dbPresets as $p) {
                $presetTexts[$p['id']] = $p['mission_text'];
            }
        }
        
        // Bugün tamamlanan mission'ları çek (eski mission_completions tablosundan)
        $completedMissions = [];
        try {
            $stmt = $pdo->prepare("SELECT mission_id FROM mission_completions 
                                   WHERE mini_id = ? AND DATE(completed_at) = ?");
            $stmt->execute([$mini_id, $date]);
            $dbCompletions = $stmt->fetchAll();
            foreach ($dbCompletions as $c) {
                $completedMissions[] = intval($c['mission_id']);
            }
        } catch (Exception $e) {}
        
        // Mission listesini oluştur (max 2 tane)
        $count = 0;
        foreach ($selectedMissionIds as $missionId) {
            if ($count >= 2) break;
            
            $missionId = intval($missionId);
            $missionText = isset($presetTexts[$missionId]) ? $presetTexts[$missionId] : "Mission #$missionId";
            $isCompleted = in_array($missionId, $completedMissions);
            
            $missions[] = [
                'mission_id' => $missionId,
                'mission_title' => $missionText,
                'is_completed' => $isCompleted,
                'is_custom' => false
            ];
            $count++;
        }
        
        // Custom mission varsa ekle
        if ($count < 2 && !empty($customMessage)) {
            $missions[] = [
                'mission_id' => 0,
                'mission_title' => $customMessage,
                'is_completed' => false,
                'is_custom' => true
            ];
        }
    }
    // else: Geçmiş tarih ve assignment yok = boş array döner
    
    echo json_encode([
        'success' => true,
        'data' => $missions,
        'date' => $date,
        'is_today' => $isToday
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>