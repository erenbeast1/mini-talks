<?php
/**
 * tests/resend-verification.php — the game API's resend-verification endpoint,
 * against a real database.
 *
 * The endpoint is a top-level script: it requires ../config/db.php and
 * ../utils/EmailHandler.php relative to its own folder, reads the body from
 * php://input and echoes JSON. So the harness builds a throwaway copy of that
 * folder shape — the endpoint copied verbatim, a config that hands it a SQLite
 * $pdo, and an EmailHandler that records instead of sending — and serves it
 * with PHP's own built-in web server.
 *
 * It has to be a real request, not `php the-script.php`: under the CLI SAPI
 * php://input is empty, so every call would look like an empty body and the
 * tests would pass for the wrong reason.
 *
 * The endpoint is copied fresh on every run, so this cannot pass against a
 * stale duplicate.
 *
 * What matters here is what the endpoint must never do: say whether an account
 * exists, send two mails inside a minute, or leave a usable old link alive.
 *
 * Run: php tests/resend-verification.php
 */

$root = dirname(__DIR__);
$src  = $root . '/game-api/auth/resend-verification.php';
$dir  = sys_get_temp_dir() . '/mt-resend-test-' . getmypid();
$db   = $dir . '/test.sqlite';

@mkdir($dir . '/auth', 0700, true);
@mkdir($dir . '/config', 0700, true);
@mkdir($dir . '/utils', 0700, true);

if (!is_file($src)) {
    fwrite(STDERR, "missing endpoint: $src\n");
    exit(1);
}
copy($src, $dir . '/auth/resend-verification.php');

/* ── the database the endpoint will be given ─────────────────────────────── */
file_put_contents($dir . '/config/db.php', <<<'PHP'
<?php
$pdo = new PDO('sqlite:' . __DIR__ . '/../test.sqlite');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
PHP);

/* ── a mailer that writes down what it was asked to send ─────────────────── */
file_put_contents($dir . '/utils/EmailHandler.php', <<<'PHP'
<?php
class EmailHandler {
    public function sendVerificationEmail($to, $token, $name = '') {
        file_put_contents(__DIR__ . '/../sent.log',
            json_encode(array('to' => $to, 'token' => $token, 'name' => $name)) . "\n",
            FILE_APPEND);
        return true;
    }
}
PHP);

/* ── schema: only the columns the endpoint touches ───────────────────────── */
$pdo = new PDO('sqlite:' . $db);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec("CREATE TABLE user_roles (role_id INTEGER PRIMARY KEY, role_name TEXT)");
$pdo->exec("CREATE TABLE users (
    user_id INTEGER PRIMARY KEY, email TEXT, role_id INTEGER,
    is_active INTEGER DEFAULT 1, is_email_verified INTEGER DEFAULT 0,
    email_verification_token TEXT, email_verification_token_expiry TEXT)");
$pdo->exec("CREATE TABLE parent_profiles  (user_id INTEGER, full_name TEXT)");
$pdo->exec("CREATE TABLE builder_profiles (user_id INTEGER, full_name TEXT, username TEXT)");
$pdo->exec("CREATE TABLE expert_profiles  (user_id INTEGER, full_name TEXT, username TEXT)");
$pdo->exec("CREATE TABLE mini_profiles    (user_id INTEGER, mini_name TEXT)");

$pdo->exec("INSERT INTO user_roles VALUES (1,'parent'),(2,'builder'),(3,'expert'),(4,'child')");

/** A token that was issued `$ago` seconds ago, i.e. expiring 24h after that. */
function expiryFor($ago) {
    return date('Y-m-d H:i:s', time() - $ago + 24 * 3600);
}

$pdo->prepare("INSERT INTO users VALUES (1,'unverified@example.com',1,1,0,'old-token-1',?)")
    ->execute([expiryFor(7200)]);                      // last mail 2 hours ago
$pdo->prepare("INSERT INTO users VALUES (2,'justsent@example.com',1,1,0,'old-token-2',?)")
    ->execute([expiryFor(10)]);                        // last mail 10 seconds ago
$pdo->exec("INSERT INTO users VALUES (3,'verified@example.com',1,1,1,NULL,NULL)");
$pdo->prepare("INSERT INTO users VALUES (4,'disabled@example.com',1,0,0,'old-token-4',?)")
    ->execute([expiryFor(7200)]);                      // unverified AND deactivated
$pdo->prepare("INSERT INTO users VALUES (5,'builder@example.com',2,1,0,'old-token-5',?)")
    ->execute([expiryFor(7200)]);
$pdo->prepare("INSERT INTO users VALUES (6,'mini@example.com',4,1,0,'old-token-6',?)")
    ->execute([expiryFor(7200)]);

$pdo->exec("INSERT INTO parent_profiles  VALUES (1,'Ayse Yilmaz')");
$pdo->exec("INSERT INTO builder_profiles VALUES (5,'Bora Builder','bora_b')");
$pdo->exec("INSERT INTO mini_profiles    VALUES (6,'Tiny Tim')");

/* ── a real web server in front of it ───────────────────────────────────── */
$port = 8700 + (getmypid() % 900);
$log  = $dir . '/server.log';
// TMPDIR is what sys_get_temp_dir() answers, and that is where the endpoint
// keeps its per-address daily counter. Giving the server its own means the
// counts start at zero every run instead of carrying over and eventually
// tripping the cap on a later run.
@mkdir($dir . '/tmp', 0700, true);
$pid  = (int) trim((string) shell_exec(sprintf(
    'TMPDIR=%s php -S 127.0.0.1:%d -t %s > %s 2>&1 & echo $!',
    escapeshellarg($dir . '/tmp'), $port, escapeshellarg($dir), escapeshellarg($log)
)));

register_shutdown_function(function () use ($pid) {
    if ($pid > 0) @exec('kill ' . $pid . ' 2>/dev/null');
});

$up = false;
for ($i = 0; $i < 80; $i++) {                       // up to ~4 seconds
    $sock = @fsockopen('127.0.0.1', $port, $errno, $errstr, 0.2);
    if ($sock) { fclose($sock); $up = true; break; }
    usleep(50000);
}
if (!$up) {
    fwrite(STDERR, "could not start php -S on port $port\n");
    if (is_file($log)) fwrite(STDERR, file_get_contents($log));
    exit(1);
}

function post($dir, $body) {
    global $port;
    $payload = is_string($body) ? $body : json_encode($body);

    $ctx = stream_context_create(array('http' => array(
        'method'        => 'POST',
        'header'        => "Content-Type: application/json\r\n",
        'content'       => $payload,
        'timeout'       => 10,
        'ignore_errors' => true,          // read the body even on a 4xx/5xx
    )));

    $out = @file_get_contents("http://127.0.0.1:$port/auth/resend-verification.php", false, $ctx);
    return array(json_decode(trim((string) $out), true), (string) $out);
}

function sentLog($dir) {
    $path = $dir . '/sent.log';
    if (!is_file($path)) return array();
    $rows = array();
    foreach (explode("\n", trim(file_get_contents($path))) as $line) {
        if ($line !== '') $rows[] = json_decode($line, true);
    }
    return $rows;
}

function clearLog($dir) { @unlink($dir . '/sent.log'); }

function tokenOf($db, $userId) {
    $pdo = new PDO('sqlite:' . $db);
    $stmt = $pdo->prepare("SELECT email_verification_token FROM users WHERE user_id = ?");
    $stmt->execute([$userId]);
    return $stmt->fetchColumn();
}

$passed = 0;
$failed = 0;
function ok($what, $cond) {
    global $passed, $failed;
    if ($cond) { $passed++; return; }
    $failed++;
    echo "  FAIL: $what\n";
}

/* ── 1. an unverified account gets a new link ────────────────────────────── */
clearLog($dir);
list($res) = post($dir, array('email_or_username' => 'unverified@example.com'));
ok('an unverified account is answered successfully', isset($res['success']) && $res['success'] === true);
$sent = sentLog($dir);
ok('and one mail goes out', count($sent) === 1);
ok('to that address', count($sent) === 1 && $sent[0]['to'] === 'unverified@example.com');
ok('greeting them by the name on their profile',
   count($sent) === 1 && $sent[0]['name'] === 'Ayse Yilmaz');

$newToken = tokenOf($db, 1);
ok('the stored link is replaced, so one copied from an older mail stops working',
   $newToken !== 'old-token-1' && strlen((string) $newToken) === 64);
ok('and the mail carries the new one', count($sent) === 1 && $sent[0]['token'] === $newToken);

$generic = $res['message'];
ok('the message does not say whether the account exists',
   stripos($generic, 'not found') === false && stripos($generic, 'no account') === false);

/* ── 2. nothing distinguishes the other cases ────────────────────────────── */
foreach (array(
    'an address with no account'      => 'nobody@example.com',
    'an account already verified'     => 'verified@example.com',
    'a deactivated account'           => 'disabled@example.com',
    'an account mailed seconds ago'   => 'justsent@example.com',
    'an empty identifier'             => '',
) as $what => $identifier) {
    clearLog($dir);
    list($r) = post($dir, array('email_or_username' => $identifier));
    ok("$what is answered the same way",
       isset($r['success']) && $r['success'] === true && $r['message'] === $generic);
    ok("$what leaks no extra field", array_keys($r) === array('success', 'message'));
    ok("$what sends nothing", count(sentLog($dir)) === 0);
}

ok('a verified account keeps no link', tokenOf($db, 3) === null);
ok('a throttled account keeps its current link', tokenOf($db, 2) === 'old-token-2');
ok('a deactivated account keeps its current link', tokenOf($db, 4) === 'old-token-4');

/* ── 3. the one-minute floor applies to the account we just mailed ───────── */
clearLog($dir);
list($r) = post($dir, array('email_or_username' => 'unverified@example.com'));
ok('a second press straight away is answered normally',
   isset($r['success']) && $r['message'] === $generic);
ok('but no second mail goes out', count(sentLog($dir)) === 0);
ok('and the link it already sent still works', tokenOf($db, 1) === $newToken);

/* ── 4. found by username and by mini name, not only by e-mail ──────────── */
clearLog($dir);
list($r) = post($dir, array('email_or_username' => 'bora_b'));
$sent = sentLog($dir);
ok('a builder is found by username', count($sent) === 1 && $sent[0]['to'] === 'builder@example.com');
ok('and greeted by name', count($sent) === 1 && $sent[0]['name'] === 'Bora Builder');

clearLog($dir);
list($r) = post($dir, array('email_or_username' => 'Tiny Tim'));
$sent = sentLog($dir);
ok('a Mini is found by mini name', count($sent) === 1 && $sent[0]['to'] === 'mini@example.com');
ok('and greeted by it', count($sent) === 1 && $sent[0]['name'] === 'Tiny Tim');

/* ── 5. the field name the login page happens to use ─────────────────────── */
clearLog($dir);
$pdo = new PDO('sqlite:' . $db);
$pdo->prepare("UPDATE users SET email_verification_token_expiry = ? WHERE user_id = 1")
    ->execute([expiryFor(7200)]);
list($r) = post($dir, array('email' => 'unverified@example.com'));
ok("'email' is accepted as well as 'email_or_username'", count(sentLog($dir)) === 1);

clearLog($dir);
$pdo->prepare("UPDATE users SET email_verification_token_expiry = ? WHERE user_id = 1")
    ->execute([expiryFor(7200)]);
list($r) = post($dir, array('emailOrUsername' => 'unverified@example.com'));
ok("so is the camelCase spelling the form uses", count(sentLog($dir)) === 1);

/* ── 6. rubbish in does not produce a stack trace ────────────────────────── */
clearLog($dir);
list($r, $raw) = post($dir, 'not json at all');
ok('a body that is not JSON is answered normally',
   isset($r['success']) && $r['success'] === true && $r['message'] === $generic);
ok('and nothing is sent', count(sentLog($dir)) === 0);

list($r, $raw) = post($dir, array('email_or_username' => array('nested' => 'thing')));
ok('an identifier that is not a string does not blow up', is_array($r) && isset($r['success']));
ok('and prints no PHP error', stripos($raw, 'fatal') === false && stripos($raw, 'warning') === false);

list($r) = post($dir, array('email_or_username' => "x' OR 1=1 --"));
ok('a quote in the identifier finds nothing rather than everything',
   isset($r['message']) && $r['message'] === $generic);
ok('and sends nothing', count(sentLog($dir)) === 0);

/* ── tidy up ─────────────────────────────────────────────────────────────── */
foreach (array('/auth/resend-verification.php', '/config/db.php', '/utils/EmailHandler.php',
               '/sent.log', '/test.sqlite', '/server.log') as $f) {
    @unlink($dir . $f);
}
foreach (glob($dir . '/tmp/minitalks-verif/*') as $f) { @unlink($f); }
@rmdir($dir . '/tmp/minitalks-verif');
foreach (array('/auth', '/config', '/utils', '/tmp') as $d) { @rmdir($dir . $d); }
@rmdir($dir);

if ($failed) {
    echo "$failed failed, $passed passed\n";
    exit(1);
}
echo "no problems ($passed checks)\n";
