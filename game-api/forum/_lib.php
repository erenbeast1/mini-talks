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

    /** A nickname, trimmed to fit the column without splitting a character. */
    function mf_link_cut($text, $max) {
        $text = trim((string) $text);
        return function_exists('mb_substr') ? mb_substr($text, 0, $max, 'UTF-8') : substr($text, 0, $max);
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
     * Everything the game already shows about a set of Minis, in bulk.
     *
     * One query per kind rather than per Mini, so a parent with a dozen children
     * costs the same handful of round trips as a parent with one. Returns a map
     * of mini_id => extras; a Mini with nothing recorded simply gets empty ones.
     */
    function mf_link_enrich($pdo, $mini_ids) {
        $ids = array();
        foreach ($mini_ids as $id) { $id = (int) $id; if ($id > 0) $ids[$id] = $id; }
        if (!$ids) return array();
        $ids   = array_values($ids);
        $marks = implode(',', array_fill(0, count($ids), '?'));

        $out = array();
        foreach ($ids as $id) {
            $out[$id] = array('avatar' => null, 'motivation' => '', 'experts' => array(),
                              'figures' => array(), 'scene_detail' => array(),
                              'streak' => null, 'rewards' => array(),
                              'scenes' => array('played' => 0, 'total' => 0, 'minutes' => 0,
                                                'recordings' => 0, 'names' => array()));
        }

        /* The Mini's profile picture, and only that: the PNG the avatar editor
           saved, exactly what avatar/get.php hands the game's own dashboard.
           Not customized_minis — those are the characters a Mini builds for a
           scene, a different thing that the game never shows as a profile
           picture either. A Mini who has not made one yet has no picture, and
           the forum draws their initial rather than somebody else's character. */
        $stmt = $pdo->prepare("
            SELECT mini_id, avatar_url FROM avatars
            WHERE mini_id IN ({$marks}) AND (is_active = 1 OR is_active IS NULL)
            ORDER BY avatar_id ASC
        ");
        $stmt->execute($ids);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $id = (int) $r['mini_id'];
            if (isset($out[$id]) && !empty($r['avatar_url'])) $out[$id]['avatar'] = $r['avatar_url'];
        }

        /* The characters a Mini has built for its scenes. Not a profile
           picture — the game keeps them apart and so does this — but they are
           the most tangible thing a Mini makes, so they belong in the detail
           beside the scenes they were built for. */
        $stmt = $pdo->prepare("
            SELECT c.mini_id, c.image_url, c.scene_id, s.scene_name
            FROM customized_minis c
            LEFT JOIN scenes s ON s.scene_id = c.scene_id
            WHERE c.mini_id IN ({$marks}) AND c.image_url IS NOT NULL AND c.image_url <> ''
              AND (c.is_hidden = 0 OR c.is_hidden IS NULL)
            ORDER BY c.display_order ASC, c.id DESC
        ");
        $stmt->execute($ids);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $id = (int) $r['mini_id'];
            if (!isset($out[$id]) || count($out[$id]['figures']) >= 12) continue;
            $out[$id]['figures'][] = array(
                'url'   => $r['image_url'],
                'scene' => !empty($r['scene_name']) ? $r['scene_name'] : '',
            );
        }

        /* The motivation message a parent actually set, not the default tagline
           every Mini is born with. Newest settings row wins, a custom message
           beats a preset, and the preset text comes from the same table the
           game reads. */
        $presets = array();
        foreach ($pdo->query("SELECT preset_id, message_text FROM motivation_presets WHERE is_active = 1")
                     ->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $presets[(int) $r['preset_id']] = $r['message_text'];
        }
        $stmt = $pdo->prepare("
            SELECT mini_id, custom_message, selected_preset_ids
            FROM motivation_settings WHERE mini_id IN ({$marks})
            ORDER BY updated_at ASC, id ASC
        ");
        $stmt->execute($ids);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $id  = (int) $r['mini_id'];
            if (!isset($out[$id])) continue;
            $msg = trim((string) $r['custom_message']);
            if ($msg === '') {
                $chosen = json_decode((string) $r['selected_preset_ids'], true);
                if (is_array($chosen)) {
                    foreach ($chosen as $pid) {
                        if (isset($presets[(int) $pid])) { $msg = $presets[(int) $pid]; break; }
                    }
                }
            }
            if ($msg !== '') $out[$id]['motivation'] = $msg;
        }

        /* Scene by scene, level by level. The game unlocks Sound, Word, Sentence
           and Dialogue separately per scene, and that — not a total — is what a
           parent means by a Mini's detail. Read as rows, summed into the
           headline afterwards, so both come from one query. */
        $total = (int) $pdo->query("SELECT COUNT(*) FROM scenes WHERE is_active = 1")->fetchColumn();
        $stmt = $pdo->prepare("
            SELECT l.mini_id, l.scene_id, s.scene_name, s.scene_difficulty,
                   lv.level_name, lv.level_order, l.is_locked,
                   l.play_time_seconds, l.recording_count, l.last_play_date
            FROM mini_scene_levels l
            LEFT JOIN scenes s ON s.scene_id = l.scene_id
            LEFT JOIN levels lv ON lv.level_id = l.level_id
            WHERE l.mini_id IN ({$marks})
            ORDER BY s.scene_order ASC, l.scene_id ASC, lv.level_order ASC
        ");
        $stmt->execute($ids);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $id  = (int) $r['mini_id'];
            if (!isset($out[$id])) continue;
            $sid = (int) $r['scene_id'];
            if (!isset($out[$id]['scene_detail'][$sid])) {
                $out[$id]['scene_detail'][$sid] = array(
                    'scene_id'   => $sid,
                    'name'       => !empty($r['scene_name']) ? $r['scene_name'] : ('Scene ' . $sid),
                    'difficulty' => $r['scene_difficulty'],
                    'levels'     => array(),
                    'minutes'    => 0,
                    'recordings' => 0,
                    'last_played'=> null,
                    'open'       => false,
                );
            }
            $sc = &$out[$id]['scene_detail'][$sid];
            $unlocked = ((int) $r['is_locked'] === 0);
            if ($unlocked) $sc['open'] = true;
            if (!empty($r['level_name'])) {
                $sc['levels'][] = array('name' => $r['level_name'], 'unlocked' => $unlocked);
            }
            $sc['minutes']    += (int) round(((int) $r['play_time_seconds']) / 60);
            $sc['recordings'] += (int) $r['recording_count'];
            if (!empty($r['last_play_date'])
                && ($sc['last_played'] === null || $r['last_play_date'] > $sc['last_played'])) {
                $sc['last_played'] = $r['last_play_date'];
            }
            unset($sc);
        }
        foreach ($out as $id => $_) {
            $out[$id]['scenes']['total'] = $total;
            $kept = array();
            foreach ($out[$id]['scene_detail'] as $sc) {
                if (!$sc['open']) continue;                   // never opened: not a scene they played
                $kept[] = $sc;
                $out[$id]['scenes']['played']++;
                $out[$id]['scenes']['minutes']    += $sc['minutes'];
                $out[$id]['scenes']['recordings'] += $sc['recordings'];
                if (count($out[$id]['scenes']['names']) < 12) $out[$id]['scenes']['names'][] = $sc['name'];
            }
            $out[$id]['scene_detail'] = $kept;
        }

        /* Streak, as the game keeps it: not just the current run but how many
           days this Mini has been active at all, and when they last were. */
        $stmt = $pdo->prepare("
            SELECT mini_id, current_streak, longest_streak, total_active_days, last_active_date
            FROM streak_summary WHERE mini_id IN ({$marks})
        ");
        $stmt->execute($ids);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $id = (int) $r['mini_id'];
            if (!isset($out[$id])) continue;
            $out[$id]['streak'] = array(
                'current'     => (int) $r['current_streak'],
                'longest'     => (int) $r['longest_streak'],
                'active_days' => (int) $r['total_active_days'],
                'last_active' => $r['last_active_date'],
            );
        }

        /* Where the bricks came from. The game names every reward it hands out,
           so a parent can see whether they came from recordings, from missions
           or from simply turning up. */
        $stmt = $pdo->prepare("
            SELECT mini_id, reward_type, COUNT(*) AS n
            FROM mini_rewards WHERE mini_id IN ({$marks})
            GROUP BY mini_id, reward_type
        ");
        $stmt->execute($ids);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $id = (int) $r['mini_id'];
            if (!isset($out[$id])) continue;
            $out[$id]['rewards'][(string) $r['reward_type']] = (int) $r['n'];
        }

        /* The experts a parent approved for this Mini. A name and where they
           work — never their address, and never a pending or rejected request. */
        $stmt = $pdo->prepare("
            SELECT c.mini_id, e.expert_id, e.full_name, e.organization, e.profession,
                   a.avatar_url
            FROM expert_mini_connections c
            JOIN expert_profiles e ON e.expert_id = c.expert_id
            LEFT JOIN avatars a ON a.expert_id = e.expert_id AND (a.is_active = 1 OR a.is_active IS NULL)
            WHERE c.mini_id IN ({$marks}) AND c.parent_approval_status = 'approved'
            ORDER BY e.full_name ASC, a.avatar_id DESC
        ");
        $stmt->execute($ids);
        $seen_expert = array();
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $id  = (int) $r['mini_id'];
            $key = $id . ':' . (int) $r['expert_id'];
            if (!isset($out[$id]) || isset($seen_expert[$key])) continue;   // newest avatar wins
            $seen_expert[$key] = true;
            $out[$id]['experts'][] = array(
                'name'         => $r['full_name'],
                'organization' => $r['organization'],
                'profession'   => $r['profession'],
                'avatar'       => !empty($r['avatar_url']) ? $r['avatar_url'] : null,
            );
        }

        return $out;
    }

    /**
     * The Minis a parent looks after, with what the game already shows for each.
     *
     * A Mini reaches a parent two ways, and the game's own dashboard reads both:
     * the parent created it (parent_id), or the child registered and named this
     * parent's address (parent_email, with no parent_id yet). Only approved ones
     * are returned — a pending or rejected request is the game's business, not
     * something to put on a forum profile.
     */
    function mf_link_minis($pdo, $parent_user_id, $parent_email) {
        $stmt = $pdo->prepare("
            SELECT mp.mini_id, mp.mini_name, mp.age_range, mp.tagline,
                   mp.total_bricks, mp.total_medals, mp.total_cups,
                   mp.current_streak, mp.longest_streak
            FROM mini_profiles mp
            WHERE mp.parent_approval_status = 'approved'
              AND (mp.parent_id = ? OR (mp.parent_id IS NULL AND mp.parent_email = ?))
            ORDER BY mp.mini_name ASC
            LIMIT 24
        ");
        $stmt->execute(array($parent_user_id, (string) $parent_email));
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!$rows) return array();

        $ids = array();
        foreach ($rows as $r) $ids[] = (int) $r['mini_id'];
        $extra = mf_link_enrich($pdo, $ids);

        $out = array();
        foreach ($rows as $r) {
            $id = (int) $r['mini_id'];
            $e  = isset($extra[$id]) ? $extra[$id] : array();
            $out[] = array(
                'mini_id'        => $id,
                'name'           => $r['mini_name'],
                'age_range'      => $r['age_range'],
                'tagline'        => $r['tagline'],
                'bricks'         => (int) $r['total_bricks'],
                'medals'         => (int) $r['total_medals'],
                'cups'           => (int) $r['total_cups'],
                'current_streak' => (int) $r['current_streak'],
                'longest_streak' => (int) $r['longest_streak'],
                'avatar'         => isset($e['avatar'])     ? $e['avatar']     : null,
                'motivation'     => isset($e['motivation']) ? $e['motivation'] : '',
                'experts'        => isset($e['experts'])    ? $e['experts']    : array(),
                'figures'        => isset($e['figures'])    ? $e['figures']    : array(),
                'scenes'         => isset($e['scenes'])     ? $e['scenes']     : null,
                'scene_detail'   => isset($e['scene_detail']) ? $e['scene_detail'] : array(),
                'streak_detail'  => isset($e['streak'])     ? $e['streak']     : null,
                'rewards'        => isset($e['rewards'])    ? $e['rewards']    : array(),
            );
        }
        return $out;
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
            'minis'    => array(),
            'experts'  => array(),
        );

        // The game stores every *_id column as the user_id itself, so one
        // lookup per role is enough — see the note in avatar/get.php.
        if ($role === 'child') {
            $stmt = $pdo->prepare("
                SELECT mini_id, mini_name, age_range, tagline, total_bricks, total_medals, total_cups,
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

                // A Mini gets the same extras their parent sees for them: the
                // figure the game draws, the message their parent set, the
                // scenes they have played, and the experts they work with.
                $mini_id = isset($p['mini_id']) ? (int) $p['mini_id'] : 0;
                $extra   = $mini_id ? mf_link_enrich($pdo, array($mini_id)) : array();
                if (isset($extra[$mini_id])) {
                    $e = $extra[$mini_id];
                    $out['profile']['motivation'] = $e['motivation'];
                    $out['profile']['scenes']     = $e['scenes'];
                    $out['profile']['figures']      = $e['figures'];
                    $out['profile']['scene_detail'] = $e['scene_detail'];
                    $out['profile']['streak_detail']= $e['streak'];
                    $out['profile']['rewards']      = $e['rewards'];
                    $out['experts']               = $e['experts'];
                    if (!empty($e['avatar']) && empty($out['avatar']['url'])) {
                        $out['avatar'] = array('url' => $e['avatar'], 'config' => null, 'version' => 0);
                    }
                }
            }
        } elseif ($role === 'parent') {
            $stmt = $pdo->prepare("SELECT full_name FROM parent_profiles WHERE parent_id = ? OR user_id = ? ORDER BY parent_id ASC LIMIT 1");
            $stmt->execute(array($user_id, $user_id));
            $p = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($p) $out['name'] = $p['full_name'];

            $out['minis'] = mf_link_minis($pdo, $user_id, $user['email']);
            $out['profile']['minis'] = count($out['minis']);

            // The experts across the whole family, once each — a parent working
            // with the same expert for two children should see them once.
            $seen = array();
            foreach ($out['minis'] as $m) {
                foreach ($m['experts'] as $e) {
                    $key = strtolower(trim($e['name'] . '|' . $e['organization']));
                    if (isset($seen[$key])) continue;
                    $seen[$key] = true;
                    $out['experts'][] = $e;
                }
            }
        } elseif ($role === 'expert') {
            $stmt = $pdo->prepare("SELECT expert_id, full_name, username, organization, profession FROM expert_profiles WHERE expert_id = ? OR user_id = ? ORDER BY expert_id ASC LIMIT 1");
            $stmt->execute(array($user_id, $user_id));
            $p = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($p) {
                $out['name'] = $p['full_name'];
                $out['profile'] = array(
                    'username'     => $p['username'],
                    'organization' => $p['organization'],
                    'profession'   => $p['profession'],
                );
                // How many Minis a parent has approved them for. A count only:
                // whose children they are is not the forum's business.
                $stmt = $pdo->prepare("SELECT COUNT(DISTINCT mini_id) FROM expert_mini_connections WHERE expert_id = ? AND parent_approval_status = 'approved'");
                $stmt->execute(array((int) $p['expert_id']));
                $out['profile']['minis'] = (int) $stmt->fetchColumn();
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
                // Never blank out a figure the role branch already found for a
                // Mini who has built one but never opened the avatar editor.
                $url = !empty($a['avatar_url']) ? $a['avatar_url']
                     : (isset($out['avatar']['url']) ? $out['avatar']['url'] : null);
                $out['avatar'] = array(
                    'url'     => $url,
                    'config'  => is_array($config) ? $config : null,
                    'version' => (int) $a['version'],
                );
            }
        }

        return $out;
    }
}
