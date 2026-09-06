<?php
/**
 * Disconnect. The forum calls this when a member unlinks, so the game side
 * stops believing in a link the forum has already forgotten.
 *
 * POST { "user_id": 12, "forum_user_id": 34 } with the X-Forum-Key header.
 *
 * Succeeds quietly when there is nothing to revoke: unlinking twice, or
 * unlinking after the row was cleared by hand, is not an error worth showing
 * to somebody who just wanted to disconnect.
 */

require_once __DIR__ . '/_lib.php';

mf_link_guard();

try {
    $body       = mf_link_body();
    $user_id    = isset($body['user_id']) ? (int) $body['user_id'] : 0;
    $forum_user = isset($body['forum_user_id']) ? (int) $body['forum_user_id'] : 0;

    if ($user_id <= 0) mf_link_fail('user_id is required');

    mf_link_table($pdo);

    $sql    = "UPDATE forum_links SET status = 'revoked', token_hash = NULL, token_expiry = NULL, forum_user_id = NULL WHERE user_id = ?";
    $params = array($user_id);
    if ($forum_user > 0) {
        $sql .= " AND (forum_user_id = ? OR forum_user_id IS NULL)";
        $params[] = $forum_user;
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    mf_link_json(array('success' => true));

} catch (Throwable $e) {
    error_log('FORUM LINK REVOKE ERROR: ' . $e->getMessage());
    mf_link_fail('Server error', 500);
}
