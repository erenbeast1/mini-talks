<?php
/**
 * Mini-Forum Avatar System
 *
 * - Gender storage (mf_avatar_gender usermeta)
 * - Customization config (mf_avatar_config usermeta — JSON)
 * - Avatar PNG storage (mf_avatar_url usermeta)
 * - Version for cache-busting (mf_avatar_version usermeta)
 * - Helper: mf_avatar_html() — used by all templates
 * - AJAX: save / load / set-gender / reset
 *
 * Phase 1: backend + helpers + fallback. Editor (Phase 2) will POST here.
 */

if (!defined('ABSPATH')) exit;

class Mini_Forum_Avatar {

    const META_GENDER  = 'mf_avatar_gender';
    const META_CONFIG  = 'mf_avatar_config';
    const META_URL     = 'mf_avatar_url';
    const META_VERSION = 'mf_avatar_version';

    const ALLOWED_GENDERS = ['female', 'male', 'child'];

    /** @var string Fallback avatar URL — used when user has no custom avatar. */
    public static $default_avatar_url = 'https://mini-talks.org/wp-content/uploads/2026/04/7476b5816f4628ed55648a07eca5eb231b3fe5a4.png';

    public static function init() {
        // AJAX endpoints (logged-in users only)
        add_action('wp_ajax_mf_avatar_set_gender', [__CLASS__, 'ajax_set_gender']);
        add_action('wp_ajax_mf_avatar_get',        [__CLASS__, 'ajax_get']);
        add_action('wp_ajax_mf_avatar_save',       [__CLASS__, 'ajax_save']);
        add_action('wp_ajax_mf_avatar_reset',      [__CLASS__, 'ajax_reset']);
        // Admin-only debug endpoint
        add_action('wp_ajax_mf_avatar_debug_body_glb', [__CLASS__, 'ajax_debug_body_glb']);

        // Ensure upload dir exists on plugin load (cheap check)
        add_action('init', [__CLASS__, 'ensure_upload_dir']);
    }

    /* ──────────────────────────────────────────────────────────────────
     * Upload dir
     * ────────────────────────────────────────────────────────────────── */

    public static function get_upload_dir() {
        $up = wp_upload_dir();
        return [
            'path' => trailingslashit($up['basedir']) . 'mf-avatars',
            'url'  => trailingslashit($up['baseurl']) . 'mf-avatars',
        ];
    }

    public static function ensure_upload_dir() {
        $dir = self::get_upload_dir();
        if (!file_exists($dir['path'])) {
            wp_mkdir_p($dir['path']);
            // index.php (silence is golden)
            @file_put_contents($dir['path'] . '/index.php', '<?php // silence');
        }
    }

    /* ──────────────────────────────────────────────────────────────────
     * Public getters
     * ────────────────────────────────────────────────────────────────── */

    public static function get_gender($user_id) {
        $g = get_user_meta((int)$user_id, self::META_GENDER, true);
        return in_array($g, self::ALLOWED_GENDERS, true) ? $g : '';
    }

    public static function get_config($user_id) {
        $raw = get_user_meta((int)$user_id, self::META_CONFIG, true);
        if (!$raw) return null;
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : null;
    }

    public static function get_url($user_id) {
        $url = get_user_meta((int)$user_id, self::META_URL, true);
        return $url ?: '';
    }

    public static function get_version($user_id) {
        return (int) get_user_meta((int)$user_id, self::META_VERSION, true);
    }

    /* ──────────────────────────────────────────────────────────────────
     * Body GLB resolver — finds the LEGO body GLB whose filename has a
     * Vite-generated hash that changes on every build.
     *
     * Pattern: lego-figure-2glb-*.glb under the game site's /assets/.
     *
     * Strategy (in order, first match wins):
     *   1) Filesystem glob — fast & reliable when game and forum share a
     *      server. We try every plausible Plesk path.
     *   2) HTTP scrape of the game's index.html — works cross-server.
     *   3) Cached value from a previous successful resolve.
     *   4) Hardcoded default ('lego-figure-2glb.glb' — only matches if you
     *      manually copied a hash-less version to /models/).
     *
     * Result is cached in a transient for 1 hour. Bust the cache with
     * delete_transient('mf_body_glb_url').
     *
     * For debugging, set WP_DEBUG and check error_log; or visit
     * /wp-admin/admin-ajax.php?action=mf_avatar_debug_body_glb (admin only).
     * ────────────────────────────────────────────────────────────────── */

    public static function resolve_body_glb_url($force = false) {
        $forced = apply_filters('mf_avatar_body_glb_url', null);
        if ($forced) return $forced;

        if (!$force) {
            $cached = get_transient('mf_body_glb_url');
            if ($cached) return $cached;
        }

        $debug          = [];
        $game_origin    = apply_filters('mf_avatar_game_origin', 'https://mini-talks.com');
        $assets_path    = apply_filters('mf_avatar_assets_path', '/assets');
        $glb_pattern    = apply_filters('mf_avatar_body_glb_pattern', 'lego-figure-2glb-*.glb');
        $game_domain    = parse_url($game_origin, PHP_URL_HOST) ?: 'mini-talks.com';

        // ── Strategy 1: Filesystem glob (same-server) ──
        // Build a comprehensive candidate list. Plesk customer-ID setups put
        // each domain under /var/www/vhosts/{domain}_{rand} or similar — we
        // glob the parent vhosts dir for ANY folder starting with the domain.
        $base_dirs = [];

        // Direct guesses first (fastest if they hit)
        $base_dirs[] = "/var/www/vhosts/{$game_domain}/httpdocs/assets";
        $base_dirs[] = "/home/{$game_domain}/public_html/assets";

        // Wildcard-glob /var/www/vhosts/{domain}*  (catches Plesk customer-IDs)
        $vhost_parents = [
            '/var/www/vhosts',
            '/var/www',
            '/home',
            '/srv/users',
            '/var/sites',
        ];
        foreach ($vhost_parents as $parent) {
            if (!is_dir($parent)) continue;
            // Try domain* pattern
            $matches = glob("{$parent}/{$game_domain}*", GLOB_ONLYDIR);
            if (is_array($matches)) {
                foreach ($matches as $d) {
                    $base_dirs[] = "{$d}/httpdocs/assets";
                    $base_dirs[] = "{$d}/public_html/assets";
                    $base_dirs[] = "{$d}/assets";
                }
            }
        }

        // Walk up from forum's ABSPATH and look for game's httpdocs sibling
        // (e.g. /var/www/vhosts/{forum_id}/ ↑ /var/www/vhosts/ → glob {game_domain}*)
        $forum_root = realpath(ABSPATH);
        if ($forum_root) {
            for ($up = 1; $up <= 5; $up++) {
                $parent = dirname($forum_root, $up);
                if (!$parent || $parent === '/' || $parent === '\\') break;
                $matches = glob("{$parent}/{$game_domain}*", GLOB_ONLYDIR);
                if (is_array($matches)) {
                    foreach ($matches as $d) {
                        $base_dirs[] = "{$d}/httpdocs/assets";
                        $base_dirs[] = "{$d}/public_html/assets";
                    }
                }
            }
        }

        $base_dirs = apply_filters('mf_avatar_body_glb_search_dirs', $base_dirs);
        $base_dirs = array_values(array_unique($base_dirs));

        $debug['strategy_1_dirs_tried'] = $base_dirs;
        $debug['strategy_1_dirs_existing'] = [];
        $debug['strategy_1_pattern'] = $glb_pattern;

        foreach ($base_dirs as $dir) {
            if (!is_dir($dir)) continue;
            $debug['strategy_1_dirs_existing'][] = $dir;
            $matches = glob(trailingslashit($dir) . $glb_pattern);
            if (is_array($matches) && count($matches) > 0) {
                usort($matches, function ($a, $b) { return filemtime($b) - filemtime($a); });
                $filename = basename($matches[0]);
                $url = $game_origin . trailingslashit($assets_path) . $filename;

                set_transient('mf_body_glb_url', $url, HOUR_IN_SECONDS);
                update_option('mf_body_glb_url_last', $url, false);
                update_option('mf_body_glb_resolve_method', 'filesystem:' . $dir, false);
                update_option('mf_body_glb_resolve_debug', $debug, false);
                return $url;
            }
        }

        // ── Strategy 2: HTTP scrape ──
        // Try several pages — main, game routes — looking for the GLB hash
        // in either HTML or any inline JS / chunk URL the page references.
        $scrape_urls = apply_filters('mf_avatar_body_glb_scrape_urls', [
            $game_origin . '/',
            $game_origin . '/character-customization',
            $game_origin . '/scene-selection',
            $game_origin . '/game',
        ]);

        $debug['strategy_2_urls'] = [];

        foreach ($scrape_urls as $surl) {
            $resp = wp_remote_get($surl, ['timeout' => 5, 'sslverify' => true]);
            $code = is_wp_error($resp) ? ('WP_Error: ' . $resp->get_error_message())
                : wp_remote_retrieve_response_code($resp);
            $info = ['url' => $surl, 'code' => $code, 'matched' => false];

            if (!is_wp_error($resp) && wp_remote_retrieve_response_code($resp) === 200) {
                $body = wp_remote_retrieve_body($resp);

                // Direct match: lego-figure-2glb-{hash}.glb in the page
                if (preg_match('#(lego-figure-2glb-[A-Za-z0-9_\-]+\.glb)#', $body, $m)) {
                    $url = $game_origin . trailingslashit($assets_path) . $m[1];
                    $info['matched'] = $m[1];
                    $debug['strategy_2_urls'][] = $info;

                    set_transient('mf_body_glb_url', $url, HOUR_IN_SECONDS);
                    update_option('mf_body_glb_url_last', $url, false);
                    update_option('mf_body_glb_resolve_method', 'http_scrape:' . $surl, false);
                    update_option('mf_body_glb_resolve_debug', $debug, false);
                    return $url;
                }

                // Indirect match: Vite usually puts main JS chunk like /assets/index-{hash}.js
                // Fetch that JS and look for the GLB filename inside it.
                if (preg_match_all('#/assets/(index|main|app)[-_][A-Za-z0-9_\-]+\.js#', $body, $jsmatches)) {
                    foreach (array_unique($jsmatches[0]) as $js_path) {
                        $js_url = $game_origin . $js_path;
                        $js_resp = wp_remote_get($js_url, ['timeout' => 8, 'sslverify' => true]);
                        if (is_wp_error($js_resp) || wp_remote_retrieve_response_code($js_resp) !== 200) continue;
                        $js_body = wp_remote_retrieve_body($js_resp);
                        if (preg_match('#(lego-figure-2glb-[A-Za-z0-9_\-]+\.glb)#', $js_body, $m2)) {
                            $url = $game_origin . trailingslashit($assets_path) . $m2[1];
                            $info['matched'] = $m2[1];
                            $info['matched_in_js'] = $js_url;
                            $debug['strategy_2_urls'][] = $info;

                            set_transient('mf_body_glb_url', $url, HOUR_IN_SECONDS);
                            update_option('mf_body_glb_url_last', $url, false);
                            update_option('mf_body_glb_resolve_method', 'http_scrape_js:' . $js_url, false);
                            update_option('mf_body_glb_resolve_debug', $debug, false);
                            return $url;
                        }
                    }
                }
            }
            $debug['strategy_2_urls'][] = $info;
        }

        // ── Strategy 3: Last-known good ──
        $last = get_option('mf_body_glb_url_last');
        if ($last) {
            $debug['strategy_3_used_cache'] = $last;
            update_option('mf_body_glb_resolve_method', 'last_known_good', false);
            update_option('mf_body_glb_resolve_debug', $debug, false);
            return $last;
        }

        // ── Strategy 4: Hardcoded fallback ──
        $fallback = apply_filters('mf_avatar_body_glb_fallback',
            apply_filters('mf_avatar_glb_base', 'https://mini-talks.com/models') . '/lego-figure-2glb.glb');
        $debug['strategy_4_fallback'] = $fallback;
        update_option('mf_body_glb_resolve_method', 'fallback', false);
        update_option('mf_body_glb_resolve_debug', $debug, false);
        return $fallback;
    }

    /**
     * Resolve the avatar URL for any user, with full fallback chain.
     * Priority:
     *   1. Plugin's custom avatar (mf_avatar_url) + cache-bust version
     *   2. Gravatar (if user has one)
     *   3. Default Mini-Talks PNG
     */
    public static function resolve_url($user_id, $size = 96) {
        $user_id = (int) $user_id;
        if ($user_id <= 0) return self::$default_avatar_url;

        $custom = self::get_url($user_id);
        if ($custom) {
            $v = self::get_version($user_id);
            return $v ? add_query_arg('v', $v, $custom) : $custom;
        }

        $gravatar = get_avatar_url($user_id, ['size' => $size, 'default' => '404']);
        if ($gravatar && strpos($gravatar, 'gravatar.com/avatar/') !== false) {
            // Real gravatar (or initials) — use it
            return $gravatar;
        }

        return self::$default_avatar_url;
    }

    /* ──────────────────────────────────────────────────────────────────
     * Avatar HTML helper — main template integration point
     *
     * Usage in templates:
     *   echo mf_avatar_html($user_id, 'lg');   // 120x120
     *   echo mf_avatar_html($user_id, 'md');   // 60x60
     *   echo mf_avatar_html($user_id, 'sm');   // 30x30
     *   echo mf_avatar_html($user_id, 'xs');   // 24x24
     * ────────────────────────────────────────────────────────────────── */

    public static function html($user_id, $size = 'md', $extra_class = '') {
        $user_id = (int) $user_id;
        $sizes = [
            'xs' => 24,
            'sm' => 30,
            'md' => 54,
            'lg' => 120,
        ];
        $px = isset($sizes[$size]) ? $sizes[$size] : 54;
        $url = self::resolve_url($user_id, $px * 2); // 2x for retina
        $url = esc_url($url);
        $cls = 'mf-av mf-av-' . esc_attr($size);
        if ($extra_class) $cls .= ' ' . esc_attr($extra_class);

        $alt = esc_attr(mf_get_nickname($user_id) ?: 'User');

        return sprintf(
            '<img class="%s" src="%s" alt="%s" width="%d" height="%d" loading="lazy" decoding="async" />',
            $cls, $url, $alt, $px, $px
        );
    }

    /* ──────────────────────────────────────────────────────────────────
     * AJAX: set gender
     * ────────────────────────────────────────────────────────────────── */

    public static function ajax_set_gender() {
        check_ajax_referer('mf_nonce', 'nonce');
        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Not logged in'], 401);
        }
        $uid = get_current_user_id();
        $gender = isset($_POST['gender']) ? sanitize_text_field($_POST['gender']) : '';
        if (!in_array($gender, self::ALLOWED_GENDERS, true)) {
            wp_send_json_error(['message' => 'Invalid gender'], 400);
        }

        $previous = self::get_gender($uid);
        $reset_avatar = !empty($_POST['reset_avatar']) && $previous && $previous !== $gender;

        update_user_meta($uid, self::META_GENDER, $gender);

        if ($reset_avatar) {
            // Gender changed → invalidate previous customization
            self::delete_avatar_files($uid);
            delete_user_meta($uid, self::META_CONFIG);
            delete_user_meta($uid, self::META_URL);
            delete_user_meta($uid, self::META_VERSION);
        }

        wp_send_json_success([
            'gender' => $gender,
            'reset'  => $reset_avatar,
        ]);
    }

    /* ──────────────────────────────────────────────────────────────────
     * AJAX: get current state (used when popup opens)
     * ────────────────────────────────────────────────────────────────── */

    public static function ajax_get() {
        check_ajax_referer('mf_nonce', 'nonce');
        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Not logged in'], 401);
        }
        $uid = get_current_user_id();
        wp_send_json_success([
            'gender'  => self::get_gender($uid),
            'config'  => self::get_config($uid),
            'url'     => self::get_url($uid),
            'version' => self::get_version($uid),
        ]);
    }

    /* ──────────────────────────────────────────────────────────────────
     * AJAX: save (PNG screenshot + JSON config)
     *
     * POST:
     *   nonce
     *   config  — JSON string of customization
     *   image   — base64 data URL (PNG)
     * ────────────────────────────────────────────────────────────────── */

    public static function ajax_save() {
        check_ajax_referer('mf_nonce', 'nonce');
        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Not logged in'], 401);
        }
        $uid = get_current_user_id();

        // ── Config (required) ──
        $config_raw = isset($_POST['config']) ? wp_unslash($_POST['config']) : '';
        if (!$config_raw) {
            wp_send_json_error(['message' => 'Missing config'], 400);
        }
        $config = json_decode($config_raw, true);
        if (!is_array($config)) {
            wp_send_json_error(['message' => 'Invalid config JSON'], 400);
        }
        $config = self::sanitize_config($config);

        // Gender is no longer required to save an avatar (v3.00 removed gender
        // from the UI). We still store whatever gender already exists on the
        // user so older render paths keep working; for new users we just
        // default to 'male' (face fallback only — the actual visual is driven
        // by the saved config).
        $stored_gender = self::get_gender($uid);
        if (!$stored_gender) {
            $stored_gender = 'male';
            update_user_meta($uid, self::META_GENDER, 'male');
        }
        // Force config gender to stored value to keep legacy fields populated.
        $config['gender'] = $stored_gender;

        // ── Image (required) ──
        $img_raw = isset($_POST['image']) ? wp_unslash($_POST['image']) : '';
        if (!$img_raw || strpos($img_raw, 'data:image/png;base64,') !== 0) {
            wp_send_json_error(['message' => 'Invalid image'], 400);
        }
        $img_b64 = substr($img_raw, strlen('data:image/png;base64,'));
        $img_bin = base64_decode($img_b64, true);
        if ($img_bin === false || strlen($img_bin) < 100) {
            wp_send_json_error(['message' => 'Image decode failed'], 400);
        }
        // Hard cap: 2MB
        if (strlen($img_bin) > 2 * 1024 * 1024) {
            wp_send_json_error(['message' => 'Image too large'], 400);
        }

        // ── Persist file ──
        $dir = self::get_upload_dir();
        if (!file_exists($dir['path'])) wp_mkdir_p($dir['path']);

        $version = self::get_version($uid) + 1;
        $filename = sprintf('user_%d_v%d.png', $uid, $version);
        $filepath = trailingslashit($dir['path']) . $filename;
        $fileurl  = trailingslashit($dir['url'])  . $filename;

        $written = @file_put_contents($filepath, $img_bin);
        if ($written === false) {
            wp_send_json_error(['message' => 'File write failed'], 500);
        }

        // ── Cleanup old PNGs for this user (keep only the last 2 versions) ──
        self::cleanup_old_files($uid, $filename);

        // ── Save meta ──
        update_user_meta($uid, self::META_URL,     $fileurl);
        update_user_meta($uid, self::META_CONFIG,  wp_json_encode($config));
        update_user_meta($uid, self::META_VERSION, $version);

        wp_send_json_success([
            'url'     => $fileurl,
            'version' => $version,
            'config'  => $config,
        ]);
    }

    /* ──────────────────────────────────────────────────────────────────
     * AJAX: reset (delete avatar, keep gender)
     * ────────────────────────────────────────────────────────────────── */

    public static function ajax_reset() {
        check_ajax_referer('mf_nonce', 'nonce');
        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Not logged in'], 401);
        }
        $uid = get_current_user_id();
        self::delete_avatar_files($uid);
        delete_user_meta($uid, self::META_CONFIG);
        delete_user_meta($uid, self::META_URL);
        delete_user_meta($uid, self::META_VERSION);
        wp_send_json_success(['message' => 'Reset done']);
    }

    /* ──────────────────────────────────────────────────────────────────
     * Debug: body GLB resolver status (admin only)
     *
     * Visit: /wp-admin/admin-ajax.php?action=mf_avatar_debug_body_glb
     * Optional: &refresh=1 to bust the transient and re-resolve
     * ────────────────────────────────────────────────────────────────── */

    public static function ajax_debug_body_glb() {
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Admin only'], 403);
        }
        $force = !empty($_GET['refresh']) || !empty($_POST['refresh']);
        if ($force) delete_transient('mf_body_glb_url');

        $url = self::resolve_body_glb_url($force);
        wp_send_json_success([
            'resolved_url' => $url,
            'method'       => get_option('mf_body_glb_resolve_method', '(unknown)'),
            'cached_url'   => get_transient('mf_body_glb_url'),
            'last_known'   => get_option('mf_body_glb_url_last'),
            'debug'        => get_option('mf_body_glb_resolve_debug', []),
            'php_user'     => function_exists('posix_getpwuid') && function_exists('posix_geteuid')
                ? (posix_getpwuid(posix_geteuid())['name'] ?? '(unknown)')
                : '(posix not available)',
            'abspath'      => ABSPATH,
        ]);
    }

    /* ──────────────────────────────────────────────────────────────────
     * Internal helpers
     * ────────────────────────────────────────────────────────────────── */

    /**
     * Sanitize incoming config — only known keys, only sane types.
     */
    private static function sanitize_config($config) {
        $clean = [];
        // Strings
        $string_keys = ['gender', 'hairType', 'eyeColor', 'eyebrowColor', 'glassesColor', 'eyeModelName', 'mouthModelName'];
        foreach ($string_keys as $k) {
            if (isset($config[$k]) && is_string($config[$k])) {
                $clean[$k] = sanitize_text_field($config[$k]);
            }
        }
        // Ints
        $int_keys = ['hairColor', 'hairTextureIndex', 'eyeTextureIndex', 'glassesTextureIndex', 'mouthTextureIndex', 'facialHairTextureIndex'];
        foreach ($int_keys as $k) {
            if (isset($config[$k])) {
                $clean[$k] = (int) $config[$k];
            }
        }
        return $clean;
    }

    private static function delete_avatar_files($uid) {
        $dir = self::get_upload_dir();
        $glob = glob(trailingslashit($dir['path']) . 'user_' . (int)$uid . '_v*.png');
        if (is_array($glob)) {
            foreach ($glob as $f) @unlink($f);
        }
    }

    private static function cleanup_old_files($uid, $keep_filename) {
        $dir = self::get_upload_dir();
        $glob = glob(trailingslashit($dir['path']) . 'user_' . (int)$uid . '_v*.png');
        if (!is_array($glob)) return;
        // Sort by mtime desc, keep newest 2 (current + 1 backup), delete rest
        usort($glob, function ($a, $b) {
            return filemtime($b) - filemtime($a);
        });
        $i = 0;
        foreach ($glob as $f) {
            if (basename($f) === $keep_filename) continue;
            $i++;
            if ($i >= 1) @unlink($f); // keep only the kept one + maybe 1 if mtime ordering misses
        }
    }
}

Mini_Forum_Avatar::init();

/* ──────────────────────────────────────────────────────────────────────
 * Global helper functions — used by templates
 * ──────────────────────────────────────────────────────────────────── */

if (!function_exists('mf_avatar_html')) {
    /**
     * Returns avatar <img> tag for any user.
     * @param int    $user_id
     * @param string $size 'xs' | 'sm' | 'md' | 'lg'
     * @param string $extra_class optional extra CSS class
     */
    function mf_avatar_html($user_id, $size = 'md', $extra_class = '') {
        return Mini_Forum_Avatar::html($user_id, $size, $extra_class);
    }
}

if (!function_exists('mf_avatar_url')) {
    function mf_avatar_url($user_id, $size = 96) {
        return Mini_Forum_Avatar::resolve_url($user_id, $size);
    }
}

if (!function_exists('mf_user_gender')) {
    function mf_user_gender($user_id = 0) {
        if (!$user_id) $user_id = get_current_user_id();
        return Mini_Forum_Avatar::get_gender($user_id);
    }
}
