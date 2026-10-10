<?php
/**
 * tests/register-profile-id.php — the id register.php hands back for a new
 * account's avatar, against a real database.
 *
 * This is worth pinning because it is wrong in a way nobody would notice. An
 * avatar is keyed by users.user_id for a parent, an expert and a builder, but
 * by mini_profiles.mini_id for a Mini — two different numbers. Return the
 * wrong one for a child and the picture saves successfully against somebody
 * else's row, or against nothing, and the only symptom is a Mini whose avatar
 * never appears.
 *
 * It also checks the fields that were already there are still there: the
 * response is read by RegisterPage, and these additions must not displace
 * anything.
 *
 * Mail sending is stubbed, so no message leaves the machine.
 *
 * Run: php tests/register-profile-id.php
 */

$root = dirname(__DIR__);
$src  = $root . '/game-api/auth/register.php';
$dir  = sys_get_temp_dir() . '/mt-register-test-' . getmypid();
$db   = $dir . '/test.sqlite';

@mkdir($dir . '/auth', 0700, true);
@mkdir($dir . '/config', 0700, true);
@mkdir($dir . '/utils', 0700, true);

if (!is_file($src)) {
    fwrite(STDERR, "missing endpoint: $src\n");
    exit(1);
}
copy($src, $dir . '/auth/register.php');

file_put_contents($dir . '/config/db.php', <<<'PHP'
<?php
$pdo = new PDO('sqlite:' . __DIR__ . '/../test.sqlite');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
PHP);

file_put_contents($dir . '/utils/EmailHandler.php', <<<'PHP'
<?php
class EmailHandler {
    public function sendVerificationEmail($to, $token, $name = '') { return true; }
    public function sendParentApprovalEmail($to, $childName, $childEmail) { return true; }
}
PHP);

/* Ids deliberately start far apart, so a response that returned user_id where
   it should return mini_id cannot pass by coincidence. */
$pdo = new PDO('sqlite:' . $db);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec("CREATE TABLE user_roles (role_id INTEGER PRIMARY KEY, role_name TEXT)");
$pdo->exec("CREATE TABLE users (
    user_id INTEGER PRIMARY KEY, email TEXT, password_hash TEXT, role_id INTEGER,
    is_active INTEGER DEFAULT 0, is_email_verified INTEGER DEFAULT 0,
    email_verification_token TEXT, email_verification_token_expiry TEXT)");
$pdo->exec("CREATE TABLE parent_profiles  (parent_id INTEGER PRIMARY KEY, full_name TEXT, user_id INTEGER)");
$pdo->exec("CREATE TABLE builder_profiles (builder_id INTEGER PRIMARY KEY, full_name TEXT, username TEXT, age_range TEXT, user_id INTEGER)");
$pdo->exec("CREATE TABLE expert_profiles  (expert_id INTEGER PRIMARY KEY, full_name TEXT, username TEXT, organization TEXT, user_id INTEGER)");
$pdo->exec("CREATE TABLE mini_profiles    (mini_id INTEGER PRIMARY KEY, mini_name TEXT, age_range TEXT,
                                           email TEXT, parent_email TEXT, user_id INTEGER,
                                           parent_approval_status TEXT)");
$pdo->exec("INSERT INTO user_roles VALUES (1,'parent'),(2,'builder'),(3,'expert'),(4,'child')");

// Push each table's next id somewhere different.
$pdo->exec("INSERT INTO users (user_id,email,password_hash,role_id) VALUES (500,'seed@x','x',1)");
$pdo->exec("INSERT INTO parent_profiles  (parent_id,full_name,user_id)  VALUES (10,'seed',500)");
$pdo->exec("INSERT INTO builder_profiles (builder_id,full_name,user_id) VALUES (20,'seed',500)");
$pdo->exec("INSERT INTO expert_profiles  (expert_id,full_name,user_id)  VALUES (30,'seed',500)");
$pdo->exec("INSERT INTO mini_profiles    (mini_id,mini_name,user_id)    VALUES (40,'seed',500)");

$port = 8500 + (getmypid() % 900);
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
    $s = @fsockopen('127.0.0.1', $port, $e1, $e2, 0.2);
    if ($s) { fclose($s); $up = true; break; }
    usleep(50000);
}
if (!$up) {
    fwrite(STDERR, "could not start php -S on port $port\n");
    if (is_file($log)) fwrite(STDERR, file_get_contents($log));
    exit(1);
}

function signUp($body) {
    global $port;
    $ctx = stream_context_create(array('http' => array(
        'method'        => 'POST',
        'header'        => "Content-Type: application/json\r\n",
        'content'       => json_encode($body),
        'timeout'       => 10,
        'ignore_errors' => true,
    )));
    $raw = (string) @file_get_contents("http://127.0.0.1:$port/auth/register.php", false, $ctx);
    return array(json_decode(trim($raw), true), $raw);
}

function column($db, $table, $col, $where, $val) {
    $pdo = new PDO('sqlite:' . $db);
    $stmt = $pdo->prepare("SELECT {$col} FROM {$table} WHERE {$where} = ?");
    $stmt->execute([$val]);
    return $stmt->fetchColumn();
}

$passed = 0; $failed = 0;
function ok($what, $cond) {
    global $passed, $failed;
    if ($cond) { $passed++; return; }
    $failed++;
    echo "  FAIL: $what\n";
}

/* ── parent, expert, builder: the avatar id is the USER id ───────────────── */
$cases = array(
    'parent'  => array('table' => 'parent_profiles',  'key' => 'parent_id',
                       'body' => array('email' => 'p@example.com', 'password' => 'secret123',
                                       'role_type' => 'parent', 'full_name' => 'A Parent')),
    'builder' => array('table' => 'builder_profiles', 'key' => 'builder_id',
                       'body' => array('email' => 'b@example.com', 'password' => 'secret123',
                                       'role_type' => 'builder', 'full_name' => 'A Builder',
                                       'username' => 'abuilder', 'age_group' => '25-34')),
    'expert'  => array('table' => 'expert_profiles',  'key' => 'expert_id',
                       'body' => array('email' => 'e@example.com', 'password' => 'secret123',
                                       'role_type' => 'expert', 'full_name' => 'An Expert',
                                       'username' => 'anexpert', 'organization' => 'A Clinic')),
);

foreach ($cases as $role => $c) {
    list($r, $raw) = signUp($c['body']);
    ok("$role registers", isset($r['success']) && $r['success'] === true);
    if (!isset($r['user'])) { ok("$role has a user block", false); continue; }
    $u = $r['user'];

    ok("$role still gets the fields that were always there",
       isset($u['user_id'], $u['email'], $u['role_type']) && $u['role_type'] === $role);

    $profileId = (int) column($db, $c['table'], $c['key'], 'user_id', $u['user_id']);
    ok("$role's profile row exists", $profileId > 0);
    ok("$role's profile_id is that row", (int) $u['profile_id'] === $profileId);

    // The point: for these three the avatar is keyed by the USER id.
    ok("$role's avatar_id is the user id", (int) $u['avatar_id'] === (int) $u['user_id']);
    ok("$role's avatar_id is NOT the profile id",
       $profileId !== (int) $u['user_id'] ? (int) $u['avatar_id'] !== $profileId : true);
}

/* ── a child: the avatar id is the MINI id, not the user id ──────────────── */
list($r) = signUp(array(
    'email' => 'c@example.com', 'password' => 'secret123', 'role_type' => 'child',
    'full_name' => 'A Mini', 'parent_email' => 'p@example.com', 'age_group' => '7-9',
));
ok('a child registers', isset($r['success']) && $r['success'] === true);
$u = isset($r['user']) ? $r['user'] : array();
$miniId = (int) column($db, 'mini_profiles', 'mini_id', 'user_id', $u['user_id'] ?? 0);

ok('the Mini row exists', $miniId > 0);
ok('the two ids really are different, so this test can tell them apart',
   $miniId !== (int) ($u['user_id'] ?? 0));
ok('a child\'s avatar_id is the mini_id', (int) ($u['avatar_id'] ?? -1) === $miniId);
ok('and NOT the user_id', (int) ($u['avatar_id'] ?? -1) !== (int) ($u['user_id'] ?? 0));
ok('profile_id is the mini_id too', (int) ($u['profile_id'] ?? -1) === $miniId);
ok('the parent approval flag survives', isset($r['requires_parent_approval'])
   && $r['requires_parent_approval'] === true);
ok('and the parent address it was sent to', ($r['parent_email'] ?? '') === 'p@example.com');

/* ── a refused registration must not claim an id ─────────────────────────── */
list($r, $raw) = signUp(array('email' => 'p@example.com', 'password' => 'secret123',
                              'role_type' => 'parent', 'full_name' => 'Duplicate'));
ok('a duplicate address is refused', isset($r['success']) && $r['success'] === false);
ok('and hands back no profile id', !isset($r['user']['avatar_id']));
ok('printing no PHP error', stripos($raw, 'fatal') === false);

list($r) = signUp(array('email' => 'x@example.com', 'password' => 'secret123',
                        'role_type' => 'builder', 'full_name' => 'No Username'));
ok('a builder with no username is refused', isset($r['success']) && $r['success'] === false);
$left = (new PDO('sqlite:' . $db))->query("SELECT COUNT(*) FROM users WHERE email='x@example.com'")->fetchColumn();
ok('and leaves no half-made account behind', (int) $left === 0);

/* ── tidy up ─────────────────────────────────────────────────────────────── */
foreach (array('/auth/register.php', '/config/db.php', '/utils/EmailHandler.php',
               '/test.sqlite', '/server.log') as $f) {
    @unlink($dir . $f);
}
foreach (array('/auth', '/config', '/utils') as $d) { @rmdir($dir . $d); }
@rmdir($dir);

if ($failed) {
    echo "$failed failed, $passed passed\n";
    exit(1);
}
echo "no problems ($passed checks)\n";
