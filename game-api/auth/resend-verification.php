<?php
// /minitalks-api/auth/resend-verification.php
//
// Sends a fresh verification link to someone who registered but never opened
// the first mail. login.php refuses them with email_not_verified:true, and the
// login page offers this.
//
// POST JSON: { "email_or_username": "..." }   ("email" is accepted too)
//
// The answer is deliberately the same whether or not the account exists, is
// already verified, or was just throttled: anything else turns this endpoint
// into a way of asking "does this family have an account?".
//
// Throttling needs no new column. A send always writes an expiry of now + 24h,
// so (expiry - 24h) IS the moment the last mail went out. Under a minute ago
// and we do nothing. The counter file underneath that is defence in depth
// against using this to mail-bomb a stranger; if it cannot be written the
// one-minute floor still holds.

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/EmailHandler.php';

const RESEND_MIN_GAP_SECONDS = 60;    // never two mails inside a minute
const RESEND_MAX_PER_DAY     = 5;     // per address, best-effort
const TOKEN_HOURS            = 24;    // must match register.php

/** The one thing we ever say out loud. */
function resendDone() {
    echo json_encode([
        'success' => true,
        'message' => 'If that account still needs verifying, a new link is on its way. '
                   . 'Please check your inbox, and your spam folder too.'
    ]);
    exit;
}

/** Find the user the same four ways login.php does. */
function findUser($pdo, $identifier) {
    $queries = array(
        "SELECT u.user_id, u.email, u.is_active, u.is_email_verified, r.role_name,
                u.email_verification_token_expiry AS expiry
           FROM users u
           JOIN user_roles r ON u.role_id = r.role_id
          WHERE u.email = ? LIMIT 1",
        "SELECT u.user_id, u.email, u.is_active, u.is_email_verified, r.role_name,
                u.email_verification_token_expiry AS expiry
           FROM users u
           JOIN user_roles r ON u.role_id = r.role_id
           JOIN builder_profiles bp ON bp.user_id = u.user_id
          WHERE bp.username = ? LIMIT 1",
        "SELECT u.user_id, u.email, u.is_active, u.is_email_verified, r.role_name,
                u.email_verification_token_expiry AS expiry
           FROM users u
           JOIN user_roles r ON u.role_id = r.role_id
           JOIN expert_profiles ep ON ep.user_id = u.user_id
          WHERE ep.username = ? LIMIT 1",
        "SELECT u.user_id, u.email, u.is_active, u.is_email_verified, r.role_name,
                u.email_verification_token_expiry AS expiry
           FROM users u
           JOIN user_roles r ON u.role_id = r.role_id
           JOIN mini_profiles mp ON mp.user_id = u.user_id
          WHERE mp.mini_name = ? LIMIT 1",
    );

    foreach ($queries as $sql) {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$identifier]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) return $row;
    }
    return null;
}

/** The name to greet them by, so the second mail reads like the first. */
function displayName($pdo, $user) {
    $map = array(
        'parent'  => array('parent_profiles',  'full_name'),
        'builder' => array('builder_profiles', 'full_name'),
        'expert'  => array('expert_profiles',  'full_name'),
        'child'   => array('mini_profiles',    'mini_name'),
        'mini'    => array('mini_profiles',    'mini_name'),
    );
    $role = strtolower((string) $user['role_name']);
    if (!isset($map[$role])) return '';

    list($table, $column) = $map[$role];
    $stmt = $pdo->prepare("SELECT {$column} FROM {$table} WHERE user_id = ? LIMIT 1");
    $stmt->execute([$user['user_id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ? trim((string) $row[$column]) : '';
}

/** Seconds since the last verification mail, or null when we cannot tell. */
function secondsSinceLastSend($expiry) {
    if (empty($expiry)) return null;
    $ts = strtotime((string) $expiry);
    if ($ts === false) return null;
    return time() - ($ts - TOKEN_HOURS * 3600);
}

/**
 * Best-effort daily cap, in a directory the web server does not serve.
 * Returns false when the address has had its allowance today.
 */
function dailyAllowance($userId) {
    $dir = rtrim(sys_get_temp_dir(), '/') . '/minitalks-verif';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true)) return true;   // cannot track: let it through

    $path  = $dir . '/' . sha1('resend:' . $userId) . '.json';
    $today = gmdate('Y-m-d');
    $count = 0;

    $raw = @file_get_contents($path);
    if ($raw !== false) {
        $seen = json_decode($raw, true);
        if (is_array($seen) && isset($seen['day']) && $seen['day'] === $today) {
            $count = (int) $seen['count'];
        }
    }

    if ($count >= RESEND_MAX_PER_DAY) return false;

    @file_put_contents($path, json_encode(array('day' => $today, 'count' => $count + 1)), LOCK_EX);
    return true;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) $input = array();

    $identifier = '';
    foreach (array('email_or_username', 'emailOrUsername', 'email', 'username') as $key) {
        if (!empty($input[$key])) { $identifier = trim((string) $input[$key]); break; }
    }

    // Nothing to go on. Still the same answer.
    if ($identifier === '') resendDone();

    $user = findUser($pdo, $identifier);

    // No such account, already verified, or deactivated: say nothing either way.
    // A deactivated account is a decision someone made, and a verification mail
    // would not change it.
    if (!$user || (int) $user['is_email_verified'] === 1 || (int) $user['is_active'] !== 1) {
        resendDone();
    }

    $since = secondsSinceLastSend($user['expiry']);
    if ($since !== null && $since >= 0 && $since < RESEND_MIN_GAP_SECONDS) {
        resendDone();
    }

    if (!dailyAllowance($user['user_id'])) {
        resendDone();
    }

    // A resend replaces the old link rather than adding a second live one, so
    // a link copied out of an older mail stops working.
    $token  = bin2hex(random_bytes(32));
    $expiry = date('Y-m-d H:i:s', strtotime('+' . TOKEN_HOURS . ' hours'));

    $stmt = $pdo->prepare("
        UPDATE users
           SET email_verification_token = ?,
               email_verification_token_expiry = ?
         WHERE user_id = ? AND is_email_verified = 0
    ");
    $stmt->execute([$token, $expiry, $user['user_id']]);

    if ($stmt->rowCount() === 0) {
        // Verified by another tab between our read and our write. Fine.
        resendDone();
    }

    try {
        $mailer = new EmailHandler();
        $mailer->sendVerificationEmail($user['email'], $token, displayName($pdo, $user));
    } catch (Exception $e) {
        // The link is stored and valid, so the next attempt will send it. The
        // caller is not told the mailer is down, for the same reason as above.
        error_log('Resend verification email failed: ' . $e->getMessage());
    }

    resendDone();

} catch (Throwable $e) {
    error_log('resend-verification failed: ' . $e->getMessage());
    resendDone();
}
