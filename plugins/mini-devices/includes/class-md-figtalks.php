<?php
/**
 * Fig-Talks personalisation requests.
 *
 * Fig-Talks is made to order, so this is not a shop: a member personalises a
 * figure inside their profile and sends the design to the Mini-Talks team, who
 * contact them. Personalise → Submit Request → Team contacts.
 *
 * Storage
 *   usermeta  md_figtalks_design   the design being worked on {config, url, updated}
 *   CPT       md_fig_request       one post per request, author = the member
 *
 * A request is frozen once submitted. Changing the design afterwards starts a
 * new one (never rewrites a request the team may already be acting on).
 */

if (!defined('ABSPATH')) exit;

class MD_FigTalks {

    const CPT         = 'md_fig_request';
    const META_DESIGN = 'md_figtalks_design';

    /** Request lifecycle. Draft is the design before it is sent. */
    public static function statuses() {
        return array(
            'draft'       => 'Draft',
            'submitted'   => 'Request Submitted',
            'contacted'   => 'Contacted',
            'preparation' => 'In Preparation',
            'completed'   => 'Completed',
        );
    }

    public static function init() {
        add_action('init', array(__CLASS__, 'register_cpt'));
        add_action('rest_api_init', array(__CLASS__, 'register_routes'));
        add_action('md_figtalks_request_submitted', array(__CLASS__, 'mail_on_submit'), 10, 2);
        add_action('md_figtalks_status_changed', array(__CLASS__, 'mail_on_status'), 10, 3);
        if (is_admin()) {
            add_action('show_user_profile', array(__CLASS__, 'user_profile_field'));
            add_action('edit_user_profile', array(__CLASS__, 'user_profile_field'));
            add_filter('manage_' . self::CPT . '_posts_columns', array(__CLASS__, 'columns'));
            add_action('manage_' . self::CPT . '_posts_custom_column', array(__CLASS__, 'column'), 10, 2);
            add_action('add_meta_boxes', array(__CLASS__, 'meta_box'));
            add_action('save_post_' . self::CPT, array(__CLASS__, 'save_status'));
            add_action('restrict_manage_posts', array(__CLASS__, 'status_filter'));
            add_action('pre_get_posts', array(__CLASS__, 'apply_status_filter'));
        }
    }

    /* ── storage ────────────────────────────────────────────────────── */

    public static function register_cpt() {
        register_post_type(self::CPT, array(
            'labels' => array(
                'name'          => 'Fig-Talks Requests',
                'singular_name' => 'Fig-Talks Request',
                'menu_name'     => 'Fig-Talks Requests',
                'all_items'     => 'All Requests',
            ),
            'public'              => false,
            'show_ui'             => true,
            'show_in_menu'        => true,
            'menu_icon'           => 'dashicons-groups',
            'menu_position'       => 27,
            'supports'            => array('title', 'author'),
            'capability_type'     => 'post',
            'capabilities'        => array('create_posts' => 'do_not_allow'), // only members create these
            'map_meta_cap'        => true,
            'exclude_from_search' => true,
        ));
    }

    /**
     * The three choices the request form is about, pulled out of the editor's
     * config so the team can read them without opening the design.
     * Extra options (glasses, skin tone) slot in here as the editor grows.
     */
    public static function summarise($config) {
        $g = function ($k) use ($config) {
            return isset($config[$k]) && $config[$k] !== '' ? (string) $config[$k] : '';
        };
        $face = array_filter(array($g('eyeModelName'), $g('mouthModelName')));
        return apply_filters('md_figtalks_summary', array(
            'face'       => $face ? implode(' · ', $face) : '',
            'hairstyle'  => $g('hairType'),
            'hair_color' => $g('hairColor'),
        ), $config);
    }

    /** The member's current design, or null. */
    public static function get_design($uid) {
        $raw = get_user_meta($uid, self::META_DESIGN, true);
        $d   = $raw ? json_decode($raw, true) : null;
        return is_array($d) ? $d : null;
    }

    /** Newest request for a member, or null. */
    public static function latest_request($uid) {
        $q = get_posts(array(
            'post_type'   => self::CPT,
            'author'      => $uid,
            'numberposts' => 1,
            'orderby'     => 'date',
            'order'       => 'DESC',
            'post_status' => 'any',
        ));
        return $q ? self::to_array($q[0]) : null;
    }

    private static function to_array($post) {
        $status = get_post_meta($post->ID, '_md_status', true) ?: 'draft';
        $all    = self::statuses();
        return array(
            'id'         => $post->ID,
            'status'     => $status,
            'status_label' => isset($all[$status]) ? $all[$status] : $status,
            'created'    => get_post_time('U', true, $post),
            'submitted'  => (int) get_post_meta($post->ID, '_md_submitted_at', true),
            'face'       => get_post_meta($post->ID, '_md_face', true),
            'hairstyle'  => get_post_meta($post->ID, '_md_hairstyle', true),
            'hair_color' => get_post_meta($post->ID, '_md_hair_color', true),
            'image'      => get_post_meta($post->ID, '_md_image', true),
        );
    }

    /* ── REST ───────────────────────────────────────────────────────── */

    public static function register_routes() {
        $auth = function () { return is_user_logged_in(); };

        register_rest_route('mini-devices/v1', '/figtalks', array(
            'methods' => 'GET', 'permission_callback' => $auth,
            'callback' => function () { return rest_ensure_response(self::state(get_current_user_id())); },
        ));
        register_rest_route('mini-devices/v1', '/figtalks/design', array(
            'methods' => 'POST', 'permission_callback' => $auth,
            'callback' => array(__CLASS__, 'rest_save_design'),
        ));
        register_rest_route('mini-devices/v1', '/figtalks/request', array(
            'methods' => 'POST', 'permission_callback' => $auth,
            'callback' => array(__CLASS__, 'rest_submit'),
        ));
    }

    public static function state($uid) {
        $design = self::get_design($uid);
        $req    = self::latest_request($uid);
        return array(
            'design'   => $design,
            'request'  => $req,
            // A submitted request is frozen; designing again starts a new one.
            'editable' => !$req || $req['status'] === 'draft',
        );
    }

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
        self::sync_draft_post($uid, $entry);

        return rest_ensure_response(self::state($uid));
    }

    public static function rest_submit($req) {
        $uid   = get_current_user_id();
        $state = self::state($uid);

        if (empty($state['design'])) {
            return new WP_Error('md_no_design', 'Personalise your Fig-Talks before sending a request.', array('status' => 400));
        }
        if (!$state['editable']) {
            return new WP_Error('md_already_sent', 'That request has already been sent.', array('status' => 409));
        }

        $post_id = self::sync_draft_post($uid, $state['design']);
        if (!$post_id) return new WP_Error('md_no_post', 'The request could not be saved.', array('status' => 500));

        update_post_meta($post_id, '_md_status', 'submitted');
        update_post_meta($post_id, '_md_submitted_at', time());

        do_action('md_figtalks_request_submitted', $post_id, $uid);

        return rest_ensure_response(self::state($uid));
    }

    /**
     * Keep one draft post per member in step with the saved design. A submitted
     * request is never touched — the next design saved opens a fresh draft.
     */
    private static function sync_draft_post($uid, $design) {
        $user = get_userdata($uid);
        if (!$user) return 0;

        $latest = self::latest_request($uid);
        $id     = ($latest && $latest['status'] === 'draft') ? $latest['id'] : 0;

        $nick = function_exists('mf_get_nickname') ? mf_get_nickname($uid) : $user->display_name;
        $sum  = self::summarise($design['config']);

        $args = array(
            'post_type'   => self::CPT,
            'post_status' => 'publish',
            'post_author' => $uid,
            'post_title'  => sprintf('Fig-Talks — %s', $nick),
        );
        if ($id) { $args['ID'] = $id; $id = wp_update_post($args); }
        else     { $id = wp_insert_post($args); }
        if (!$id || is_wp_error($id)) return 0;

        update_post_meta($id, '_md_status',     get_post_meta($id, '_md_status', true) ?: 'draft');
        update_post_meta($id, '_md_user_name',  $nick);
        update_post_meta($id, '_md_user_email', $user->user_email);
        update_post_meta($id, '_md_face',       $sum['face']);
        update_post_meta($id, '_md_hairstyle',  $sum['hairstyle']);
        update_post_meta($id, '_md_hair_color', $sum['hair_color']);
        update_post_meta($id, '_md_config',     wp_json_encode($design['config']));
        if (!empty($design['url'])) update_post_meta($id, '_md_image', esc_url_raw($design['url']));

        return $id;
    }

    /** Preview PNG, kept beside the avatar renders. */
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

    /** Where team notifications go. Site admin unless a filter says otherwise. */
    public static function team_email() {
        return apply_filters('md_figtalks_admin_email', get_option('admin_email'));
    }

    private static function site_name() {
        return wp_specialchars_decode(get_option('blogname'), ENT_QUOTES);
    }

    /** Statuses worth telling the member about. Draft and Submitted are not:
     *  a draft is theirs, and Submitted already gets its own confirmation. */
    public static function notify_statuses() {
        return apply_filters('md_figtalks_notify_statuses',
            array('contacted', 'preparation', 'completed'));
    }

    private static function status_message($status) {
        $msg = array(
            'contacted'   => "A member of the Mini-Talks team has reached out about your Fig-Talks. " .
                             "If you have not seen anything, check your other mail folders.",
            'preparation' => "Your Fig-Talks is being prepared. We will let you know as soon as it is ready.",
            'completed'   => "Your Fig-Talks is ready. The team will be in touch about getting it to you.",
        );
        return isset($msg[$status]) ? $msg[$status] : '';
    }

    public static function mail_on_submit($post_id, $uid) {
        $user = get_userdata($uid);
        if (!$user) return;

        $site  = self::site_name();
        $nick  = get_post_meta($post_id, '_md_user_name', true);
        $bits  = array(
            'Face'        => get_post_meta($post_id, '_md_face', true),
            'Hairstyle'   => get_post_meta($post_id, '_md_hairstyle', true),
            'Hair colour' => get_post_meta($post_id, '_md_hair_color', true),
        );

        // Team
        $lines = array(
            'A member has sent a personalized Fig-Talks request.',
            '',
            'Member:  ' . $nick,
            'Email:   ' . $user->user_email,
        );
        foreach ($bits as $label => $v) $lines[] = str_pad($label . ':', 9) . ($v !== '' ? $v : '—');
        $img = get_post_meta($post_id, '_md_image', true);
        if ($img) { $lines[] = ''; $lines[] = 'Design:  ' . $img; }
        $lines[] = '';
        $lines[] = 'Open the request: ' . admin_url('post.php?post=' . $post_id . '&action=edit');

        $team = self::team_email();
        if ($team) {
            @wp_mail($team, sprintf('[%s] Fig-Talks request from %s', $site, $nick), implode("\n", $lines));
        }

        // Member — the same wording the profile shows, so nothing contradicts.
        $body = "Hi " . $nick . ",\n\n" .
                "Your personalized Fig-Talks design has been shared with the Mini-Talks team. " .
                "We’ll contact you about the next steps.\n\n" .
                "You can see your design any time under Connected Mini-Kits in your profile.\n\n" .
                "— " . $site;
        @wp_mail($user->user_email, sprintf('[%s] Your Fig-Talks request was received', $site), $body);
    }

    public static function mail_on_status($post_id, $status, $was) {
        if (!in_array($status, self::notify_statuses(), true)) return;

        $uid  = (int) get_post_field('post_author', $post_id);
        $user = get_userdata($uid);
        if (!$user) return;

        $all  = self::statuses();
        $site = self::site_name();
        $nick = get_post_meta($post_id, '_md_user_name', true);
        $note = self::status_message($status);

        $body = "Hi " . $nick . ",\n\n" .
                "Your Fig-Talks request is now: " . (isset($all[$status]) ? $all[$status] : $status) . ".\n\n" .
                ($note ? $note . "\n\n" : '') .
                "You can follow it under Connected Mini-Kits in your profile.\n\n" .
                "— " . $site;

        @wp_mail($user->user_email,
                 sprintf('[%s] Fig-Talks request update: %s', $site, isset($all[$status]) ? $all[$status] : $status),
                 $body);
    }

    /** Read-only status on the WordPress user profile, for whoever handles support. */
    public static function user_profile_field($user) {
        $req = self::latest_request($user->ID);
        echo '<h2>Fig-Talks</h2><table class="form-table"><tr><th>Request status</th><td>';
        if (!$req) {
            echo '<em>No request yet.</em>';
        } else {
            printf('<strong>%s</strong>', esc_html($req['status_label']));
            if ($req['submitted']) printf(' &middot; sent %s', esc_html(date_i18n('d M Y', $req['submitted'])));
            printf(' &nbsp; <a href="%s">Open request</a>',
                   esc_url(admin_url('post.php?post=' . $req['id'] . '&action=edit')));
            if (!empty($req['image'])) {
                printf('<br><img src="%s" alt="" style="margin-top:8px;width:90px;height:90px;object-fit:contain;background:#f6f6f6;border-radius:8px">',
                       esc_url($req['image']));
            }
        }
        echo '</td></tr></table>';
    }

    /* ── admin ──────────────────────────────────────────────────────── */

    public static function columns($cols) {
        return array(
            'cb'         => isset($cols['cb']) ? $cols['cb'] : '',
            'md_design'  => 'Design',
            'title'      => 'Request',
            'md_member'  => 'Member',
            'md_choices' => 'Face / Hairstyle / Hair colour',
            'md_status'  => 'Status',
            'date'       => 'Created',
        );
    }

    public static function column($col, $id) {
        if ($col === 'md_design') {
            $img = get_post_meta($id, '_md_image', true);
            echo $img
                ? '<img src="' . esc_url($img) . '" alt="" style="width:54px;height:54px;object-fit:contain;background:#f6f6f6;border-radius:8px">'
                : '<span style="color:#999">—</span>';
        } elseif ($col === 'md_member') {
            printf('%s<br><a href="mailto:%2$s" style="color:#666">%2$s</a>',
                esc_html(get_post_meta($id, '_md_user_name', true)),
                esc_attr(get_post_meta($id, '_md_user_email', true)));
        } elseif ($col === 'md_choices') {
            $bits = array_filter(array(
                get_post_meta($id, '_md_face', true),
                get_post_meta($id, '_md_hairstyle', true),
                get_post_meta($id, '_md_hair_color', true),
            ));
            echo $bits ? esc_html(implode(' / ', $bits)) : '<span style="color:#999">—</span>';
        } elseif ($col === 'md_status') {
            $all = self::statuses();
            $st  = get_post_meta($id, '_md_status', true) ?: 'draft';
            printf('<strong>%s</strong>', esc_html(isset($all[$st]) ? $all[$st] : $st));
        }
    }

    public static function meta_box() {
        add_meta_box('md_fig_status', 'Request', function ($post) {
            wp_nonce_field('md_fig_status', 'md_fig_status_nonce');
            $st  = get_post_meta($post->ID, '_md_status', true) ?: 'draft';
            $img = get_post_meta($post->ID, '_md_image', true);
            $cfg = get_post_meta($post->ID, '_md_config', true);
            echo '<p><label for="md_status"><strong>Status</strong></label><br>';
            echo '<select name="md_status" id="md_status" style="width:100%">';
            foreach (self::statuses() as $k => $label) {
                printf('<option value="%s"%s>%s</option>', esc_attr($k), selected($st, $k, false), esc_html($label));
            }
            echo '</select></p>';
            if ($img) {
                echo '<p><img src="' . esc_url($img) . '" alt="" style="max-width:100%;background:#f6f6f6;border-radius:10px"></p>';
            }
            $sub = (int) get_post_meta($post->ID, '_md_submitted_at', true);
            if ($sub) echo '<p><strong>Sent:</strong> ' . esc_html(date_i18n('d M Y H:i', $sub)) . '</p>';
            if ($cfg) {
                echo '<details><summary>Full design config</summary><pre style="white-space:pre-wrap;font-size:11px">'
                     . esc_html($cfg) . '</pre></details>';
            }
        }, self::CPT, 'side');
    }

    public static function save_status($post_id) {
        if (!isset($_POST['md_fig_status_nonce']) ||
            !wp_verify_nonce($_POST['md_fig_status_nonce'], 'md_fig_status')) return;
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
        if (!current_user_can('edit_post', $post_id)) return;
        if (!isset($_POST['md_status'])) return;

        $st = sanitize_key($_POST['md_status']);
        if (!isset(self::statuses()[$st])) return;

        $was = get_post_meta($post_id, '_md_status', true);
        if ($was === $st) return;

        update_post_meta($post_id, '_md_status', $st);
        do_action('md_figtalks_status_changed', $post_id, $st, $was);
    }

    public static function status_filter() {
        global $typenow;
        if ($typenow !== self::CPT) return;
        $cur = isset($_GET['md_status']) ? sanitize_key($_GET['md_status']) : '';
        echo '<select name="md_status"><option value="">All statuses</option>';
        foreach (self::statuses() as $k => $label) {
            printf('<option value="%s"%s>%s</option>', esc_attr($k), selected($cur, $k, false), esc_html($label));
        }
        echo '</select>';
    }

    public static function apply_status_filter($q) {
        if (!is_admin() || !$q->is_main_query()) return;
        if ($q->get('post_type') !== self::CPT) return;
        if (empty($_GET['md_status'])) return;
        $q->set('meta_query', array(array(
            'key'   => '_md_status',
            'value' => sanitize_key($_GET['md_status']),
        )));
    }
}

MD_FigTalks::init();
