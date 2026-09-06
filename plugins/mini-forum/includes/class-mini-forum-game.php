<?php
/**
 * Mini-Forum ⇄ Mini-Talks game — Connect Profile.
 *
 * A forum member proves one thing: that they can read the inbox of the e-mail
 * address a game account is registered to. That is the same proof the game
 * already asks for when an account is created, pointed at the forum instead of
 * at a login, so nobody has to type a game password into WordPress and no
 * password ever crosses between the two systems.
 *
 *   Profile → App & Studio → Connect Profile
 *     → member types their game e-mail
 *     → forum asks the game for a one-time token for that address
 *     → forum mails the link to that address (wp_mail, so it goes out with the
 *       site's own mailer and the wording is editable on the Design page)
 *     → member opens the link, which lands back on the forum
 *     → forum spends the token at the game and stores the account on the user
 *
 * The forum never sees a game user id until the token is spent, and the game
 * only ever answers a caller carrying the shared key, so a link copied out of
 * an inbox is worthless on its own.
 *
 * With nothing configured the whole feature is invisible: the App & Studio tab
 * reads exactly as it did before.
 */

if (!defined('ABSPATH')) exit;

class Mini_Forum_Game {

    const OPT       = 'mf_game';
    const META_ID   = 'mf_game_user_id';
    const META_ROLE = 'mf_game_role';
    const META_MAIL = 'mf_game_email';
    const META_SNAP = 'mf_game_account';
    const META_WHEN = 'mf_game_linked_at';
    const META_SYNC = 'mf_game_synced_at';

    /** How long the confirmation link stays usable. Mirrors MF_LINK_TTL. */
    const TTL_MINUTES = 60;

    /** Attempts allowed per member per window, and the window in seconds. */
    const TRY_MAX    = 6;
    const TRY_WINDOW = 900;

    /** How stale a stored snapshot may get before the profile refetches it. */
    const SYNC_AGE = 900;

    public static function init() {
        add_action('wp_ajax_mf_game_request',    array(__CLASS__, 'ajax_request'));
        add_action('wp_ajax_mf_game_disconnect', array(__CLASS__, 'ajax_disconnect'));
        add_action('wp_ajax_mf_game_refresh',    array(__CLASS__, 'ajax_refresh'));
        add_action('wp_ajax_mf_game_avatar',     array(__CLASS__, 'ajax_avatar'));

        // The link in the e-mail lands on any front-end URL carrying the token.
        add_action('template_redirect', array(__CLASS__, 'catch_link'), 5);

        if (is_admin()) {
            add_action('admin_menu', array(__CLASS__, 'menu'), 21);
        }
    }

    /**
     * One editable string.
     *
     * Every sentence below reads through here, so it can be reworded on the
     * Design page — and keeps its literal as the fallback, so the feature still
     * reads correctly if the area was never registered.
     */
    private static function t($id, $fallback) {
        if (class_exists('Mini_Forum_Design') && Mini_Forum_Design::has($id)) {
            $val = Mini_Forum_Design::get($id);
            if (is_string($val) && trim($val) !== '') return $val;
        }
        return $fallback;
    }

    /* ──────────────────────────────────────────────────────────────
     * Settings
     * ────────────────────────────────────────────────────────────── */

    public static function settings() {
        $o = get_option(self::OPT, array());
        if (!is_array($o)) $o = array();
        return array(
            'api' => isset($o['api']) ? untrailingslashit(trim($o['api'])) : '',
            'key' => isset($o['key']) ? trim($o['key']) : '',
        );
    }

    /** Configured means: we know where the game is, and we can prove we are us. */
    public static function configured() {
        $s = self::settings();
        return $s['api'] !== '' && $s['key'] !== '';
    }

    /**
     * One call to the game's forum endpoints.
     *
     * The key travels in a header, never in the URL, so it stays out of access
     * logs. Plain http is refused outright unless the game is on this machine:
     * the key and the token would both be readable on the wire.
     */
    private static function call($endpoint, $body) {
        $s = self::settings();
        if (!self::configured()) {
            return new WP_Error('mf_game_off', __('Game linking is not set up yet.', 'mini-forum'));
        }

        $url  = $s['api'] . '/forum/' . $endpoint;
        $host = parse_url($url, PHP_URL_HOST);
        $local = in_array($host, array('localhost', '127.0.0.1', '::1'), true);
        if (strpos($url, 'https://') !== 0 && !$local) {
            return new WP_Error('mf_game_insecure', __('The game address must start with https:// .', 'mini-forum'));
        }

        $res = wp_remote_post($url, array(
            'timeout' => 15,
            'headers' => array(
                'Content-Type' => 'application/json; charset=utf-8',
                'X-Forum-Key'  => $s['key'],
                'Accept'       => 'application/json',
            ),
            'body' => wp_json_encode($body),
        ));

        if (is_wp_error($res)) {
            return new WP_Error('mf_game_unreachable', __('The game could not be reached. Please try again in a moment.', 'mini-forum'));
        }

        $code = (int) wp_remote_retrieve_response_code($res);
        $data = json_decode(wp_remote_retrieve_body($res), true);

        if (!is_array($data)) {
            // A 404 here almost always means the forum/ folder is not uploaded
            // yet. Say that, rather than "invalid response", so whoever set it
            // up knows where to look.
            return new WP_Error('mf_game_bad_reply', $code === 404
                ? __('The game answered 404 — the forum endpoints are not installed on it yet.', 'mini-forum')
                : __('The game sent back something the forum could not read.', 'mini-forum'));
        }
        if (empty($data['success'])) {
            // A reason the game named wins over the status code: link-confirm and
            // link-profile both answer 403 for a link that belongs to somebody
            // else, and reading that as a wrong shared key would send whoever
            // set this up looking in entirely the wrong place.
            if (!empty($data['code'])) {
                $msg = isset($data['message']) ? (string) $data['message'] : __('The game refused that request.', 'mini-forum');
                return new WP_Error('mf_game_' . sanitize_key($data['code']), $msg);
            }
            if ($code === 403) {
                return new WP_Error('mf_game_key', __('The game refused the shared key. Check that both sides carry the same one.', 'mini-forum'));
            }
            return new WP_Error('mf_game_refused', isset($data['message'])
                ? (string) $data['message'] : __('The game refused that request.', 'mini-forum'));
        }

        return $data;
    }

    /* ──────────────────────────────────────────────────────────────
     * What a member is linked to
     * ────────────────────────────────────────────────────────────── */

    public static function game_user_id($uid) {
        return (int) get_user_meta((int) $uid, self::META_ID, true);
    }

    public static function linked($uid) {
        return self::game_user_id($uid) > 0;
    }

    /** The stored snapshot, refetched when it has gone stale. */
    public static function account($uid, $force = false) {
        $uid = (int) $uid;
        if (!self::linked($uid)) return null;

        $snap = get_user_meta($uid, self::META_SNAP, true);
        if (!is_array($snap)) $snap = array();

        $age = time() - (int) get_user_meta($uid, self::META_SYNC, true);
        if (($force || $age > self::SYNC_AGE || empty($snap)) && self::configured()) {
            $fresh = self::call('link-profile.php', array(
                'user_id'       => self::game_user_id($uid),
                'forum_user_id' => $uid,
            ));
            if (!is_wp_error($fresh) && !empty($fresh['account'])) {
                $snap = $fresh['account'];
                self::store($uid, $snap);
            } elseif (is_wp_error($fresh) && $fresh->get_error_code() === 'mf_game_not_linked') {
                // The game no longer believes in this link. Neither should we,
                // rather than showing a card that does nothing.
                self::forget($uid);
                return null;
            }
        }

        return $snap ? $snap : null;
    }

    private static function store($uid, $account) {
        update_user_meta($uid, self::META_ID,   (int) $account['user_id']);
        update_user_meta($uid, self::META_ROLE, sanitize_key($account['role']));
        update_user_meta($uid, self::META_MAIL, sanitize_email($account['email']));
        update_user_meta($uid, self::META_SNAP, $account);
        update_user_meta($uid, self::META_SYNC, time());
    }

    private static function forget($uid) {
        foreach (array(self::META_ID, self::META_ROLE, self::META_MAIL,
                       self::META_SNAP, self::META_WHEN, self::META_SYNC) as $k) {
            delete_user_meta($uid, $k);
        }
    }

    /** Is this game account already on somebody else's forum profile? */
    private static function claimed_by_other($game_user_id, $uid) {
        $others = get_users(array(
            'meta_key'   => self::META_ID,
            'meta_value' => (int) $game_user_id,
            'exclude'    => array((int) $uid),
            'fields'     => 'ID',
            'number'     => 1,
        ));
        return !empty($others);
    }

    /* ──────────────────────────────────────────────────────────────
     * Step 1 — ask the game for a token, then mail it ourselves
     * ────────────────────────────────────────────────────────────── */

    public static function request($uid, $email) {
        $uid   = (int) $uid;
        $email = sanitize_email($email);

        if (!is_email($email)) {
            return new WP_Error('mf_game_email', self::t('game.msg.bademail', 'That does not look like an e-mail address.'));
        }
        if (self::linked($uid)) {
            return new WP_Error('mf_game_already', self::t('game.msg.already', 'Your profile is already connected to a game account. Disconnect it first.'));
        }
        if (!self::throttle_ok($uid)) {
            return new WP_Error('mf_game_slow', self::t('game.msg.slow', 'That is a lot of tries. Please wait a few minutes and start again.'));
        }

        $res = self::call('link-request.php', array(
            'email'          => $email,
            'forum_user_id'  => $uid,
            'forum_nickname' => function_exists('mf_get_nickname') ? mf_get_nickname($uid) : '',
        ));
        if (is_wp_error($res)) return $res;

        // No account on that address. The member is told the same thing either
        // way — "if there is an account, a link is on its way" — so the forum
        // cannot be used to find out who plays the game.
        if (empty($res['found'])) return true;

        $token = isset($res['token']) ? (string) $res['token'] : '';
        if ($token === '') return true;

        self::send_mail($uid, $email, $token, isset($res['name']) ? $res['name'] : '');
        return true;
    }

    private static function throttle_ok($uid) {
        $key  = 'mf_game_try_' . (int) $uid;
        $tries = (int) get_transient($key);
        if ($tries >= self::TRY_MAX) return false;
        set_transient($key, $tries + 1, self::TRY_WINDOW);
        return true;
    }

    /**
     * The confirmation e-mail.
     *
     * Sent by WordPress, not by the game, for three reasons: the wording lives
     * on the Design page like every other piece of copy on this site, it is
     * translated by the same plugin as the rest, and the game needs no mailer
     * change to gain a feature it does not own.
     */
    private static function send_mail($uid, $email, $token, $game_name) {
        $link = add_query_arg(array(
            'mf_game_link' => rawurlencode($token),
        ), self::profile_url());

        $nickname = function_exists('mf_get_nickname') ? mf_get_nickname($uid) : '';
        $site     = wp_specialchars_decode(get_bloginfo('name'), ENT_QUOTES);

        $subject = self::t('game.email.subject', 'Connect your Mini-Talks game account');
        $body    = Mini_Forum_Design::render('game.email', array(
            'game_name' => esc_html($game_name !== '' ? $game_name : $nickname),
            'nickname'  => esc_html($nickname),
            'site'      => esc_html($site),
            'link'      => esc_url($link),
            'minutes'   => (int) self::TTL_MINUTES,
        ));

        $headers = array('Content-Type: text/html; charset=UTF-8');
        wp_mail($email, $subject, $body, $headers);
    }

    /* ──────────────────────────────────────────────────────────────
     * Step 2 — the member opened the link
     * ────────────────────────────────────────────────────────────── */

    public static function catch_link() {
        if (empty($_GET['mf_game_link'])) return;

        $token = sanitize_text_field(wp_unslash($_GET['mf_game_link']));
        $back  = remove_query_arg('mf_game_link');

        if (!is_user_logged_in()) {
            // Send them through the login they already have, back to this link.
            wp_safe_redirect(wp_login_url(add_query_arg('mf_game_link', rawurlencode($token), $back)));
            exit;
        }

        $uid = get_current_user_id();
        $res = self::confirm($uid, $token);

        // #studio so the profile opens on the tab the answer belongs to,
        // rather than on Mini-Forum with the result hidden behind a tab.
        $status = is_wp_error($res) ? $res->get_error_code() : 'ok';
        wp_safe_redirect(add_query_arg('mf_game', $status, self::profile_url()) . '#studio');
        exit;
    }

    public static function confirm($uid, $token) {
        $uid = (int) $uid;
        if ($token === '') {
            return new WP_Error('invalid', self::t('game.msg.invalid', 'That link is no longer valid. Please start again.'));
        }
        if (self::linked($uid)) {
            return new WP_Error('already', self::t('game.msg.already', 'Your profile is already connected to a game account. Disconnect it first.'));
        }

        $res = self::call('link-confirm.php', array(
            'token'          => $token,
            'forum_user_id'  => $uid,
            'forum_nickname' => function_exists('mf_get_nickname') ? mf_get_nickname($uid) : '',
        ));
        if (is_wp_error($res)) {
            return new WP_Error('invalid', $res->get_error_message());
        }

        $account = isset($res['account']) && is_array($res['account']) ? $res['account'] : null;
        if (!$account || empty($account['user_id'])) {
            return new WP_Error('invalid', self::t('game.msg.invalid', 'That link is no longer valid. Please start again.'));
        }

        // Last guard on this side. The game checks it too, but a forum profile
        // holding somebody else's game account is the forum's problem to refuse.
        if (self::claimed_by_other($account['user_id'], $uid)) {
            return new WP_Error('taken', self::t('game.msg.taken', 'That game account is already connected to another Mini-Talks profile.'));
        }

        self::store($uid, $account);
        update_user_meta($uid, self::META_WHEN, time());
        return $account;
    }

    /* ──────────────────────────────────────────────────────────────
     * Disconnect, refresh, avatar
     * ────────────────────────────────────────────────────────────── */

    public static function disconnect($uid) {
        $uid  = (int) $uid;
        $game = self::game_user_id($uid);
        if ($game > 0 && self::configured()) {
            // Best effort: a game that cannot be reached must not leave a
            // member stuck with a link they have asked to be rid of.
            self::call('link-revoke.php', array('user_id' => $game, 'forum_user_id' => $uid));
        }
        self::forget($uid);
        return true;
    }

    /**
     * Bring the game figure across as the forum avatar.
     *
     * Both sides run the same editor, so the config transfers as-is; the PNG
     * the game rendered is fetched once and stored locally, so the forum keeps
     * working if the game is down and the avatar is cache-busted like any other.
     */
    public static function import_avatar($uid) {
        $uid  = (int) $uid;
        $snap = self::account($uid, true);
        if (!$snap || empty($snap['avatar']) || empty($snap['avatar']['config'])) {
            return new WP_Error('mf_game_noavatar', self::t('game.msg.noavatar', 'There is no figure saved on that game account yet.'));
        }

        $applied = Mini_Forum_Avatar::apply_config($uid, $snap['avatar']['config'],
                                                   isset($snap['avatar']['url']) ? $snap['avatar']['url'] : '');
        if (is_wp_error($applied)) return $applied;

        return $applied;
    }

    /* ──────────────────────────────────────────────────────────────
     * AJAX
     * ────────────────────────────────────────────────────────────── */

    private static function gate() {
        check_ajax_referer('mf_nonce', 'nonce');
        if (!is_user_logged_in()) wp_send_json_error(array('message' => 'Login required'), 401);
        if (!self::configured()) wp_send_json_error(array('message' => self::t('game.msg.off', 'Game linking is not set up yet.')), 503);
        return get_current_user_id();
    }

    public static function ajax_request() {
        $uid = self::gate();
        $res = self::request($uid, isset($_POST['email']) ? wp_unslash($_POST['email']) : '');
        if (is_wp_error($res)) wp_send_json_error(array('message' => $res->get_error_message()));
        wp_send_json_success(array('sent' => 1, 'minutes' => self::TTL_MINUTES));
    }

    public static function ajax_disconnect() {
        $uid = self::gate();
        self::disconnect($uid);
        wp_send_json_success(array('html' => self::card_html($uid)));
    }

    public static function ajax_refresh() {
        $uid = self::gate();
        self::account($uid, true);
        wp_send_json_success(array('html' => self::card_html($uid)));
    }

    public static function ajax_avatar() {
        $uid = self::gate();
        $res = self::import_avatar($uid);
        if (is_wp_error($res)) wp_send_json_error(array('message' => $res->get_error_message()));
        wp_send_json_success(array(
            'message'    => self::t('game.msg.avatar', 'Your game figure is now your forum avatar.'),
            'avatar_url' => Mini_Forum_Avatar::resolve_url($uid, 96),
        ));
    }

    /* ──────────────────────────────────────────────────────────────
     * Front end
     * ────────────────────────────────────────────────────────────── */

    public static function profile_url() {
        $forum = function_exists('mf_get_forum_url') ? mf_get_forum_url() : home_url('/');
        return add_query_arg('view', 'profile', $forum);
    }

    /** Human labels for the game's own role names. */
    public static function role_label($role) {
        $map = array(
            'child'   => self::t('game.role.child',   'Mini'),
            'parent'  => self::t('game.role.parent',  'Parent'),
            'expert'  => self::t('game.role.expert',  'Expert'),
            'builder' => self::t('game.role.builder', 'Builder'),
            'admin'   => self::t('game.role.admin',   'Team'),
        );
        return isset($map[$role]) ? $map[$role] : ucfirst((string) $role);
    }

    /**
     * The counters, as the same stat boxes the profile header already uses, so
     * a rule written for one styles the other.
     */
    private static function stats_html($account) {
        $p    = isset($account['profile']) && is_array($account['profile']) ? $account['profile'] : array();
        $role = isset($account['role']) ? $account['role'] : '';
        $rows = array();

        if ($role === 'child') {
            $rows['Bricks'] = isset($p['bricks']) ? (int) $p['bricks'] : 0;
            $rows['Medals'] = isset($p['medals']) ? (int) $p['medals'] : 0;
            $rows['Cups']   = isset($p['cups'])   ? (int) $p['cups']   : 0;
            if (!empty($p['current_streak'])) $rows['Streak'] = (int) $p['current_streak'];
        } elseif ($role === 'parent') {
            $rows['Minis'] = isset($p['minis']) ? (int) $p['minis'] : 0;
        }

        $out = '';
        foreach ($rows as $label => $value) {
            $out .= '<div class="mf-stat-box">' . esc_html($label) . ': ' . (int) $value . '</div>';
        }
        return $out;
    }

    /** The whole App & Studio card, in whichever of its two states applies. */
    public static function card_html($uid) {
        $uid = (int) $uid;

        if (!self::linked($uid)) {
            return Mini_Forum_Design::render('game.connect', array('icon' => MF_GAME_SVG));
        }

        $account = self::account($uid);
        if (!$account) {
            return Mini_Forum_Design::render('game.connect', array('icon' => MF_GAME_SVG));
        }

        $p       = isset($account['profile']) && is_array($account['profile']) ? $account['profile'] : array();
        $synced  = (int) get_user_meta($uid, self::META_SYNC, true);
        $avatar  = '';
        if (!empty($account['avatar']['url'])) {
            $avatar = '<img src="' . esc_url($account['avatar']['url']) . '" alt="" width="96" height="96" loading="lazy">';
        } else {
            $avatar = mf_avatar_html($uid, 'lg');
        }

        $tagline = '';
        if (!empty($p['tagline']))        $tagline = $p['tagline'];
        elseif (!empty($p['organization'])) $tagline = $p['organization'];
        elseif (!empty($p['profession']))   $tagline = $p['profession'];

        // The address is the member's own, shown back to them on their own
        // profile — masked anyway, so a shoulder or a screenshot gives nothing.
        return Mini_Forum_Design::render('game.linked', array(
            'avatar'  => $avatar,
            'name'    => esc_html(isset($account['name']) ? $account['name'] : ''),
            'role'    => esc_html(self::role_label(isset($account['role']) ? $account['role'] : '')),
            'tagline' => esc_html($tagline),
            'stats'   => self::stats_html($account),
            'email'   => esc_html(self::mask_email(isset($account['email']) ? $account['email'] : '')),
            'synced'  => $synced ? esc_html(mf_time_ago(gmdate('Y-m-d H:i:s', $synced))) : esc_html__('just now', 'mini-forum'),
        ));
    }

    public static function mask_email($email) {
        $at = strpos((string) $email, '@');
        if ($at === false || $at < 1) return (string) $email;
        $name = substr($email, 0, $at);
        $keep = $name !== '' ? substr($name, 0, 1) : '';
        return $keep . str_repeat('*', max(1, min(6, strlen($name) - 1))) . substr($email, $at);
    }

    /** The popup, in both of its states. Hidden until a button opens it. */
    public static function popup_html() {
        return '<div class="mf-game-pop" id="mf-game-pop" hidden>'
             . '<div class="mf-game-pop-box" role="dialog" aria-modal="true" aria-label="Connect your game account">'
             . '<div data-mf-game-step="form">'  . Mini_Forum_Design::render('game.form') . '</div>'
             . '<div data-mf-game-step="sent" hidden>' . Mini_Forum_Design::render('game.sent', array(
                    'email'   => esc_html__('that address', 'mini-forum'),
                    'minutes' => (int) self::TTL_MINUTES,
                    'tick'    => MF_TICK_SVG,
               )) . '</div>'
             . '</div></div>';
    }

    /**
     * What an administrator sees on their own profile before this is set up.
     *
     * Without it the App & Studio tab just reads "Coming soon", which is what a
     * member should see but tells the person who installed the plugin nothing —
     * not that the feature exists, not that two values are all it needs, and not
     * where to put them. Members still get the plain empty state.
     */
    public static function setup_hint() {
        if (!current_user_can('manage_options')) return '';
        return '<div class="mf-game-card mf-game-off">'
             . '<div class="mf-game-badge">' . MF_GAME_SVG . '</div>'
             . '<div class="mf-game-copy"><h4>Connect Profile is not set up yet</h4>'
             . '<p>Members will be able to connect their Mini-Talks game account here. It needs two '
             . 'things first: the game API address, and a shared key that also goes in the game\'s '
             . '<code>forum/config.php</code>. Only you can see this notice.</p></div>'
             . '<div class="mf-game-actions"><a class="mf-game-btn" href="'
             . esc_url(admin_url('admin.php?page=mf-game')) . '">Set it up</a></div></div>';
    }

    /** Whatever the redirect after a confirmation link wants to say. */
    public static function notice_html() {
        if (empty($_GET['mf_game'])) return '';
        $code = sanitize_key(wp_unslash($_GET['mf_game']));
        $map  = array(
            'ok'      => array('ok',  self::t('game.msg.linked',  'Connected. Your game account is on your profile now.')),
            'taken'   => array('bad', self::t('game.msg.taken',   'That game account is already connected to another Mini-Talks profile.')),
            'already' => array('bad', self::t('game.msg.already', 'Your profile is already connected to a game account. Disconnect it first.')),
            'invalid' => array('bad', self::t('game.msg.invalid', 'That link is no longer valid. Please start again.')),
        );
        if (!isset($map[$code])) $code = 'invalid';
        list($kind, $text) = $map[$code];
        return '<div class="mf-game-notice mf-game-notice-' . esc_attr($kind) . '">' . esc_html($text) . '</div>';
    }

    /* ──────────────────────────────────────────────────────────────
     * Admin — one small page, because two values are all it takes
     * ────────────────────────────────────────────────────────────── */

    public static function menu() {
        add_menu_page('Mini-Talks Game', 'Mini-Talks Game', 'manage_options',
                      'mf-game', array(__CLASS__, 'page'), 'dashicons-games', 32);
    }

    public static function page() {
        if (!current_user_can('manage_options')) return;

        $saved = false;
        if (!empty($_POST['mf_game_nonce']) && wp_verify_nonce($_POST['mf_game_nonce'], 'mf_game')) {
            $api = isset($_POST['mf_game_api']) ? esc_url_raw(trim(wp_unslash($_POST['mf_game_api']))) : '';
            $key = isset($_POST['mf_game_key']) ? sanitize_text_field(wp_unslash($_POST['mf_game_key'])) : '';
            update_option(self::OPT, array('api' => untrailingslashit($api), 'key' => $key));
            $saved = true;
        }

        $s    = self::settings();
        $test = null;
        if ($saved && self::configured()) {
            // A deliberately impossible token: the answer proves the endpoint is
            // there and the key is accepted, without touching anybody's account.
            $test = self::call('link-confirm.php', array('token' => 'connection-test', 'forum_user_id' => 1));
        }
        ?>
        <div class="wrap">
          <h1>Mini-Talks Game</h1>

          <div class="notice notice-info inline" style="margin:14px 0;padding:10px 14px">
            <p style="margin:.4em 0"><strong>What this connects.</strong> A member opens their profile,
            goes to <em>App &amp; Studio</em>, and types the e-mail address they use in the game. The forum
            mails a confirmation link to that address; opening it connects the two profiles. No game
            password is ever typed into this site.</p>
            <p style="margin:.4em 0"><strong>Before it works</strong>, the four files in the plugin's
            <code>game-api/forum/</code> folder need to sit in the game's API as
            <code>minitalks-api/forum/</code>, with <code>config.php</code> carrying the same shared key
            you put below. Nothing else on the game side changes.</p>
            <p style="margin:.4em 0"><strong>Wording</strong> — every sentence a member reads, and the
            confirmation e-mail itself, is on the
            <a href="<?php echo esc_url(admin_url('admin.php?page=mf-design')); ?>">Design page</a> under
            <em>Game account</em>.</p>
          </div>

          <?php if ($saved): ?>
            <div class="notice notice-success is-dismissible"><p>Saved.</p></div>
          <?php endif; ?>
          <?php if ($test !== null): ?>
            <?php if (is_wp_error($test) && in_array($test->get_error_code(), array('mf_game_invalid', 'mf_game_refused'), true)): ?>
              <div class="notice notice-success"><p><strong>The game answered and accepted the key.</strong> Linking is ready.</p></div>
            <?php elseif (is_wp_error($test)): ?>
              <div class="notice notice-error"><p><?php echo esc_html($test->get_error_message()); ?></p></div>
            <?php else: ?>
              <div class="notice notice-success"><p>The game answered and accepted the key.</p></div>
            <?php endif; ?>
          <?php endif; ?>

          <form method="post">
            <?php wp_nonce_field('mf_game', 'mf_game_nonce'); ?>
            <table class="form-table" role="presentation">
              <tr>
                <th scope="row"><label for="mf_game_api">Game API address</label></th>
                <td>
                  <input name="mf_game_api" id="mf_game_api" type="url" class="regular-text code"
                         value="<?php echo esc_attr($s['api']); ?>"
                         placeholder="https://mini-talks.org/minitalks-api">
                  <p class="description">Where <code>minitalks-api</code> lives, with no trailing slash.
                     It must be https — the forum refuses to send the key over plain http.</p>
                </td>
              </tr>
              <tr>
                <th scope="row"><label for="mf_game_key">Shared key</label></th>
                <td>
                  <input name="mf_game_key" id="mf_game_key" type="text" class="regular-text code"
                         value="<?php echo esc_attr($s['key']); ?>" autocomplete="off">
                  <p class="description">The same string as <code>MF_FORUM_LINK_KEY</code> in the game's
                     <code>forum/config.php</code>. Treat it like a password.</p>
                </td>
              </tr>
            </table>
            <?php submit_button('Save and test'); ?>
          </form>

          <h2>Connected members</h2>
          <?php
          $linked = get_users(array('meta_key' => self::META_ID, 'fields' => array('ID', 'user_login'), 'number' => 200));
          if (empty($linked)) {
              echo '<p>Nobody has connected a game account yet.</p>';
          } else {
              echo '<table class="widefat striped"><thead><tr><th>Forum member</th><th>Game account</th><th>Role</th><th>Connected</th></tr></thead><tbody>';
              foreach ($linked as $u) {
                  $snap = get_user_meta($u->ID, self::META_SNAP, true);
                  $when = (int) get_user_meta($u->ID, self::META_WHEN, true);
                  echo '<tr><td>' . esc_html($u->user_login) . '</td>'
                     . '<td>' . esc_html(is_array($snap) && !empty($snap['name']) ? $snap['name'] : '#' . self::game_user_id($u->ID)) . '</td>'
                     . '<td>' . esc_html(self::role_label(get_user_meta($u->ID, self::META_ROLE, true))) . '</td>'
                     . '<td>' . esc_html($when ? date_i18n(get_option('date_format'), $when) : '—') . '</td></tr>';
              }
              echo '</tbody></table>';
          }
          ?>
        </div>
        <?php
    }
}

Mini_Forum_Game::init();
