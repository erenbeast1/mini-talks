<?php
/**
 * Mini-Kit requests.
 *
 * Every Mini-Kit is made to order, so none of them are sold: a member opens a
 * kit's own screen and asks for it. What differs is the step before the ask —
 * Mini-Designs picks scenes, Fig-Talks personalises a figure, the other two go
 * straight there. After that all four share one lifecycle:
 *
 *   (not requested) → Submitted → Contacted → Preparing → Ready to Connect
 *                     → Connected
 *
 * Draft sits before Submitted for kits with a pre-request step: the design
 * exists but has not been sent.
 *
 * The post type keeps its original md_fig_request slug so requests made before
 * the other kits existed are not orphaned; they carry _md_kit = fig-talks.
 */

if (!defined('ABSPATH')) exit;

class MD_Requests {

    const CPT         = 'md_fig_request';
    const META_DESIGN = 'md_figtalks_design';   // the Fig-Talks figure being worked on

    public static function statuses() {
        return array(
            'draft'     => 'Draft',
            'submitted' => 'Submitted',
            'contacted' => 'Contacted',
            'preparing' => 'Preparing',
            'ready'     => 'Ready to Connect',
            'connected' => 'Connected',
        );
    }

    public static function status_notes() {
        return array(
            'draft'     => 'Your design is still being personalized.',
            'submitted' => 'Your request has been shared with the Mini-Talks team.',
            'contacted' => 'Our team has contacted you about the next steps.',
            'preparing' => 'Your Mini-Kit is being prepared.',
            'ready'     => 'Your Mini-Kit is ready — connect it to your profile.',
            'connected' => 'This Mini-Kit is now connected to your profile.',
        );
    }

    /** The journey, for the progress rail. Draft reads as the work before sending. */
    public static function steps($kit_slug = '') {
        $kit   = MD_Kits::get($kit_slug);
        $first = ($kit && $kit['pre_request'] === 'personalize') ? 'Personalized'
               : (($kit && $kit['pre_request'] === 'catalogue') ? 'Selected' : 'Started');
        return array(
            array('key' => 'draft',     'label' => $first),
            array('key' => 'submitted', 'label' => 'Submitted'),
            array('key' => 'contacted', 'label' => 'Contacted'),
            array('key' => 'preparing', 'label' => 'Preparing'),
            array('key' => 'ready',     'label' => 'Ready to Connect'),
            array('key' => 'connected', 'label' => 'Connected'),
        );
    }

    /** Earlier builds used other keys. */
    private static function normalise($status) {
        $map = array('preparation' => 'preparing', 'completed' => 'connected',
                     'ready_to_connect' => 'ready');
        return isset($map[$status]) ? $map[$status] : $status;
    }

    public static function init() {
        add_action('init', array(__CLASS__, 'register_cpt'));
        add_action('rest_api_init', array(__CLASS__, 'register_routes'));
        add_action('md_kit_request_submitted', array(__CLASS__, 'mail_on_submit'), 10, 2);
        add_action('md_kit_status_changed', array(__CLASS__, 'mail_on_status'), 10, 3);
        if (is_admin()) {
            add_action('show_user_profile', array(__CLASS__, 'user_profile_field'));
            add_action('edit_user_profile', array(__CLASS__, 'user_profile_field'));
            add_filter('manage_' . self::CPT . '_posts_columns', array(__CLASS__, 'columns'));
            add_action('manage_' . self::CPT . '_posts_custom_column', array(__CLASS__, 'column'), 10, 2);
            add_action('add_meta_boxes', array(__CLASS__, 'meta_box'));
            add_action('save_post_' . self::CPT, array(__CLASS__, 'save_status'));
            add_action('restrict_manage_posts', array(__CLASS__, 'filters'));
            add_action('pre_get_posts', array(__CLASS__, 'apply_filters_'));
        }
    }

    public static function register_cpt() {
        register_post_type(self::CPT, array(
            'labels' => array(
                'name'          => 'Mini-Kit Requests',
                'singular_name' => 'Mini-Kit Request',
                'menu_name'     => 'Mini-Kit Requests',
                'all_items'     => 'All Requests',
            ),
            'public'              => false,
            'show_ui'             => true,
            'show_in_menu'        => true,
            'menu_icon'           => 'dashicons-groups',
            'menu_position'       => 27,
            'supports'            => array('title', 'author'),
            'capabilities'        => array('create_posts' => 'do_not_allow'),
            'map_meta_cap'        => true,
            'exclude_from_search' => true,
        ));
    }

    /* ── reading ────────────────────────────────────────────────────── */

    public static function get_design($uid) {
        $raw = get_user_meta($uid, self::META_DESIGN, true);
        $d   = $raw ? json_decode($raw, true) : null;
        return is_array($d) ? $d : null;
    }

    public static function latest_request($uid, $kit_slug) {
        $q = get_posts(array(
            'post_type'   => self::CPT,
            'author'      => $uid,
            'numberposts' => 1,
            'orderby'     => 'date',
            'order'       => 'DESC',
            'post_status' => 'any',
            'meta_query'  => array(array('key' => '_md_kit', 'value' => $kit_slug)),
        ));
        return $q ? self::to_array($q[0]) : null;
    }

    private static function to_array($post) {
        $status = self::normalise(get_post_meta($post->ID, '_md_status', true) ?: 'draft');
        $kit    = get_post_meta($post->ID, '_md_kit', true) ?: 'fig-talks';
        $all    = self::statuses();
        $notes  = self::status_notes();
        $ids    = get_post_meta($post->ID, '_md_designs', true);
        return array(
            'id'           => $post->ID,
            'kit'          => $kit,
            'status'       => $status,
            'status_label' => isset($all[$status]) ? $all[$status] : $status,
            'status_note'  => isset($notes[$status]) ? $notes[$status] : '',
            'steps'        => self::steps($kit),
            'note'         => get_post_meta($post->ID, '_md_note', true),
            'designs'      => is_array($ids) ? array_map('intval', $ids) : array(),
            'design_names' => is_array($ids) ? MD_Designs::names($ids) : array(),
            'submitted'    => (int) get_post_meta($post->ID, '_md_submitted_at', true),
            'image'        => get_post_meta($post->ID, '_md_image', true),
        );
    }

    /** Everything the profile needs, keyed by kit. */
    public static function state($uid) {
        $kits = array();
        foreach (MD_Kits::all() as $slug => $kit) {
            $req = self::latest_request($uid, $slug);
            $kits[$slug] = array(
                'request'  => $req,
                'editable' => !$req || $req['status'] === 'draft',
            );
        }
        return array(
            'kits'      => $kits,
            'design'    => self::get_design($uid),          // the Fig-Talks figure
            'catalogue' => MD_Designs::catalogue(),
        );
    }

    /* ── REST ───────────────────────────────────────────────────────── */

    public static function register_routes() {
        $auth = function () { return is_user_logged_in(); };

        register_rest_route('mini-devices/v1', '/kits', array(
            'methods' => 'GET', 'permission_callback' => $auth,
            'callback' => function () { return rest_ensure_response(self::state(get_current_user_id())); },
        ));
        register_rest_route('mini-devices/v1', '/kits/design', array(
            'methods' => 'POST', 'permission_callback' => $auth,
            'callback' => array(__CLASS__, 'rest_save_design'),
        ));
        register_rest_route('mini-devices/v1', '/kits/request', array(
            'methods' => 'POST', 'permission_callback' => $auth,
            'callback' => array(__CLASS__, 'rest_submit'),
        ));
    }

    /** Fig-Talks only: the figure, saved before any request is sent. */
    public static function rest_save_design($req) {
        $uid  = get_current_user_id();
        $body = $req->get_json_params();

        $config = isset($body['config']) && is_array($body['config']) ? $body['config'] : null;
        if (!$config) return new WP_Error('md_no_config', 'No design was received', array('status' => 400));

        $entry = array('config' => $config, 'updated' => time());
        if (!empty($body['image']) && strpos($body['image'], 'data:image') === 0) {
            $url = self::store_png($uid, $body['image']);
            if ($url) $entry['url'] = $url;
        }
        if (empty($entry['url'])) {
            $old = self::get_design($uid);
            if (!empty($old['url'])) $entry['url'] = $old['url'];
        }

        update_user_meta($uid, self::META_DESIGN, wp_json_encode($entry));
        self::sync_draft($uid, 'fig-talks', array('image' => isset($entry['url']) ? $entry['url'] : '',
                                                  'config' => $config));
        return rest_ensure_response(self::state($uid));
    }

    public static function rest_submit($req) {
        $uid  = get_current_user_id();
        $body = $req->get_json_params();
        $slug = isset($body['kit']) ? sanitize_key($body['kit']) : '';
        $kit  = MD_Kits::get($slug);
        if (!$kit) return new WP_Error('md_bad_kit', 'Unknown Mini-Kit', array('status' => 400));

        $existing = self::latest_request($uid, $slug);
        if ($existing && $existing['status'] !== 'draft') {
            return new WP_Error('md_already_sent', 'That request has already been sent.', array('status' => 409));
        }

        $extra = array('note' => isset($body['note']) ? sanitize_textarea_field($body['note']) : '');

        if ($kit['pre_request'] === 'catalogue') {
            $ids = MD_Designs::filter_selectable(isset($body['designs']) ? (array) $body['designs'] : array());
            if (!$ids) {
                return new WP_Error('md_no_designs', 'Choose at least one available Mini-Design.', array('status' => 400));
            }
            $extra['designs'] = $ids;
        }
        if ($kit['pre_request'] === 'personalize') {
            $design = self::get_design($uid);
            if (!$design) {
                return new WP_Error('md_no_design', 'Personalize your Fig-Talks before sending a request.', array('status' => 400));
            }
            $extra['image']  = isset($design['url']) ? $design['url'] : '';
            $extra['config'] = $design['config'];
        }

        $post_id = self::sync_draft($uid, $slug, $extra);
        if (!$post_id) return new WP_Error('md_no_post', 'The request could not be saved.', array('status' => 500));

        update_post_meta($post_id, '_md_status', 'submitted');
        update_post_meta($post_id, '_md_submitted_at', time());
        do_action('md_kit_request_submitted', $post_id, $uid);

        return rest_ensure_response(self::state($uid));
    }

    /** One draft per member per kit, kept in step. A sent request is never touched. */
    private static function sync_draft($uid, $slug, $extra = array()) {
        $user = get_userdata($uid);
        $kit  = MD_Kits::get($slug);
        if (!$user || !$kit) return 0;

        $latest = self::latest_request($uid, $slug);
        $id     = ($latest && $latest['status'] === 'draft') ? $latest['id'] : 0;

        $nick = function_exists('mf_get_nickname') ? mf_get_nickname($uid) : $user->display_name;
        $args = array(
            'post_type'   => self::CPT,
            'post_status' => 'publish',
            'post_author' => $uid,
            'post_title'  => sprintf('%s — %s', $kit['name'], $nick),
        );
        if ($id) { $args['ID'] = $id; $id = wp_update_post($args); }
        else     { $id = wp_insert_post($args); }
        if (!$id || is_wp_error($id)) return 0;

        update_post_meta($id, '_md_kit',        $slug);
        update_post_meta($id, '_md_status',     get_post_meta($id, '_md_status', true) ?: 'draft');
        update_post_meta($id, '_md_user_name',  $nick);
        update_post_meta($id, '_md_user_email', $user->user_email);
        if (isset($extra['note']))    update_post_meta($id, '_md_note', $extra['note']);
        if (!empty($extra['designs'])) update_post_meta($id, '_md_designs', $extra['designs']);
        if (!empty($extra['image']))   update_post_meta($id, '_md_image', esc_url_raw($extra['image']));
        if (!empty($extra['config'])) {
            update_post_meta($id, '_md_config', wp_json_encode($extra['config']));
            $sum = self::summarise($extra['config']);
            update_post_meta($id, '_md_face',       $sum['face']);
            update_post_meta($id, '_md_hairstyle',  $sum['hairstyle']);
            update_post_meta($id, '_md_hair_color', $sum['hair_color']);
        }
        return $id;
    }

    /**
     * Read the avatar editor's own config. The keys and value types come from
     * the editor bundle's save payload, not from guesswork:
     *
     *   hairCategory      string  "short" | "medium" | "long" | "tied" | "curly" | "fun" | "bun"
     *   hairTextureIndex  int     which hair model, 0 = none
     *   hairColor         int     index into the hair palette below
     *   eyeModelName      string  null while the member keeps the default face
     *   mouthModelName    string  null likewise
     *   eyeColor          string  hex
     *   eyebrowColor      string  hex
     *   glassesColor      string  hex, only meaningful with glasses on
     *
     * Reading a numeric index as if it were a label is how "Hair colour: 0"
     * ended up in the admin list, so every value is translated here.
     */

    /** The editor's hair palette, in its own order. */
    public static function hair_palette() {
        return array('#4D1F00', '#834400', '#E7CA63', '#000000', '#A8A8A8', '#F4F4F4', '#CC4422');
    }

    public static function hair_categories() {
        return array('short' => 'Short', 'medium' => 'Medium', 'long' => 'Long',
                     'tied' => 'Tied', 'curly' => 'Curly', 'fun' => 'Fun', 'bun' => 'Bun');
    }

    /** Every hex the editor's pickers can produce, named. */
    public static function colour_names() {
        return array(
            '#000000' => 'Black',       '#1C1C1C' => 'Black',
            '#4D1F00' => 'Dark brown',  '#5A3825' => 'Dark brown',
            '#6B3E26' => 'Brown',       '#834400' => 'Brown',
            '#8B5A2B' => 'Light brown', '#E7CA63' => 'Blond',
            '#A8A8A8' => 'Grey',        '#B0B0B0' => 'Grey',
            '#F4F4F4' => 'White',       '#CC4422' => 'Ginger',
            '#D62828' => 'Red',         '#274C9B' => 'Blue',
            '#4682B4' => 'Blue',        '#4E8B3A' => 'Green',
            '#2E7D32' => 'Green',       '#FF6F00' => 'Orange',
            '#EC4899' => 'Pink',        '#8E63C7' => 'Purple',
        );
    }

    /** "Black (#000000)" — the name for people, the hex for the workshop. */
    public static function colour_label($hex) {
        $hex = strtoupper(trim((string) $hex));
        if ($hex === '') return '';
        if ($hex[0] !== '#') $hex = '#' . $hex;
        $names = self::colour_names();
        return isset($names[$hex]) ? $names[$hex] . ' (' . $hex . ')' : $hex;
    }

    /** GLB file names into something readable: "mouth_smile_02" → "Smile 02"
     *  under the Mouth heading, which already says which slot it is. */
    public static function model_label($name, $slot = '') {
        $name = trim((string) $name);
        if ($name === '') return '';
        $name = preg_replace('/\.(glb|gltf)$/i', '', $name);
        $name = trim(str_replace(array('_', '-'), ' ', $name));
        $name = preg_replace('/\s+/', ' ', $name);
        if ($slot !== '') {
            $stripped = preg_replace('/^' . preg_quote($slot, '/') . '\s+/i', '', $name);
            if ($stripped !== '') $name = $stripped;
        }
        return $name === '' ? '' : ucfirst($name);
    }

    /** What the member chose, in words. */
    public static function summarise($config) {
        $config = (array) $config;
        $str = function ($k) use ($config) {
            return isset($config[$k]) && is_string($config[$k]) ? trim($config[$k]) : '';
        };
        $int = function ($k) use ($config) {
            return isset($config[$k]) && is_numeric($config[$k]) ? (int) $config[$k] : null;
        };

        /* Hair: category, which model, which colour. */
        $cats     = self::hair_categories();
        $cat      = $str('hairCategory');
        $texture  = $int('hairTextureIndex');
        $palette  = self::hair_palette();
        $ci       = $int('hairColor');
        $hair_hex = ($ci !== null && isset($palette[$ci])) ? $palette[$ci] : '';

        if ($texture === 0) {
            $hairstyle = 'No hair';
        } else {
            $bits = array();
            if ($cat !== '')     $bits[] = isset($cats[$cat]) ? $cats[$cat] : ucfirst($cat);
            if ($texture !== null) $bits[] = 'style ' . $texture;
            $hairstyle = $bits ? implode(' — ', $bits) : '';
        }
        // A colour under no hair tells the workshop nothing.
        $hair_colour = ($hair_hex !== '' && $texture !== 0) ? self::colour_label($hair_hex) : '';

        /* Face: the editor sends null for a slot the member left alone. */
        $eyes  = self::model_label($str('eyeModelName'), 'eyes');
        $mouth = self::model_label($str('mouthModelName'), 'mouth');
        $face  = trim(($eyes  !== '' ? 'Eyes: ' . $eyes   : 'Eyes: default') . ' · ' .
                      ($mouth !== '' ? 'Mouth: ' . $mouth : 'Mouth: default'));

        $glasses = (stripos($str('eyeModelName'), 'glasses') !== false)
                 ? self::colour_label($str('glassesColor')) : '';

        $lines = array(
            'Hair'           => trim($hairstyle . ($hair_colour !== '' ? ($hairstyle !== '' ? ', ' : '') . $hair_colour : '')),
            'Face'           => $face,
            'Eye colour'     => self::colour_label($str('eyeColor')),
            'Brows & lashes' => self::colour_label($str('eyebrowColor')),
            'Glasses'        => $glasses,
        );

        return apply_filters('md_figtalks_summary', array(
            'face'       => $face,
            'hairstyle'  => $hairstyle,
            'hair_color' => $hair_colour,
            'lines'      => $lines,
        ), $config);
    }

    private static function store_png($uid, $data_url) {
        $parts = explode(',', $data_url, 2);
        if (count($parts) !== 2) return '';
        $bin = base64_decode($parts[1]);
        if ($bin === false) return '';
        $up  = wp_upload_dir();
        $dir = trailingslashit($up['basedir']) . 'mf-avatars';
        if (!file_exists($dir)) wp_mkdir_p($dir);
        $name = 'figtalks_u' . (int) $uid . '_' . time() . '.png';
        if (file_put_contents($dir . '/' . $name, $bin) === false) return '';
        return trailingslashit($up['baseurl']) . 'mf-avatars/' . $name;
    }

    /* ── mail ───────────────────────────────────────────────────────── */

    public static function team_email() {
        return apply_filters('md_kit_admin_email',
               apply_filters('md_figtalks_admin_email', get_option('admin_email')));
    }

    private static function site_name() {
        return wp_specialchars_decode(get_option('blogname'), ENT_QUOTES);
    }

    /** Draft and Submitted raise no status mail: a draft is the member's own,
     *  and Submitted already has its own confirmation. */
    public static function notify_statuses() {
        return apply_filters('md_kit_notify_statuses', array('contacted', 'preparing', 'ready', 'connected'));
    }

    private static function status_message($status, $kit_name) {
        $msg = array(
            'contacted' => "Our team has contacted you about the next steps. " .
                           "If you have not seen anything, check your other mail folders.",
            'preparing' => "Your " . $kit_name . " is being prepared. We will let you know as soon as it is ready.",
            'ready'     => "Your " . $kit_name . " is ready. Open Mini-Kits on your profile and use Connect to link it to your account.",
            'connected' => "Your " . $kit_name . " is now connected to your profile.",
        );
        return isset($msg[$status]) ? $msg[$status] : '';
    }

    /** The lines that describe what was asked for, shared by mail and admin. */
    private static function detail_lines($post_id) {
        $kit  = MD_Kits::get(get_post_meta($post_id, '_md_kit', true)) ?: array('name' => 'Mini-Kit', 'pre_request' => '');
        $out  = array();
        if ($kit['pre_request'] === 'catalogue') {
            $names = MD_Designs::names(get_post_meta($post_id, '_md_designs', true));
            $out[] = 'Designs: ' . ($names ? implode(', ', $names) : '—');
        }
        if ($kit['pre_request'] === 'personalize') {
            // The config is the source of truth; the three metas are only kept
            // so requests saved before this read still say something.
            $cfg = json_decode((string) get_post_meta($post_id, '_md_config', true), true);
            if (is_array($cfg) && $cfg) {
                $sum = self::summarise($cfg);
                foreach ($sum['lines'] as $l => $v) {
                    if ($v === '' && $l === 'Glasses') continue; // no glasses, nothing to say
                    $out[] = $l . ': ' . ($v !== '' ? $v : '—');
                }
            } else {
                foreach (array('Face' => '_md_face', 'Hairstyle' => '_md_hairstyle', 'Hair colour' => '_md_hair_color') as $l => $k) {
                    $v = get_post_meta($post_id, $k, true);
                    $out[] = $l . ': ' . ($v !== '' ? $v : '—');
                }
            }
        }
        $note = get_post_meta($post_id, '_md_note', true);
        if ($note !== '') { $out[] = ''; $out[] = 'Note from the member:'; $out[] = $note; }
        return $out;
    }

    public static function mail_on_submit($post_id, $uid) {
        $user = get_userdata($uid);
        if (!$user) return;
        $kit  = MD_Kits::get(get_post_meta($post_id, '_md_kit', true)) ?: array('name' => 'Mini-Kit');
        $site = self::site_name();
        $nick = get_post_meta($post_id, '_md_user_name', true);

        $lines = array_merge(array(
            'A member has requested a ' . $kit['name'] . '.',
            '',
            'Member: ' . $nick,
            'Email:  ' . $user->user_email,
            '',
        ), self::detail_lines($post_id));

        $img = get_post_meta($post_id, '_md_image', true);
        if ($img) { $lines[] = ''; $lines[] = 'Design: ' . $img; }
        $lines[] = '';
        $lines[] = 'Open the request: ' . admin_url('post.php?post=' . $post_id . '&action=edit');

        $team = self::team_email();
        if ($team) {
            @wp_mail($team, sprintf('[%s] %s request from %s', $site, $kit['name'], $nick), implode("\n", $lines));
        }

        $body = "Hi " . $nick . ",\n\n" .
                "Your " . $kit['name'] . " request has been shared with the Mini-Talks team. " .
                "We’ll contact you about the next steps.\n\n" .
                "You can follow it under Mini-Kits in your profile.\n\n" .
                "— " . $site;
        @wp_mail($user->user_email, sprintf('[%s] Your %s request was received', $site, $kit['name']), $body);
    }

    public static function mail_on_status($post_id, $status, $was) {
        if (!in_array($status, self::notify_statuses(), true)) return;
        $uid  = (int) get_post_field('post_author', $post_id);
        $user = get_userdata($uid);
        if (!$user) return;

        $kit  = MD_Kits::get(get_post_meta($post_id, '_md_kit', true)) ?: array('name' => 'Mini-Kit');
        $all  = self::statuses();
        $site = self::site_name();
        $nick = get_post_meta($post_id, '_md_user_name', true);
        $note = self::status_message($status, $kit['name']);
        $label = isset($all[$status]) ? $all[$status] : $status;

        $body = "Hi " . $nick . ",\n\n" .
                "Your " . $kit['name'] . " request is now: " . $label . ".\n\n" .
                ($note ? $note . "\n\n" : '') .
                "You can follow it under Mini-Kits in your profile.\n\n" .
                "— " . $site;

        @wp_mail($user->user_email, sprintf('[%s] %s request update: %s', $site, $kit['name'], $label), $body);
    }

    /* ── admin ──────────────────────────────────────────────────────── */

    public static function user_profile_field($user) {
        echo '<h2>Mini-Kits</h2><table class="form-table">';
        foreach (MD_Kits::all() as $slug => $kit) {
            $req = self::latest_request($user->ID, $slug);
            printf('<tr><th>%s</th><td>', esc_html($kit['name']));
            if (!$req) {
                echo '<em>No request yet.</em>';
            } else {
                printf('<strong>%s</strong>', esc_html($req['status_label']));
                if ($req['submitted']) printf(' &middot; sent %s', esc_html(date_i18n('d M Y', $req['submitted'])));
                printf(' &nbsp; <a href="%s">Open request</a>',
                       esc_url(admin_url('post.php?post=' . $req['id'] . '&action=edit')));
            }
            echo '</td></tr>';
        }
        echo '</table>';
    }

    public static function columns($cols) {
        return array(
            'cb'         => isset($cols['cb']) ? $cols['cb'] : '',
            'md_kit'     => 'Mini-Kit',
            'title'      => 'Request',
            'md_member'  => 'Member',
            'md_detail'  => 'What was asked for',
            'md_status'  => 'Status',
            'date'       => 'Created',
        );
    }

    public static function column($col, $id) {
        if ($col === 'md_kit') {
            $kit = MD_Kits::get(get_post_meta($id, '_md_kit', true));
            $img = get_post_meta($id, '_md_image', true);
            printf('<strong>%s</strong>', esc_html($kit ? $kit['name'] : '—'));
            if ($img) printf('<br><img src="%s" alt="" style="margin-top:6px;width:48px;height:48px;object-fit:contain;background:#f6f6f6;border-radius:8px">', esc_url($img));
        } elseif ($col === 'md_member') {
            printf('%s<br><a href="mailto:%2$s" style="color:#666">%2$s</a>',
                esc_html(get_post_meta($id, '_md_user_name', true)),
                esc_attr(get_post_meta($id, '_md_user_email', true)));
        } elseif ($col === 'md_detail') {
            $lines = self::detail_lines($id);
            echo $lines ? nl2br(esc_html(implode("\n", array_filter($lines)))) : '<span style="color:#999">—</span>';
        } elseif ($col === 'md_status') {
            $all = self::statuses();
            $st  = self::normalise(get_post_meta($id, '_md_status', true) ?: 'draft');
            printf('<strong>%s</strong>', esc_html(isset($all[$st]) ? $all[$st] : $st));
        }
    }

    public static function meta_box() {
        add_meta_box('md_kit_status', 'Request', function ($post) {
            wp_nonce_field('md_kit_status', 'md_kit_status_nonce');
            $st  = self::normalise(get_post_meta($post->ID, '_md_status', true) ?: 'draft');
            $kit = MD_Kits::get(get_post_meta($post->ID, '_md_kit', true));
            if ($kit) printf('<p><strong>%s</strong></p>', esc_html($kit['name']));
            echo '<p><label for="md_status"><strong>Status</strong></label><br>';
            echo '<select name="md_status" id="md_status" style="width:100%">';
            foreach (self::statuses() as $k => $label) {
                printf('<option value="%s"%s>%s</option>', esc_attr($k), selected($st, $k, false), esc_html($label));
            }
            echo '</select></p>';
            $img = get_post_meta($post->ID, '_md_image', true);
            if ($img) echo '<p><img src="' . esc_url($img) . '" alt="" style="max-width:100%;background:#f6f6f6;border-radius:10px"></p>';
            $lines = self::detail_lines($post->ID);
            if ($lines) echo '<p style="white-space:pre-wrap">' . esc_html(implode("\n", $lines)) . '</p>';
            $sub = (int) get_post_meta($post->ID, '_md_submitted_at', true);
            if ($sub) echo '<p><strong>Sent:</strong> ' . esc_html(date_i18n('d M Y H:i', $sub)) . '</p>';
        }, self::CPT, 'side');
    }

    public static function save_status($post_id) {
        if (!isset($_POST['md_kit_status_nonce']) ||
            !wp_verify_nonce($_POST['md_kit_status_nonce'], 'md_kit_status')) return;
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
        if (!current_user_can('edit_post', $post_id)) return;
        if (!isset($_POST['md_status'])) return;

        $st  = self::normalise(sanitize_key($_POST['md_status']));
        if (!isset(self::statuses()[$st])) return;
        $was = self::normalise(get_post_meta($post_id, '_md_status', true));
        if ($was === $st) return;

        update_post_meta($post_id, '_md_status', $st);
        do_action('md_kit_status_changed', $post_id, $st, $was);
    }

    public static function filters() {
        global $typenow;
        if ($typenow !== self::CPT) return;
        $cur = isset($_GET['md_status']) ? sanitize_key($_GET['md_status']) : '';
        echo '<select name="md_status"><option value="">All statuses</option>';
        foreach (self::statuses() as $k => $label) {
            printf('<option value="%s"%s>%s</option>', esc_attr($k), selected($cur, $k, false), esc_html($label));
        }
        echo '</select>';
        $ck = isset($_GET['md_kit']) ? sanitize_key($_GET['md_kit']) : '';
        echo '<select name="md_kit"><option value="">All Mini-Kits</option>';
        foreach (MD_Kits::all() as $slug => $kit) {
            printf('<option value="%s"%s>%s</option>', esc_attr($slug), selected($ck, $slug, false), esc_html($kit['name']));
        }
        echo '</select>';
    }

    public static function apply_filters_($q) {
        if (!is_admin() || !$q->is_main_query()) return;
        if ($q->get('post_type') !== self::CPT) return;
        $meta = array();
        if (!empty($_GET['md_status'])) $meta[] = array('key' => '_md_status', 'value' => sanitize_key($_GET['md_status']));
        if (!empty($_GET['md_kit']))    $meta[] = array('key' => '_md_kit',    'value' => sanitize_key($_GET['md_kit']));
        if ($meta) $q->set('meta_query', $meta);
    }
}

MD_Requests::init();
