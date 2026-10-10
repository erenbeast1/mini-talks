<?php
/**
 * tests/reward-feed.php — rewards/get-recent.php, the feed the notifications
 * read, against a real database.
 *
 * The behaviour that matters is the high-water mark. Get it wrong one way and
 * a child opening the game is buried under every reward they have ever earned;
 * get it wrong the other way and a reward they just earned is never mentioned.
 *
 * Same shape as tests/resend-verification.php: the endpoint is copied fresh
 * and served by PHP's own web server, so this cannot pass against a stale copy.
 *
 * Run: php tests/reward-feed.php
 */

$root = dirname(__DIR__);
$src  = $root . '/game-api/rewards/get-recent.php';
$dir  = sys_get_temp_dir() . '/mt-rewardfeed-test-' . getmypid();
$db   = $dir . '/test.sqlite';

@mkdir($dir . '/rewards', 0700, true);
@mkdir($dir . '/config', 0700, true);

if (!is_file($src)) {
    fwrite(STDERR, "missing endpoint: $src\n");
    exit(1);
}
copy($src, $dir . '/rewards/get-recent.php');

file_put_contents($dir . '/config/db.php', <<<'PHP'
<?php
$pdo = new PDO('sqlite:' . __DIR__ . '/../test.sqlite');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
PHP);

/* Columns as the production dump has them (mini_rewards). */
$pdo = new PDO('sqlite:' . $db);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec("CREATE TABLE mini_rewards (
    reward_id INTEGER PRIMARY KEY, mini_id INTEGER, reward_type TEXT,
    reward_category TEXT, scene_id INTEGER, level_id INTEGER, notes TEXT,
    earned_at TEXT)");

$add = $pdo->prepare("INSERT INTO mini_rewards
    (reward_id, mini_id, reward_type, reward_category, scene_id, level_id, notes, earned_at)
    VALUES (?,?,?,?,?,?,?,?)");

// Mini 1: a history, then three earned in one go (what one recording can do).
$add->execute([1, 1, 'daily_brick',         'brick', null, null, null, '2026-10-01 09:00:00']);
$add->execute([2, 1, 'recording_brick',     'brick', 1,    1,    null, '2026-10-01 09:05:00']);
$add->execute([3, 1, 'new_scene_medal',     'medal', 1,    null, null, '2026-10-02 10:00:00']);
$add->execute([4, 1, 'progress_medal',      'medal', null, null, 'Auto-converted from 10 bricks', '2026-10-02 10:00:01']);
$add->execute([5, 1, 'streak_brick',        'brick', null, null, null, '2026-10-03 11:00:00']);
// Mini 2: someone else's, must never leak into Mini 1's feed.
$add->execute([6, 2, 'mission_brick',       'brick', null, null, null, '2026-10-03 12:00:00']);
// Mini 1 again, after Mini 2 — so ids are not contiguous per Mini.
$add->execute([7, 1, 'new_level_medal',     'medal', 1,    2,    null, '2026-10-03 13:00:00']);

$port = 8600 + (getmypid() % 900);
$log  = $dir . '/server.log';
$pid  = (int) trim((string) shell_exec(sprintf(
    'php -S 127.0.0.1:%d -t %s > %s 2>&1 & echo $!',
    $port, escapeshellarg($dir), escapeshellarg($log)
)));
register_shutdown_function(function () use ($pid) {
    if ($pid > 0) @exec('kill ' . $pid . ' 2>/dev/null');
});

$up = false;
for ($i = 0; $i < 80; $i++) {
    $sock = @fsockopen('127.0.0.1', $port, $e1, $e2, 0.2);
    if ($sock) { fclose($sock); $up = true; break; }
    usleep(50000);
}
if (!$up) {
    fwrite(STDERR, "could not start php -S on port $port\n");
    if (is_file($log)) fwrite(STDERR, file_get_contents($log));
    exit(1);
}

function get($query) {
    global $port;
    $ctx = stream_context_create(array('http' => array(
        'method' => 'GET', 'timeout' => 10, 'ignore_errors' => true,
    )));
    $raw = (string) @file_get_contents(
        "http://127.0.0.1:$port/rewards/get-recent.php?" . $query, false, $ctx);
    return array(json_decode(trim($raw), true), $raw, $http_response_header ?? array());
}

$passed = 0; $failed = 0;
function ok($what, $cond) {
    global $passed, $failed;
    if ($cond) { $passed++; return; }
    $failed++;
    echo "  FAIL: $what\n";
}
function types($rewards) {
    return array_map(function ($r) { return $r['reward_type']; }, $rewards ?: array());
}

/* ── 1. no mark: say where to start, show nothing ────────────────────────── */
list($r) = get('mini_id=1');
ok('a first look succeeds', isset($r['success']) && $r['success'] === true);
ok('and is flagged as a seeding call', $r['seeded'] === true);
ok('it reports the newest reward id', (int) $r['latest_reward_id'] === 7);
ok('the newest id belongs to THIS Mini, not the table',
   (int) $r['latest_reward_id'] !== 6);   // 6 is Mini 2's

/* ── 2. with a mark: only what is newer, oldest first ────────────────────── */
list($r) = get('mini_id=1&after_id=2');
ok('a later look is not a seeding call', $r['seeded'] === false);
ok('only rewards after the mark come back', count($r['rewards']) === 4);
ok('in the order they were earned',
   types($r['rewards']) === array('new_scene_medal', 'progress_medal', 'streak_brick', 'new_level_medal'));
ok('each carries its id', $r['rewards'][0]['reward_id'] === 3);
ok('and its category, so the colour is right before any copy exists',
   $r['rewards'][0]['reward_category'] === 'medal');
ok('and the scene it belongs to', $r['rewards'][0]['scene_id'] === 1);
ok('a converted medal keeps the note that made it',
   strpos((string) $r['rewards'][1]['notes'], 'Auto-converted') === 0);
ok('a reward with no scene reports null rather than 0',
   $r['rewards'][1]['scene_id'] === null && $r['rewards'][1]['level_id'] === null);

/* ── 3. another Mini's rewards never appear ──────────────────────────────── */
ok('Mini 2\'s mission brick is not in Mini 1\'s feed',
   !in_array('mission_brick', types($r['rewards']), true));
list($r2) = get('mini_id=2&after_id=0');
ok('and Mini 2 has a feed of its own', (int) $r2['latest_reward_id'] === 6);

/* ── 4. caught up: nothing new, and that is not an error ─────────────────── */
list($r) = get('mini_id=1&after_id=7');
ok('being up to date is a success', $r['success'] === true);
ok('with nothing to show', count($r['rewards']) === 0);
ok('and the mark unchanged', (int) $r['latest_reward_id'] === 7);

/* ── 5. a mark from the future does not produce anything ─────────────────── */
list($r) = get('mini_id=1&after_id=99999');
ok('a mark past the end shows nothing rather than everything', count($r['rewards']) === 0);

/* ── 6. a Mini with no rewards at all ────────────────────────────────────── */
list($r) = get('mini_id=404');
ok('a Mini with no rewards still succeeds', $r['success'] === true);
ok('reports no rewards', count($r['rewards']) === 0);
ok('and a mark of zero, so the next call seeds again', (int) $r['latest_reward_id'] === 0);

/* ── 7. limits ───────────────────────────────────────────────────────────── */
list($r) = get('mini_id=1&after_id=0&limit=2');
ok('a seeding call respects the limit', count($r['rewards']) === 2);
ok('and still reports the true newest id', (int) $r['latest_reward_id'] === 7);
list($r) = get('mini_id=1&after_id=1&limit=1');
ok('so does a normal call', count($r['rewards']) === 1);
ok('taking the oldest unseen one first', $r['rewards'][0]['reward_id'] === 2);

list($r) = get('mini_id=1&after_id=1&limit=9999');
ok('an enormous limit is capped rather than honoured', count($r['rewards']) <= 50);
list($r) = get('mini_id=1&after_id=1&limit=0');
ok('a zero limit still returns something', count($r['rewards']) >= 1);
list($r) = get('mini_id=1&after_id=1&limit=-5');
ok('so does a negative one', count($r['rewards']) >= 1);

/* ── 8. bad input ────────────────────────────────────────────────────────── */
list($r, $raw) = get('mini_id=0');
ok('a missing mini_id is refused', isset($r['success']) && $r['success'] === false);
list($r, $raw) = get('');
ok('so is no mini_id at all', isset($r['success']) && $r['success'] === false);

// intval() makes this the number 1, and the query is parameterised, so it is
// read as "Mini 1" rather than becoming part of the SQL. The thing worth
// checking is that it returns ONLY Mini 1's rewards.
list($r, $raw) = get('mini_id=' . urlencode("1 OR 1=1"));
ok('a quoted mini_id is read as a number, not as SQL',
   isset($r['success']) && $r['success'] === true);
ok('and gets one Mini\'s rewards rather than the whole table',
   (int) $r['latest_reward_id'] === 7);
list($r, $raw) = get('mini_id=1&after_id=' . urlencode("' OR '1'='1"));
ok('neither does a quoted after_id', isset($r['success']) && $r['success'] === true);
ok('and it behaves as zero, i.e. a seeding call', $r['seeded'] === true);
ok('printing no PHP error', stripos($raw, 'fatal') === false && stripos($raw, 'warning') === false);

list($r, $raw) = get('mini_id=1&after_id=2&limit=' . urlencode('abc'));
ok('a non-numeric limit does not break the query', isset($r['success']) && $r['success'] === true);
ok('and still returns something sensible', count($r['rewards']) >= 1);

/* ── tidy up ─────────────────────────────────────────────────────────────── */
foreach (array('/rewards/get-recent.php', '/config/db.php', '/test.sqlite', '/server.log') as $f) {
    @unlink($dir . $f);
}
foreach (array('/rewards', '/config') as $d) { @rmdir($dir . $d); }
@rmdir($dir);

if ($failed) {
    echo "$failed failed, $passed passed\n";
    exit(1);
}
echo "no problems ($passed checks)\n";
