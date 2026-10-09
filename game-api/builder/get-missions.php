<?php
// /minitalks-api/builder/get-missions.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

date_default_timezone_set('Europe/Istanbul');
require_once '../config/db.php';

/**
 * Builder'ın istenen güne ait mission'larını çeker.
 * Eğer istenen tarih BUGÜN ise ve o gün için hiç mission yoksa,
 * mission_presets'ten 2 random mission otomatik oluşturur (login'e bağımlılığı kaldırır).
 * NOT: builder_missions.mission_id PRIMARY KEY + AUTO_INCREMENT olduğundan
 * INSERT'te belirtilmez; aksi halde duplicate key olur ve mission hiç oluşmaz.
 */
function fetchBuilderMissions($pdo, $builder_id, $date) {
    $stmt = $pdo->prepare("
        SELECT
            bm.mission_id,
            bm.builder_id,
            bm.mission_text,
            bm.is_completed,
            bm.completed_at,
            bm.mission_date
        FROM builder_missions bm
        WHERE bm.builder_id = ? AND bm.mission_date = ?
        ORDER BY bm.mission_id ASC
    ");
    $stmt->execute([$builder_id, $date]);
    $missions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Frontend ile uyum: mission_title + boolean is_completed normalize et
    foreach ($missions as &$m) {
        $m['mission_id']    = (int)$m['mission_id'];
        $m['mission_title'] = $m['mission_text'];   // dashboard mission_title okuyor
        $m['is_completed']  = (bool)$m['is_completed'];
    }
    unset($m);

    return $missions;
}

try {
    $builder_id = isset($_GET['builder_id']) ? intval($_GET['builder_id']) : 0;
    $date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');

    if ($builder_id === 0) {
        throw new Exception('builder_id is required');
    }

    $today = date('Y-m-d');
    $isToday = ($date === $today);

    $missions = fetchBuilderMissions($pdo, $builder_id, $date);

    // Bugün için mission yoksa otomatik 2 random mission oluştur
    if (count($missions) === 0 && $isToday) {
        $presetStmt = $pdo->query("SELECT mission_text FROM mission_presets ORDER BY RAND() LIMIT 2");
        $randomMissions = $presetStmt->fetchAll(PDO::FETCH_ASSOC);

        if (count($randomMissions) > 0) {
            $insertMission = $pdo->prepare("
                INSERT INTO builder_missions (builder_id, mission_text, mission_date, is_completed, created_at)
                VALUES (?, ?, ?, 0, NOW())
            ");
            foreach ($randomMissions as $mission) {
                $insertMission->execute([$builder_id, $mission['mission_text'], $today]);
            }
            // Yeniden çek
            $missions = fetchBuilderMissions($pdo, $builder_id, $date);
        }
    }

    echo json_encode([
        'success' => true,
        'data' => $missions,
        'date' => $date,
        'total' => count($missions),
        'completed' => count(array_filter($missions, fn($m) => $m['is_completed']))
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>