<?php
/**
 * Mini-Talks — forum ⇄ game account linking, shared helpers.
 *
 * Drop this folder in as  minitalks-api/forum/  and nothing else in the game
 * changes: no new screen, no edit to an existing endpoint, no schema change to
 * a table the game already writes. The four endpoints here only ever read the
 * game's own account tables and write one table of their own, forum_links,
 * which they create on first use.
 *
 * The flow is the account-verification flow the game already uses, pointed at
 * the forum instead of at a login:
 *
 *   1. A signed-in forum member types their game e-mail address.
 *   2. The forum calls link-request.php. If that address has a game account,
 *      this hands back a one-time token and the account's display name — and
 *      nothing else. No user id, no role, no profile.
 *   3. The forum e-mails the link (carrying the token) to that address, so the
 *      only person who can finish is whoever reads that inbox.
 *   4. Clicking it brings them back to the forum, which calls link-confirm.php
 *      with the token. Only now does the game hand over the account.
 *
 * Every endpoint requires the shared key (see config.sample.php) in the
 * X-Forum-Key header, so only the forum can call them — the token alone is not
 * enough, and a token leaked from an inbox is useless to anyone else.
 */

if (!defined('MF_LINK_LIB')) {
    define('MF_LINK_LIB', 1);

    require_once __DIR__ . '/../config/db.php';
    if (file_exists(__DIR__ . '/config.php')) {
        require_once __DIR__ . '/config.php';
    }

    date_default_timezone_set('Europe/Istanbul');

    /** Token lifetime, in minutes. Matches what the e-mail promises. */
    if (!defined('MF_LINK_TTL')) define('MF_LINK_TTL', 60);

    function mf_link_json($payload, $status = 200) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload);
        exit;
    }

    function mf_link_fail($message, $status = 400) {
        mf_link_json(array('success' => false, 'message' => $message), $status);
    }

    /**
     * Header + method gate. Call this first in every endpoint.
     *
     * The key never appears in a URL or a body, so it stays out of access logs
     * and out of anything a browser could be tricked into sending: these
     * endpoints answer no CORS pre-flight and set no Access-Control header, so
     * a page in a browser cannot reach them at all. Only server-to-server.
     */
    function mf_link_guard() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            mf_link_fail('POST only', 405);
        }
        if (!defined('MF_FORUM_LINK_KEY') || MF_FORUM_LINK_KEY === '' || MF_FORUM_LINK_KEY === 'change-me') {
            mf_link_fail('Linking is not configured on this server', 503);
        }
        $sent = '';
        foreach (array('HTTP_X_FORUM_KEY', 'REDIRECT_HTTP_X_FORUM_KEY') as $k) {
            if (!empty($_SERVER[$k])) { $sent = $_SERVER[$k]; break; }
        }
        if ($sent === '' && function_exists('getallheaders')) {
            foreach (getallheaders() as $name => $value) {
                if (strtolower($name) === 'x-forum-key') { $sent = $value; break; }
            }
        }
        if (!hash_equals(MF_FORUM_LINK_KEY, (string) $sent)) {
            mf_link_fail('Forbidden', 403);
        }
    }

    /** The POST body, as an array. Accepts JSON or form encoding. */
    function mf_link_body() {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        if (is_array($data)) return $data;
        return is_array($_POST) ? $_POST : array();
    }

    /**
     * One table, made on first use.
     *
     * Kept separate from `users` on purpose: an upgrade to the game, or a
     * restore of a dump taken before linking existed, cannot lose a column it
     * does not know about, and dropping this folder plus this table undoes the
     * whole feature.
     */
    function mf_link_table($pdo) {
        static $done = false;
        if ($done) return;
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `forum_links` (
              `link_id`        int(11)      NOT NULL AUTO_INCREMENT,
              `user_id`        int(11)      NOT NULL,
              `forum_user_id`  int(11)      DEFAULT NULL,
              `forum_nickname` varchar(190) DEFAULT NULL,
              `token_hash`     char(64)     DEFAULT NULL,
              `token_expiry`   datetime     DEFAULT NULL,
              `status`         varchar(16)  NOT NULL DEFAULT 'pending',
              `requested_at`   datetime     DEFAULT NULL,
              `linked_at`      datetime     DEFAULT NULL,
              `updated_at`     timestamp    NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
              PRIMARY KEY (`link_id`),
              UNIQUE KEY `uniq_game_user` (`user_id`),
              KEY `idx_forum_user` (`forum_user_id`),
              KEY `idx_token` (`token_hash`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        $done = true;
    }

    /** Which column of `avatars` holds this role's id. */
    function mf_link_avatar_column($role) {
        switch ($role) {
            case 'parent':  return 'parent_id';
            case 'expert':  return 'expert_id';
            case 'builder': return 'builder_id';
            case 'mini':
            case 'child':   return 'mini_id';
        }
        return null;
    }

    /**
     * Everything the forum is allowed to show about one game account.
     *
     * Deliberately narrow: a name, a role, the counters the game already puts
     * on its own dashboard, and the avatar. No password hash, no token, no
     * e-mail of anybody else, and for a child no parent's address.
     */
    function mf_link_snapshot($pdo, $user_id) {
        $user_id = (int) $user_id;

        $stmt = $pdo->prepare("
            SELECT u.user_id, u.email, u.is_active, u.is_email_verified, r.role_name
            FROM users u
            JOIN user_roles r ON r.role_id = u.role_id
            WHERE u.user_id = ?
        ");
        $stmt->execute(array($user_id));
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) return null;

        $role = $user['role_name'];
        $out = array(
            'user_id'  => (int) $user['user_id'],
            'email'    => $user['email'],
            'role'     => $role,
            'active'   => (int) $user['is_active'] === 1,
            'verified' => (int) $user['is_email_verified'] === 1,
            'name'     => '',
            'profile'  => array(),
            'avatar'   => null,
        );

        // The game stores every *_id column as the user_id itself, so one
        // lookup per role is enough — see the note in avatar/get.php.
        if ($role === 'child') {
            $stmt = $pdo->prepare("
                SELECT mini_name, age_range, tagline, total_bricks, total_medals, total_cups,
                       current_streak, longest_streak, parent_approval_status
                FROM mini_profiles WHERE mini_id = ? OR user_id = ? ORDER BY mini_id ASC LIMIT 1
            ");
            $stmt->execute(array($user_id, $user_id));
            $p = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($p) {
                $out['name'] = $p['mini_name'];
                $out['profile'] = array(
                    'mini_name'      => $p['mini_name'],
                    'age_range'      => $p['age_range'],
                    'tagline'        => $p['tagline'],
                    'bricks'         => (int) $p['total_bricks'],
                    'medals'         => (int) $p['total_medals'],
                    'cups'           => (int) $p['total_cups'],
                    'current_streak' => (int) $p['current_streak'],
                    'longest_streak' => (int) $p['longest_streak'],
                    'approval'       => $p['parent_approval_status'],
                );
            }
        } elseif ($role === 'parent') {
            $stmt = $pdo->prepare("SELECT full_name FROM parent_profiles WHERE parent_id = ? OR user_id = ? ORDER BY parent_id ASC LIMIT 1");
            $stmt->execute(array($user_id, $user_id));
            $p = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($p) $out['name'] = $p['full_name'];

            // How many Minis this parent looks after — a count, not the children.
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM mini_profiles WHERE parent_id = ?");
            $stmt->execute(array($user_id));
            $out['profile']['minis'] = (int) $stmt->fetchColumn();
        } elseif ($role === 'expert') {
            $stmt = $pdo->prepare("SELECT full_name, username, organization, profession FROM expert_profiles WHERE expert_id = ? OR user_id = ? ORDER BY expert_id ASC LIMIT 1");
            $stmt->execute(array($user_id, $user_id));
            $p = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($p) {
                $out['name'] = $p['full_name'];
                $out['profile'] = array(
                    'username'     => $p['username'],
                    'organization' => $p['organization'],
                    'profession'   => $p['profession'],
                );
            }
        } elseif ($role === 'builder') {
            $stmt = $pdo->prepare("SELECT full_name, username, age_range FROM builder_profiles WHERE builder_id = ? OR user_id = ? ORDER BY builder_id ASC LIMIT 1");
            $stmt->execute(array($user_id, $user_id));
            $p = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($p) {
                $out['name'] = $p['full_name'];
                $out['profile'] = array('username' => $p['username'], 'age_range' => $p['age_range']);
            }
        }

        if ($out['name'] === '') {
            // Never fall back to the address itself: it would put a private
            // e-mail on a public forum profile.
            $out['name'] = ucfirst($role);
        }

        $col = mf_link_avatar_column($role);
        if ($col) {
            $stmt = $pdo->prepare("
                SELECT avatar_data, avatar_url, version
                FROM avatars
                WHERE {$col} = ? AND (is_active = 1 OR is_active IS NULL)
                ORDER BY avatar_id DESC LIMIT 1
            ");
            $stmt->execute(array($user_id));
            $a = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($a) {
                $config = json_decode((string) $a['avatar_data'], true);
                $out['avatar'] = array(
                    'url'     => $a['avatar_url'],
                    'config'  => is_array($config) ? $config : null,
                    'version' => (int) $a['version'],
                );
            }
        }

        return $out;
    }
}
