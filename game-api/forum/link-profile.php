<?php
/**
 * A fresh look at an already-linked account, for the forum to redraw the card.
 *
 * POST { "user_id": 12, "forum_user_id": 34 } with the X-Forum-Key header.
 *
 * Both ids are checked against forum_links, so this cannot be used to read an
 * account that is not linked, or one linked to a different forum member.
 */

require_once __DIR__ . '/_lib.php';

mf_link_guard();

try {
    $body       = mf_link_body();
    $user_id    = isset($body['user_id']) ? (int) $body['user_id'] : 0;
    $forum_user = isset($body['forum_user_id']) ? (int) $body['forum_user_id'] : 0;

    if ($user_id <= 0 || $forum_user <= 0) {
        mf_link_fail('user_id and forum_user_id are required');
    }

    mf_link_table($pdo);

    $stmt = $pdo->prepare("SELECT status FROM forum_links WHERE user_id = ? AND forum_user_id = ? LIMIT 1");
    $stmt->execute(array($user_id, $forum_user));
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row || $row['status'] !== 'linked') {
        mf_link_json(array('success' => false, 'code' => 'not_linked',
                           'message' => 'That account is not connected to this profile.'), 403);
    }

    $snapshot = mf_link_snapshot($pdo, $user_id);
    if (!$snapshot) mf_link_fail('That game account no longer exists', 404);

    mf_link_json(array('success' => true, 'account' => $snapshot));

} catch (Throwable $e) {
    error_log('FORUM LINK PROFILE ERROR: ' . $e->getMessage());
    mf_link_fail('Server error', 500);
}
