<?php
/**
 * Step 2 — the member clicked the link in their e-mail.
 *
 * POST { "token": "...", "forum_user_id": 12, "forum_nickname": "..." }
 * with the X-Forum-Key header.
 *
 * Only here does the game hand over an account, and only against a token it
 * issued, that has not expired, and that has not been spent.
 */

require_once __DIR__ . '/_lib.php';

mf_link_guard();

try {
    $body  = mf_link_body();
    $token = trim((string) ($body['token'] ?? ''));
    $forum_user = isset($body['forum_user_id']) ? (int) $body['forum_user_id'] : 0;

    if ($token === '' || $forum_user <= 0) {
        mf_link_fail('token and forum_user_id are required');
    }

    mf_link_table($pdo);

    $stmt = $pdo->prepare("SELECT user_id, forum_user_id, token_expiry, status FROM forum_links WHERE token_hash = ? LIMIT 1");
    $stmt->execute(array(hash('sha256', $token)));
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        mf_link_json(array('success' => false, 'code' => 'invalid',
                           'message' => 'That link is no longer valid. Please start again.'), 400);
    }
    if (strtotime($row['token_expiry']) < time()) {
        mf_link_json(array('success' => false, 'code' => 'expired',
                           'message' => 'That link has expired. Please start again.'), 400);
    }
    // The mail was requested from one forum profile; it can only finish there.
    if ((int) $row['forum_user_id'] > 0 && (int) $row['forum_user_id'] !== $forum_user) {
        mf_link_json(array('success' => false, 'code' => 'mismatch',
                           'message' => 'That link belongs to a different Mini-Talks profile.'), 403);
    }

    $user_id = (int) $row['user_id'];

    $stmt = $pdo->prepare("
        UPDATE forum_links
        SET forum_user_id = ?, forum_nickname = ?, status = 'linked',
            linked_at = NOW(), token_hash = NULL, token_expiry = NULL
        WHERE user_id = ?
    ");
    $stmt->execute(array(
        $forum_user,
        isset($body['forum_nickname']) ? mf_link_cut($body['forum_nickname'], 190) : null,
        $user_id,
    ));

    $snapshot = mf_link_snapshot($pdo, $user_id);
    if (!$snapshot) mf_link_fail('That game account no longer exists', 404);

    mf_link_json(array('success' => true, 'account' => $snapshot));

} catch (Throwable $e) {
    error_log('FORUM LINK CONFIRM ERROR: ' . $e->getMessage());
    mf_link_fail('Server error', 500);
}
