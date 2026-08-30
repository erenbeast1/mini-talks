<?php
/**
 * Plugin Name: Mini Devices — Mini-Kits
 * Description: Adds the Connected Mini-Kits shelf to the Mini-Forum profile. Kits connect over USB (WebSerial); recording stats sync to the profile and audio is downloaded as WAV. Fig-Talks is personalised in the profile and requested from the Mini-Talks team.
 * Version:     2.10.0
 * Author:      Mini-Talks
 * Text Domain: mini-devices
 */

if (!defined('ABSPATH')) exit;

define('MD_VER', '2.10.0');
define('MD_PATH', plugin_dir_path(__FILE__));

require_once MD_PATH . 'includes/class-md-figtalks.php';
define('MD_URL', plugin_dir_url(__FILE__));
define('MD_META', 'md_devices');          // usermeta anahtarı

/* ------------------------------------------------------------------ *
 *  Varsayılan veri yapısı
 * ------------------------------------------------------------------ *
 *  md_devices = [
 *    'F' => [
 *       'label'     => 'Fig-Talks',
 *       'last_sync' => 1786650000,
 *       'stats'     => ['total_s'=>0,'count'=>0,'longest_s'=>0,'last_ts'=>0],
 *       'slots'     => [ ['i'=>1,'name'=>'Anne','full'=>1,'len_ms'=>4200], ... ],
 *    ],
 *    'D' => [
 *       'cards' => [ '04A1B2' => ['name'=>'Kafe','stats'=>[...],'slots'=>[...]] ]
 *    ],
 *  ]
 * ------------------------------------------------------------------ */

function md_defaults() {
    return array('devices' => new stdClass());
}

function md_get_user_devices($user_id) {
    $raw = get_user_meta($user_id, MD_META, true);
    if (!$raw) return array();
    $d = json_decode($raw, true);
    return is_array($d) ? $d : array();
}

function md_save_user_devices($user_id, $data) {
    update_user_meta($user_id, MD_META, wp_json_encode($data));
}

/* ------------------------------------------------------------------ *
 *  REST
 * ------------------------------------------------------------------ */
add_action('rest_api_init', function () {

    register_rest_route('mini-devices/v1', '/data', array(
        'methods'             => 'GET',
        'permission_callback' => function () { return is_user_logged_in(); },
        'callback'            => function () {
            return rest_ensure_response(md_get_user_devices(get_current_user_id()));
        },
    ));

    // Cihazdan gelen senkronu kaydeder (istatistik + slot listesi)
    register_rest_route('mini-devices/v1', '/sync', array(
        'methods'             => 'POST',
        'permission_callback' => function () { return is_user_logged_in(); },
        'callback'            => 'md_rest_sync',
    ));

    // Slot / kart adını günceller
    register_rest_route('mini-devices/v1', '/name', array(
        'methods'             => 'POST',
        'permission_callback' => function () { return is_user_logged_in(); },
        'callback'            => 'md_rest_name',
    ));

    // Slot yuzleri: config + onizleme PNG'si (usermeta md_faces)
    register_rest_route('mini-devices/v1', '/faces', array(
        'methods'             => 'GET',
        'permission_callback' => function () { return is_user_logged_in(); },
        'callback'            => function () {
            $raw = get_user_meta(get_current_user_id(), 'md_faces', true);
            $d = $raw ? json_decode($raw, true) : array();
            return rest_ensure_response(is_array($d) ? $d : array());
        },
    ));

    register_rest_route('mini-devices/v1', '/faces', array(
        'methods'             => 'POST',
        'permission_callback' => function () { return is_user_logged_in(); },
        'callback'            => 'md_rest_face_save',
    ));

    // Cihazi bu profile baglamak icin gereken kimlik
    register_rest_route('mini-devices/v1', '/whoami', array(
        'methods'             => 'GET',
        'permission_callback' => function () { return is_user_logged_in(); },
        'callback'            => function () {
            $u = wp_get_current_user();
            return rest_ensure_response(array(
                'profile' => $u->ID,
                'owner'   => $u->display_name,
            ));
        },
    ));

    // Cihazı profilden kaldırır
    register_rest_route('mini-devices/v1', '/forget', array(
        'methods'             => 'POST',
        'permission_callback' => function () { return is_user_logged_in(); },
        'callback'            => 'md_rest_forget',
    ));
});

function md_rest_sync($req) {
    $uid  = get_current_user_id();
    $body = $req->get_json_params();

    $type = isset($body['dev']) ? sanitize_text_field($body['dev']) : '';
    if (!in_array($type, array('F', 'B', 'D'), true)) {
        return new WP_Error('md_bad_dev', 'Unknown device code', array('status' => 400));
    }

    // Cihaz kimligi: firmware v1.2+ uid gonderir. Yoksa tip koduyla geriye donuk calisir.
    $dev = !empty($body['uid']) ? sanitize_text_field($body['uid']) : $type;

    // Cihaz baska bir profile bagliysa yazma
    $bound = isset($body['profile']) ? intval($body['profile']) : 0;
    if ($bound && $bound !== $uid) {
        return new WP_Error('md_other_owner',
            'This kit is linked to another profile. Remove it there first.',
            array('status' => 409));
    }

    $all = md_get_user_devices($uid);
    if (!isset($all[$dev])) $all[$dev] = array();

    $all[$dev]['type']      = $type;
    $all[$dev]['uid']       = $dev;
    $all[$dev]['bound']     = $bound;
    $all[$dev]['fw']        = isset($body['fw']) ? sanitize_text_field($body['fw']) : '';
    $all[$dev]['last_sync'] = time();

    // istatistikler
    foreach (array('total_s', 'count', 'longest_s', 'last_ts') as $k) {
        if (isset($body[$k])) $all[$dev]['stats'][$k] = intval($body[$k]);
    }

    // slotlar — isimler korunur
    if (!empty($body['slots']) && is_array($body['slots'])) {
        $old = isset($all[$dev]['slots']) ? $all[$dev]['slots'] : array();
        $names = array();
        foreach ($old as $o) if (isset($o['i'])) $names[intval($o['i'])] = isset($o['name']) ? $o['name'] : '';
        $slots = array();
        foreach ($body['slots'] as $s) {
            $i = intval($s['i']);
            $slots[] = array(
                'i'      => $i,
                'full'   => !empty($s['full']) ? 1 : 0,
                'len_ms' => isset($s['len_ms']) ? intval($s['len_ms']) : 0,
                'name'   => isset($names[$i]) ? $names[$i] : '',
            );
        }
        $all[$dev]['slots'] = $slots;
    }

    // Version_D (firmware v2.3): sahne -> level/mini agaci
    if (!empty($body['scenes']) && is_array($body['scenes'])) {
        $scenes = array();
        foreach ($body['scenes'] as $sc) {
            if (empty($sc['mode'])) continue;
            $slots = array();
            if (!empty($sc['slots']) && is_array($sc['slots'])) {
                foreach ($sc['slots'] as $sl) {
                    $slots[] = array(
                        'l'      => intval($sl['l']),
                        'm'      => intval($sl['m']),
                        'len_ms' => isset($sl['len_ms']) ? intval($sl['len_ms']) : 0,
                        'demo'   => !empty($sl['demo']) ? 1 : 0,
                    );
                }
            }
            $entry = array('mode' => sanitize_text_field($sc['mode']), 'slots' => $slots);
            if (!empty($sc['stats']) && is_array($sc['stats'])) {
                foreach (array('total_s','count','longest_s','last_ts') as $k) {
                    $entry['stats'][$k] = isset($sc['stats'][$k]) ? intval($sc['stats'][$k]) : 0;
                }
            }
            $scenes[] = $entry;
        }
        $all[$dev]['scenes'] = $scenes;
    }

    // Version_D: RFID kart bazlı gruplar
    if (!empty($body['cards']) && is_array($body['cards'])) {
        $oldCards = isset($all[$dev]['cards']) ? $all[$dev]['cards'] : array();
        $cards = array();
        foreach ($body['cards'] as $c) {
            $uidc = sanitize_text_field($c['uid']);
            $cards[$uidc] = array(
                'name'   => isset($oldCards[$uidc]['name']) ? $oldCards[$uidc]['name'] : '',
                'stats'  => array(
                    'total_s'   => isset($c['total_s'])   ? intval($c['total_s'])   : 0,
                    'count'     => isset($c['count'])     ? intval($c['count'])     : 0,
                    'longest_s' => isset($c['longest_s']) ? intval($c['longest_s']) : 0,
                    'last_ts'   => isset($c['last_ts'])   ? intval($c['last_ts'])   : 0,
                ),
            );
        }
        $all[$dev]['cards'] = $cards;
    }

    md_save_user_devices($uid, $all);
    return rest_ensure_response(array('ok' => true, 'devices' => $all));
}

function md_rest_name($req) {
    $uid  = get_current_user_id();
    $body = $req->get_json_params();

    $dev  = sanitize_text_field($body['dev']);   // uid ya da tip kodu
    $name = sanitize_text_field($body['name']);
    $all  = md_get_user_devices($uid);
    if (!isset($all[$dev])) return new WP_Error('md_no_dev', 'Device not found', array('status' => 404));

    if (isset($body['slot'])) {
        $i = intval($body['slot']);
        foreach ($all[$dev]['slots'] as &$s) if (intval($s['i']) === $i) $s['name'] = $name;
        unset($s);
    } elseif (isset($body['card'])) {
        $c = sanitize_text_field($body['card']);
        if (isset($all[$dev]['cards'][$c])) $all[$dev]['cards'][$c]['name'] = $name;
    } elseif (isset($body['device_label'])) {
        $all[$dev]['label'] = $name;
    }

    md_save_user_devices($uid, $all);
    return rest_ensure_response(array('ok' => true));
}

function md_rest_forget($req) {
    $uid  = get_current_user_id();
    $body = $req->get_json_params();
    $dev  = sanitize_text_field($body['dev']);
    $all  = md_get_user_devices($uid);
    unset($all[$dev]);
    md_save_user_devices($uid, $all);
    return rest_ensure_response(array('ok' => true));
}

/* ------------------------------------------------------------------ *
 *  Varlıklar
 * ------------------------------------------------------------------ */
function md_enqueue_assets() {
    static $done = false;
    if ($done || is_admin()) return;
    $done = true;

    // filemtime, not MD_VER: a CDN or page cache otherwise keeps serving the
    // old asset after an in-place update.
    $dir   = plugin_dir_path(__FILE__) . 'assets/';
    $css_v = file_exists($dir . 'mini-devices.css')       ? filemtime($dir . 'mini-devices.css')       : MD_VER;
    $js_v  = file_exists($dir . 'mini-devices.js')        ? filemtime($dir . 'mini-devices.js')        : MD_VER;
    $fc_v  = file_exists($dir . 'mini-devices-faces.js')  ? filemtime($dir . 'mini-devices-faces.js')  : MD_VER;

    wp_enqueue_style('mini-devices', MD_URL . 'assets/mini-devices.css', array(), $css_v);
    wp_enqueue_script('mini-devices', MD_URL . 'assets/mini-devices.js', array(), $js_v, true);
    wp_enqueue_script('mini-devices-faces', MD_URL . 'assets/mini-devices-faces.js', array('mini-devices'), $fc_v, true);

    wp_localize_script('mini-devices', 'MD', array(
        'rest'  => esc_url_raw(rest_url('mini-devices/v1/')),
        'nonce' => wp_create_nonce('wp_rest'),
        'user'  => wp_get_current_user()->display_name,
        // Demo mode is a front-end preview for admins. It never writes to the
        // server, so the capability check is only about who is offered it.
        'admin' => current_user_can('manage_options') ? 1 : 0,
        // Product renders for the shelf cards. Filterable so the artwork can be
        // swapped without touching the plugin; the built-in SVG stands in if an
        // image is missing or fails to load.
        'icons' => apply_filters('md_kit_icons', array(
            'F' => 'https://mini-talks.org/wp-content/uploads/2026/03/13_fig_talks_3D.png',
            'B' => 'https://mini-talks.org/wp-content/uploads/2026/03/12_brick_talks_3D.png',
            'D' => 'https://mini-talks.org/wp-content/uploads/2026/03/35_mini_settings_3D-e1772742962173.png',
        )),
    ));
}

add_action('wp_enqueue_scripts', function () {
    if (is_admin()) return;

    // Signed-in members always get them (the profile shelf is theirs). Everyone
    // else only when the page carries the public preview.
    if (is_user_logged_in()) {
        md_enqueue_assets();
    } elseif (md_page_has_preview()) {
        md_enqueue_assets();
        md_enqueue_avatar_editor();   // the preview needs the real face designer
    }
});

/**
 * Enqueue Mini-Forum's avatar editor when it would not otherwise load.
 *
 * Mini-Forum gates the editor bundle behind is_user_logged_in(), so the public
 * preview has no face designer without this. Everything it localises works for
 * a logged-out visitor: get_config(0) returns null, mf_get_user_role(0) falls
 * back to 'Family'. Its dependencies (mf-avatar-script, mf-auth-script) are
 * enqueued unconditionally by Mini-Forum, so the handle resolves.
 */
function md_enqueue_avatar_editor() {
    if (!defined('MF_PATH') || !defined('MF_URL')) return;          // Mini-Forum absent
    if (!class_exists('Mini_Forum_Avatar')) return;
    if (wp_script_is('mf-avatar-editor', 'enqueued')) return;        // Mini-Forum did it

    $js  = MF_PATH . 'assets/avatar-editor/mf-avatar-editor.js';
    $css = MF_PATH . 'assets/avatar-editor/mf-avatar-editor.css';
    if (!file_exists($js)) return;

    if (file_exists($css)) {
        wp_enqueue_style('mf-avatar-editor-style', MF_URL . 'assets/avatar-editor/mf-avatar-editor.css',
                         array('mf-avatar-style'), filemtime($css));
    }
    wp_enqueue_script('mf-avatar-editor', MF_URL . 'assets/avatar-editor/mf-avatar-editor.js',
                      array('mf-avatar-script'), filemtime($js), true);

    $role = function_exists('mf_get_user_role') ? mf_get_user_role(0) : 'Family';

    wp_localize_script('mf-avatar-editor', 'mf_avatar_editor', array(
        'glb_base'       => rtrim(apply_filters('mf_avatar_glb_base', 'https://mini-talks.com/models'), '/'),
        'body_glb_url'   => Mini_Forum_Avatar::resolve_body_glb_url(),
        'role'           => $role,
        'torso_id'       => function_exists('mf_role_torso_id') ? mf_role_torso_id($role) : '',
        'initial_config' => null,
    ));
}

/** Does the current post embed [mini_kits_demo]? */
function md_page_has_preview() {
    $post = get_post();
    $hit  = $post && has_shortcode($post->post_content, 'mini_kits_demo');
    // Page builders keep content outside post_content; let a theme force it.
    return (bool) apply_filters('md_page_has_preview', $hit, $post);
}

/* ------------------------------------------------------------------ *
 *  Shortcode:  [connected_devices]
 * ------------------------------------------------------------------ */
add_shortcode('connected_devices', function () {
    if (!is_user_logged_in()) {
        return '<div class="md-wrap"><p class="md-empty">Sign in to see your Connected Mini-Kits.</p></div>';
    }

    $data = md_get_user_devices(get_current_user_id());

    ob_start(); ?>
    <div class="md-wrap" id="md-root"
         data-initial="<?php echo esc_attr(wp_json_encode($data)); ?>"
         data-figtalks="<?php echo esc_attr(wp_json_encode(MD_FigTalks::state(get_current_user_id()))); ?>">

        <header class="md-shelf-head">
            <h3 class="md-title">Connected Mini-Kits</h3>
            <p class="md-sub">Personalize, request, and manage the Mini-Kits connected to your Mini-Talks profile.</p>
            <button type="button" class="md-btn md-btn-primary" id="md-connect">
                <span class="md-stud-dot"></span> Connect a kit
            </button>
        </header>

        <p class="md-note" id="md-browser-note" hidden>
            This browser cannot talk to USB devices. Open the page in Chrome, Edge or Opera on a desktop computer.
        </p>

        <?php if (current_user_can('manage_options')): ?>
        <div class="md-demo-bar" id="md-demo-bar">
            <div class="md-demo-text">
                <strong>Admin preview</strong>
                <span>Fill the shelf with sample kits to walk through every screen without hardware. Nothing is saved.</span>
            </div>
            <button type="button" class="md-btn md-btn-ghost md-btn-sm" id="md-demo-toggle">Enter demo mode</button>
        </div>
        <?php endif; ?>

        <div class="md-status" id="md-status" hidden></div>

        <div class="md-shelf" id="md-shelf"></div>

        <p class="md-privacy">
            Audio recordings stay on the kit — they are never uploaded to the site. Only recording counts and durations are saved to your profile.
        </p>
    </div>
    <div id="md-modal-root"></div>
    <?php
    return ob_get_clean();
});

/* ------------------------------------------------------------------ *
 *  Shortcode:  [mini_kits_demo]
 *  A public, always-on preview of the Mini-Kits shelf for marketing and
 *  onboarding pages. Sample kits only — it never reads or writes a profile,
 *  so it is safe for logged-out visitors.
 *
 *    [mini_kits_demo]
 *    [mini_kits_demo kits="brick-talks"]
 *    [mini_kits_demo kits="fig-talks,brick-talks" title="Try it" intro="Open a kit…"]
 *
 *  kits accepts names (fig-talks, brick-talks, design-talks) or the internal
 *  codes (F, B, D). Unknown values are ignored.
 * ------------------------------------------------------------------ */

add_shortcode('mini_kits_demo', function ($atts) {
    // Page builders can hide the shortcode from has_shortcode(); enqueue again.
    md_enqueue_assets();
    if (!is_user_logged_in()) md_enqueue_avatar_editor();

    $a = shortcode_atts(array(
        'kits'  => '',
        'title' => 'Try a Mini-Kit',
        'intro' => 'This is exactly what you see on your profile once a kit is linked. Open one, name a recording, design a face — nothing is saved.',
    ), $atts, 'mini_kits_demo');

    // Accept kit names as well as the internal codes, so a page author can
    // write kits="brick-talks" instead of remembering that it is "B".
    $names = array(
        'fig-talks'     => 'F', 'figtalks'     => 'F', 'fig'     => 'F', 'f' => 'F',
        'brick-talks'   => 'B', 'bricktalks'   => 'B', 'brick'   => 'B', 'b' => 'B',
        // Former name, kept so any page already using it keeps working.
        'display-talks' => 'B', 'displaytalks' => 'B', 'display' => 'B',
        'design-talks'  => 'D', 'designtalks'  => 'D', 'design'  => 'D', 'd' => 'D',
    );
    $codes = array();
    foreach (explode(',', strtolower($a['kits'])) as $c) {
        $c = trim($c);
        if (isset($names[$c]) && !in_array($names[$c], $codes, true)) $codes[] = $names[$c];
    }

    ob_start(); ?>
    <div class="md-wrap md-preview" id="md-root"
         data-initial="{}"
         data-demo="1"
         data-kits="<?php echo esc_attr(implode(',', $codes)); ?>">

        <header class="md-shelf-head">
            <?php if ($a['title'] !== ''): ?>
                <h3 class="md-title"><?php echo esc_html($a['title']); ?></h3>
            <?php endif; ?>
            <?php if ($a['intro'] !== ''): ?>
                <p class="md-sub"><?php echo esc_html($a['intro']); ?></p>
            <?php endif; ?>
            <p class="md-preview-tag">Live preview</p>
        </header>

        <div class="md-status" id="md-status" hidden></div>

        <div class="md-shelf" id="md-shelf"></div>
    </div>
    <div id="md-modal-root"></div>
    <?php
    return ob_get_clean();
});

/* ------------------------------------------------------------------ *
 *  Mini-Forum profile — Mini-Kits panel
 *  Mini-Forum 3.06+ renders a Mini-Kits tab and fires this action inside
 *  its panel. That is the supported home for the kit shelf; the legacy
 *  output-injection below only runs when the action never fired, i.e. on
 *  an older Mini-Forum.
 * ------------------------------------------------------------------ */

function md_panel_rendered($set = false) {
    static $done = false;
    if ($set) $done = true;
    return $done;
}

add_action('mf_profile_kits_panel', function () {
    md_panel_rendered(true);
    echo '<div class="md-autoslot">' . do_shortcode('[connected_devices]') . '</div>';
});

/* ------------------------------------------------------------------ *
 *  Legacy fallback for Mini-Forum < 3.06
 *  That version has no Mini-Kits panel, so the shelf is appended to the
 *  profile output instead. Mini-Forum files are never modified.
 * ------------------------------------------------------------------ */

/** Hangi gorunumde eklensin? Varsayilan: ?view=profile */
function md_is_profile_view() {
    $view = isset($_GET['view']) ? sanitize_key($_GET['view']) : '';
    return apply_filters('md_is_profile_view', $view === 'profile', $view);
}

/** Forum kisa kodunun etiketini tahmin et (mf_*, mini_forum*, *forum*) */
function md_is_forum_tag($tag) {
    $tag = strtolower($tag);
    if (strpos($tag, 'connected_devices') !== false) return false;
    $hit = (strpos($tag, 'forum') !== false)
        || (strpos($tag, 'mf_') === 0)
        || (strpos($tag, 'mini_') === 0)
        || (strpos($tag, 'mini-') === 0);
    return apply_filters('md_is_forum_tag', $hit, $tag);
}

add_filter('do_shortcode_tag', function ($output, $tag) {
    static $done = false;

    if ($done) return $output;
    if (md_panel_rendered()) return $output;   // Mini-Forum 3.06+ placed it already
    if (!is_user_logged_in()) return $output;
    if (is_admin() || wp_doing_ajax()) return $output;
    if (!md_is_profile_view()) return $output;
    if (!md_is_forum_tag($tag)) return $output;
    if (strpos($output, 'md-root') !== false) return $output;   // zaten var

    $done  = true;
    $block = '<div class="md-autoslot">' . do_shortcode('[connected_devices]') . '</div>';

    // Tercih sirasi: (1) My Posts bolumunun ustu  (2) gri sekme alaninin alti  (3) sona ekle
    $anchor = '<div class="mf-profile-section">';
    $pos = strpos($output, $anchor);
    if ($pos !== false) {
        return substr($output, 0, $pos) . $block . substr($output, $pos);
    }

    $anchor2 = '<!-- My Posts -->';
    $pos = strpos($output, $anchor2);
    if ($pos !== false) {
        return substr($output, 0, $pos) . $block . substr($output, $pos);
    }

    return $output . $block;
}, 10, 2);

/**
 * Elle kontrol isteyenler icin:
 *   add_filter('md_is_forum_tag', '__return_false');           // otomatik ekleme kapali
 *   add_filter('md_is_profile_view', function () { return true; });  // her sayfada
 */

/**
 * Slot yuzu kaydeder: md_faces[dev][slot] = { config, url, updated }
 * Onizleme PNG'si mf-avatars klasorune yazilir (profil avatarina dokunulmaz).
 */
function md_rest_face_save($req) {
    $uid  = get_current_user_id();
    $body = $req->get_json_params();

    $dev  = isset($body['dev'])  ? sanitize_text_field($body['dev'])  : '';
    $slot = isset($body['slot']) ? intval($body['slot'])              : 0;
    if (!$dev || $slot < 1 || $slot > 10) {
        return new WP_Error('md_bad_slot', 'Invalid slot', array('status' => 400));
    }

    $raw = get_user_meta($uid, 'md_faces', true);
    $all = $raw ? json_decode($raw, true) : array();
    if (!is_array($all)) $all = array();
    if (!isset($all[$dev]) || !is_array($all[$dev])) $all[$dev] = array();

    $entry = array(
        'config'  => isset($body['config']) && is_array($body['config']) ? $body['config'] : null,
        'updated' => time(),
    );

    // Onizleme resmi (data URL) -> dosya
    if (!empty($body['image']) && strpos($body['image'], 'data:image') === 0) {
        $parts = explode(',', $body['image'], 2);
        if (count($parts) === 2) {
            $bin = base64_decode($parts[1]);
            if ($bin !== false) {
                $up  = wp_upload_dir();
                $dir = trailingslashit($up['basedir']) . 'mf-avatars';
                if (!file_exists($dir)) wp_mkdir_p($dir);
                $name = 'face_u' . $uid . '_' . sanitize_file_name($dev) . '_s' . $slot . '_' . time() . '.png';
                if (file_put_contents($dir . '/' . $name, $bin) !== false) {
                    $entry['url'] = trailingslashit($up['baseurl']) . 'mf-avatars/' . $name;
                }
            }
        }
    }
    if (empty($entry['url']) && isset($all[$dev][$slot]['url'])) {
        $entry['url'] = $all[$dev][$slot]['url'];
    }
    if (isset($body['name'])) $entry['name'] = sanitize_text_field($body['name']);

    $all[$dev][$slot] = $entry;
    update_user_meta($uid, 'md_faces', wp_json_encode($all));

    return rest_ensure_response(array('ok' => true, 'faces' => $all));
}
