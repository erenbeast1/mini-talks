<?php
// /minitalks-api/rewards/get-recent.php
//
// The rewards a Mini has earned, newest last, so the game can show a
// notification for each one it has not shown yet.
//
// GET: ?mini_id=123[&after_id=456][&limit=20]
//
// Why the client asks rather than being told: rewards are created on the
// server, and not only by the request the child just made. reward-triggers.php
// can hand out a daily brick, a streak brick and a new-level medal off the back
// of one recording, and save-recording.php answers with reward_given:true
// without naming any of them. A client that guessed from its own call would
// miss most of them.
//
// So this endpoint is read-only and additive: nothing that already exists
// changes, and whatever awarded the reward, the game finds it.
//
// after_id is a high-water mark the client keeps. Passing it returns only what
// is new. Omitting it returns the newest `limit` rewards, which is how a client
// with no mark seeds one without showing a notification for a year of history.

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/db.php';

try {
    $mini_id  = isset($_GET['mini_id'])  ? intval($_GET['mini_id'])  : 0;
    $after_id = isset($_GET['after_id']) ? intval($_GET['after_id']) : 0;
    $limit    = isset($_GET['limit'])    ? intval($_GET['limit'])    : 20;

    if ($mini_id <= 0) {
        throw new Exception('mini_id is required');
    }

    // A burst of notifications helps nobody, and an unbounded query helps
    // nobody either.
    if ($limit < 1)  $limit = 1;
    if ($limit > 50) $limit = 50;

    if ($after_id > 0) {
        // Everything new, oldest first, so they can be shown in the order they
        // were earned.
        $stmt = $pdo->prepare("
            SELECT reward_id, reward_type, reward_category, scene_id, level_id, notes, earned_at
              FROM mini_rewards
             WHERE mini_id = ? AND reward_id > ?
             ORDER BY reward_id ASC
             LIMIT {$limit}
        ");
        $stmt->execute([$mini_id, $after_id]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } else {
        // No mark yet: hand back the newest few so the caller can take the
        // highest id as its starting point.
        $stmt = $pdo->prepare("
            SELECT reward_id, reward_type, reward_category, scene_id, level_id, notes, earned_at
              FROM mini_rewards
             WHERE mini_id = ?
             ORDER BY reward_id DESC
             LIMIT {$limit}
        ");
        $stmt->execute([$mini_id]);
        $rows = array_reverse($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    $rewards = array();
    foreach ($rows as $r) {
        $rewards[] = array(
            'reward_id'       => (int) $r['reward_id'],
            'reward_type'     => $r['reward_type'],
            'reward_category' => $r['reward_category'],
            'scene_id'        => $r['scene_id'] !== null ? (int) $r['scene_id'] : null,
            'level_id'        => $r['level_id'] !== null ? (int) $r['level_id'] : null,
            'notes'           => $r['notes'],
            'earned_at'       => $r['earned_at'],
        );
    }

    // The highest id the Mini has, whether or not it came back above. The
    // client stores this so a seeding call marks everything as already seen.
    $stmt = $pdo->prepare("SELECT COALESCE(MAX(reward_id), 0) FROM mini_rewards WHERE mini_id = ?");
    $stmt->execute([$mini_id]);
    $latestId = (int) $stmt->fetchColumn();

    echo json_encode(array(
        'success'          => true,
        'seeded'           => $after_id <= 0,
        'latest_reward_id' => $latestId,
        'rewards'          => $rewards,
    ));

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(array('success' => false, 'error' => $e->getMessage()));
}
