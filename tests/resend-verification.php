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

// verify-email.php comes along unchanged, so the last section can prove that a
// link this endpoint issues is one the EXISTING verification page accepts. That
// is the question that matters: the resend has to feed the flow that was
// already there, not stand up a second one beside it.
$verifySrc = $root . '/game-api/auth/verify-email.php';
if (!is_file($verifySrc)) {
    fwrite(STDERR, "missing endpoint: $verifySrc\n");
    exit(1);
}
copy($verifySrc, $dir . '/auth/verify-email.php');

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

/* ── schema: only the columns the endpoint touches ───────────────────────────
 * Checked against the production dump (minitalks_13): users.is_active and
 * is_email_verified are tinyint(1), email_verification_token is varchar(64) —
 * which is exactly the length of bin2hex(random_bytes(32)), so the assertion
 * below that a new token is 64 characters is also the assertion that it is not
 * silently truncated on the way in. SQLite does not enforce the length, hence
 * checking it here rather than relying on the column.
 */
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
// This one is real: the production dump has an unverified account carrying no
// token and no expiry at all. Before this endpoint existed there was no way in
// for them — nothing to verify with, and nothing that could issue a new link.
$pdo->exec("INSERT INTO users VALUES (7,'notoken@example.com',1,1,0,NULL,NULL)");

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

/* ── 1b. an unverified account with no token at all is recoverable ───────── */
clearLog($dir);
list($res2) = post($dir, array('email_or_username' => 'notoken@example.com'));
$sent2 = sentLog($dir);
ok('an account holding no token is not mistaken for one just mailed',
   count($sent2) === 1);
ok('it is given a fresh link', strlen((string) tokenOf($db, 7)) === 64);
ok('and that link is the one mailed',
   count($sent2) === 1 && $sent2[0]['token'] === tokenOf($db, 7));
ok('it is answered exactly like every other case',
   isset($res2['message']) && $res2['message'] === $res['message']);

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

/* ── 7. the link it issues is accepted by the EXISTING verification page ──
 * register.php and this endpoint both call EmailHandler::sendVerificationEmail,
 * which builds .../auth/verify-email.php?token=... — so a resent link is the
 * same link, re-issued. This walks it: ask for a new one, then open it.
 */
function getVerify($query) {
    global $port;
    $ctx = stream_context_create(array('http' => array(
        'method' => 'GET', 'timeout' => 10, 'ignore_errors' => true,
    )));
    return (string) @file_get_contents(
        "http://127.0.0.1:$port/auth/verify-email.php?" . $query, false, $ctx);
}

function verifiedFlag($db, $userId) {
    $pdo = new PDO('sqlite:' . $db);
    $stmt = $pdo->prepare("SELECT is_email_verified FROM users WHERE user_id = ?");
    $stmt->execute([$userId]);
    return (int) $stmt->fetchColumn();
}

clearLog($dir);
$pdo = new PDO('sqlite:' . $db);
$pdo->prepare("UPDATE users SET email_verification_token_expiry = ? WHERE user_id = 6")
    ->execute([expiryFor(7200)]);                 // past the one-minute floor

post($dir, array('email_or_username' => 'mini@example.com'));
$sent = sentLog($dir);
ok('a resend was issued for the round trip', count($sent) === 1);
$link = count($sent) ? $sent[0]['token'] : '';

ok('the account is not verified before the link is opened', verifiedFlag($db, 6) === 0);

$page = getVerify('token=' . urlencode($link));
ok('the existing verification page accepts the resent link',
   strpos($page, 'Email Verified') !== false);
ok('and does not report it as invalid or expired',
   strpos($page, 'Verification Failed') === false && stripos($page, 'expired') === false);
ok('the account really is verified afterwards', verifiedFlag($db, 6) === 1);
ok('and the spent link is cleared, so it cannot be reused',
   tokenOf($db, 6) === null);

$again = getVerify('token=' . urlencode($link));
ok('opening the same link twice is refused rather than re-verifying',
   strpos($again, 'Verification Failed') !== false);

$bogus = getVerify('token=' . str_repeat('0', 64));
ok('an invented token is refused', strpos($bogus, 'Verification Failed') !== false);

// A resend replaces the stored token rather than adding a second live one, so
// a link out of an older mail stops working. That is on purpose; this pins it.
clearLog($dir);
$pdo->prepare("UPDATE users SET is_email_verified = 0, email_verification_token = ?,
               email_verification_token_expiry = ? WHERE user_id = 6")
    ->execute(['first-link-token', expiryFor(7200)]);
post($dir, array('email_or_username' => 'mini@example.com'));
$older = getVerify('token=first-link-token');
ok('a link from the older mail stops working once a new one is sent',
   strpos($older, 'Verification Failed') !== false);
ok('while the newest link still verifies',
   strpos(getVerify('token=' . urlencode(sentLog($dir)[0]['token'])), 'Email Verified') !== false);

/* ── tidy up ─────────────────────────────────────────────────────────────── */
foreach (array('/auth/resend-verification.php', '/config/db.php', '/utils/EmailHandler.php',
               '/auth/verify-email.php', '/sent.log', '/test.sqlite', '/server.log') as $f) {
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
