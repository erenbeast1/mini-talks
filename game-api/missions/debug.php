<?php
// /minitalks-api/missions/debug.php
// Mission sistemini test et

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

date_default_timezone_set('Europe/Istanbul');
require_once '../config/db.php';

$mini_id = isset($_GET['mini_id']) ? intval($_GET['mini_id']) : 4;

$debug = [];

// 1. mission_presets tablosunda trigger kolonları var mı?
try {
    $stmt = $pdo->query("SHOW COLUMNS FROM mission_presets LIKE 'trigger_type'");
    $debug['trigger_type_column_exists'] = $stmt->rowCount() > 0;
} catch (Exception $e) {
    $debug['trigger_type_column_exists'] = false;
    $debug['trigger_type_error'] = $e->getMessage();
}

// 2. Aktif missionlar
try {
    $stmt = $pdo->prepare("
        SELECT 
            ma.id,
            ma.mission_id, 
            ma.mission_text,
            ma.assigned_date,
            ma.is_completed,
            ma.is_custom
        FROM mission_assignments ma
        WHERE ma.mini_id = ? AND ma.is_completed = 0
    ");
    $stmt->execute([$mini_id]);
    $debug['active_missions'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $debug['active_mission_count'] = count($debug['active_missions']);
} catch (Exception $e) {
    $debug['active_missions_error'] = $e->getMessage();
}

// 3. Mission presets with triggers
try {
    $stmt = $pdo->query("SELECT id, mission_text, trigger_type, trigger_value FROM mission_presets LIMIT 5");
    $debug['mission_presets_sample'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $debug['mission_presets_error'] = $e->getMessage();
}

// 4. JOIN test
try {
    $stmt = $pdo->prepare("
        SELECT 
            ma.id,
            ma.mission_id, 
            ma.mission_text,
            ma.is_custom,
            COALESCE(m.trigger_type, 'record_any') as trigger_type,
            COALESCE(m.trigger_value, 1) as trigger_value
        FROM mission_assignments ma
        LEFT JOIN mission_presets m ON ma.mission_id = m.id AND ma.is_custom = 0
        WHERE ma.mini_id = ? AND ma.is_completed = 0
    ");
    $stmt->execute([$mini_id]);
    $debug['joined_missions'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $debug['joined_missions_error'] = $e->getMessage();
}

// 5. Son recordings
try {
    $stmt = $pdo->prepare("
        SELECT recording_id, scene_id, level_id, recorded_at 
        FROM scene_recordings 
        WHERE mini_id = ? 
        ORDER BY recording_id DESC 
        LIMIT 3
    ");
    $stmt->execute([$mini_id]);
    $debug['recent_recordings'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $debug['recent_recordings_error'] = $e->getMessage();
}

// 6. Son rewards
try {
    $stmt = $pdo->prepare("
        SELECT id, reward_type, reward_category, earned_at, notes 
        FROM mini_rewards 
        WHERE mini_id = ? 
        ORDER BY id DESC 
        LIMIT 5
    ");
    $stmt->execute([$mini_id]);
    $debug['recent_rewards'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $debug['recent_rewards_error'] = $e->getMessage();
}

echo json_encode([
    'success' => true,
    'mini_id' => $mini_id,
    'debug' => $debug
], JSON_PRETTY_PRINT);
?>
