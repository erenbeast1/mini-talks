<?php
/**
 * Step 1 — "is there a game account on this address, and may I mail it?"
 *
 * POST { "email": "..." }  with the X-Forum-Key header.
 *
 * Answers { success, found, token, name, role } — and when found is false,
 * that is all it says. It never reveals the user id, and it never says which
 * of several reasons made an address unusable, so the forum cannot be used to
 * find out who has a game account.
 */

require_once __DIR__ . '/_lib.php';

mf_link_guard();

try {
    $body  = mf_link_body();
    $email = strtolower(trim((string) ($body['email'] ?? '')));

    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        mf_link_fail('A valid e-mail address is required');
    }

    mf_link_table($pdo);

    $stmt = $pdo->prepare("
        SELECT u.user_id, u.is_active, u.is_email_verified, r.role_name
        FROM users u
        JOIN user_roles r ON r.role_id = u.role_id
        WHERE LOWER(u.email) = ?
        LIMIT 1
    ");
    $stmt->execute(array($email));
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Not a game account, or one that cannot sign in to the game either.
    // One shape of answer for all three, so nothing is learned from a "no".
    if (!$user || (int) $user['is_active'] !== 1 || (int) $user['is_email_verified'] !== 1) {
        mf_link_json(array('success' => true, 'found' => false));
    }

    $user_id = (int) $user['user_id'];

    // Already linked to a forum member? Say so plainly — the forum turns this
    // into "this game account is already connected to another profile", which
    // is a thing the person in front of it needs to be able to act on.
    $stmt = $pdo->prepare("SELECT forum_user_id, status FROM forum_links WHERE user_id = ?");
    $stmt->execute(array($user_id));
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    $forum_user = isset($body['forum_user_id']) ? (int) $body['forum_user_id'] : 0;
    if ($existing && $existing['status'] === 'linked'
        && (int) $existing['forum_user_id'] !== $forum_user) {
        mf_link_json(array('success' => false, 'found' => true, 'code' => 'taken',
                           'message' => 'That game account is already connected to another Mini-Talks profile.'));
    }

    // A fresh token each time this is asked for: an older mail stops working
    // the moment a newer one is sent.
    $token  = bin2hex(random_bytes(32));
    $expiry = date('Y-m-d H:i:s', time() + (MF_LINK_TTL * 60));

    $stmt = $pdo->prepare("
        INSERT INTO forum_links (user_id, forum_user_id, forum_nickname, token_hash, token_expiry, status, requested_at)
        VALUES (?, ?, ?, ?, ?, 'pending', NOW())
        ON DUPLICATE KEY UPDATE
            forum_user_id  = VALUES(forum_user_id),
            forum_nickname = VALUES(forum_nickname),
            token_hash     = VALUES(token_hash),
            token_expiry   = VALUES(token_expiry),
            status         = 'pending',
            requested_at   = NOW()
    ");
    $stmt->execute(array(
        $user_id,
        $forum_user ?: null,
        isset($body['forum_nickname']) ? mf_link_cut($body['forum_nickname'], 190) : null,
        hash('sha256', $token),
        $expiry,
    ));

    // The display name goes back so the forum's e-mail can greet them by the
    // name they use in the game. The snapshot itself waits for link-confirm.
    $snapshot = mf_link_snapshot($pdo, $user_id);

    mf_link_json(array(
        'success'     => true,
        'found'       => true,
        'token'       => $token,
        'name'        => $snapshot ? $snapshot['name'] : '',
        'role'        => $user['role_name'],
        'expires_in'  => MF_LINK_TTL * 60,
    ));

} catch (Throwable $e) {
    error_log('FORUM LINK REQUEST ERROR: ' . $e->getMessage());
    mf_link_fail('Server error', 500);
}
