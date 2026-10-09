<?php
// /minitalks-api/missions/migrate-missions.php
// Mevcut mission_completions verilerini mission_assignments tablosuna migrate eder
// BU DOSYAYI BİR KEZ ÇALIŞTIRIN, SONRA SİLİN!
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

date_default_timezone_set('Europe/Istanbul');
require_once '../config/db.php';

try {
    $migrated = 0;
    $skipped = 0;
    
    // mission_completions'daki tüm kayıtları çek
    $stmt = $pdo->query("
        SELECT 
            mc.mini_id,
            mc.mission_id,
            mc.completed_at,
            mp.mission_text
        FROM mission_completions mc
        LEFT JOIN mission_presets mp ON mc.mission_id = mp.id
        ORDER BY mc.completed_at ASC
    ");
    $completions = $stmt->fetchAll();
    
    foreach ($completions as $c) {
        $assignedDate = date('Y-m-d', strtotime($c['completed_at']));
        $missionText = $c['mission_text'] ?: "Mission #" . $c['mission_id'];
        
        // Zaten var mı kontrol et
        $checkStmt = $pdo->prepare("
            SELECT id FROM mission_assignments 
            WHERE mini_id = ? AND mission_id = ? AND assigned_date = ?
        ");
        $checkStmt->execute([$c['mini_id'], $c['mission_id'], $assignedDate]);
        
        if ($checkStmt->fetch()) {
            $skipped++;
            continue;
        }
        
        // Ekle
        $insertStmt = $pdo->prepare("
            INSERT INTO mission_assignments 
            (mini_id, mission_id, mission_text, assigned_date, is_completed, completed_at, is_custom, created_at)
            VALUES (?, ?, ?, ?, TRUE, ?, FALSE, ?)
        ");
        $insertStmt->execute([
            $c['mini_id'],
            $c['mission_id'],
            $missionText,
            $assignedDate,
            $c['completed_at'],
            $c['completed_at']
        ]);
        $migrated++;
    }
    
    echo json_encode([
        'success' => true,
        'message' => "Migration completed",
        'migrated' => $migrated,
        'skipped' => $skipped
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
