<?php
/**
 * Plugin Name: Mini-Forum
 * Description: A calm, safe community forum for the Mini-Talks ecosystem.
 * Version: 3.06.00
 * Author: Mini-Talks
 * Text Domain: mini-forum
 */

if (!defined('ABSPATH')) exit;

define('MF_VERSION', '3.06.00');
define('MF_PATH', plugin_dir_path(__FILE__));
define('MF_URL', plugin_dir_url(__FILE__));

/* ── Includes ── */
require_once MF_PATH . 'includes/class-mini-forum-cpt.php';
require_once MF_PATH . 'includes/class-mini-forum-ajax.php';
require_once MF_PATH . 'includes/class-mini-forum-shortcodes.php';
require_once MF_PATH . 'includes/class-mini-forum-avatar.php';
if (is_admin()) {
    require_once MF_PATH . 'includes/class-mini-forum-admin.php';
}

/* ── Activation ── */
register_activation_hook(__FILE__, 'mf_activate');
function mf_activate() {
    Mini_Forum_CPT::register();
    mf_create_tables();
    flush_rewrite_rules();
    // Add custom roles
    add_role('mini_family',    'Mini-Family',    ['read' => true]);
    add_role('mini_expert',    'Mini-Expert',    ['read' => true]);
    add_role('mini_volunteer', 'Mini-Volunteer', ['read' => true]);
    add_role('talk_spot',      'Talk-Spot',      ['read' => true]);
}

function mf_create_tables() {
    global $wpdb;
    $charset = $wpdb->get_charset_collate();

    // Forum replies table
    $table_replies = $wpdb->prefix . 'mf_replies';
    $sql_replies = "CREATE TABLE $table_replies (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        post_id bigint(20) unsigned NOT NULL,
        user_id bigint(20) unsigned NOT NULL,
        parent_id bigint(20) unsigned DEFAULT 0,
        content text NOT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        status varchar(20) DEFAULT 'approved',
        PRIMARY KEY (id),
        KEY post_id (post_id),
        KEY user_id (user_id),
        KEY parent_id (parent_id)
    ) $charset;";

    // Reactions table
    $table_reactions = $wpdb->prefix . 'mf_reactions';
    $sql_reactions = "CREATE TABLE $table_reactions (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        reply_id bigint(20) unsigned NOT NULL,
        user_id bigint(20) unsigned NOT NULL,
        emoji varchar(10) NOT NULL DEFAULT '❤️',
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY reply_user_emoji (reply_id, user_id, emoji),
        KEY reply_id (reply_id)
    ) $charset;";

    // Notifications table
    $table_notif = $wpdb->prefix . 'mf_notifications';
    $sql_notif = "CREATE TABLE $table_notif (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint(20) unsigned NOT NULL,
        type varchar(50) NOT NULL,
        message text NOT NULL,
        ref_id bigint(20) unsigned DEFAULT NULL,
        is_read tinyint(1) DEFAULT 0,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY user_id (user_id)
    ) $charset;";

    // Events table
    $table_events = $wpdb->prefix . 'mf_events';
    $sql_events = "CREATE TABLE $table_events (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        title varchar(255) NOT NULL,
        slug varchar(255) NOT NULL,
        event_type varchar(30) NOT NULL DEFAULT 'workshop',
        short_description varchar(500) DEFAULT NULL,
        description longtext DEFAULT NULL,
        location_name varchar(255) DEFAULT NULL,
        city varchar(100) DEFAULT NULL,
        format_type varchar(30) DEFAULT NULL,
        start_datetime datetime NOT NULL,
        end_datetime datetime DEFAULT NULL,
        status varchar(20) NOT NULL DEFAULT 'published',
        host_user_id bigint(20) unsigned DEFAULT NULL,
        cover_image_url varchar(500) DEFAULT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY slug (slug),
        KEY event_type (event_type),
        KEY start_datetime (start_datetime),
        KEY status (status),
        KEY city (city)
    ) $charset;";

    // Event participants
    $table_participants = $wpdb->prefix . 'mf_event_participants';
    $sql_participants = "CREATE TABLE $table_participants (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        event_id bigint(20) unsigned NOT NULL,
        user_id bigint(20) unsigned NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'joined',
        joined_at datetime DEFAULT CURRENT_TIMESTAMP,
        left_at datetime DEFAULT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY event_user (event_id, user_id),
        KEY event_id (event_id),
        KEY user_id (user_id)
    ) $charset;";

    // Community updates
    $table_updates = $wpdb->prefix . 'mf_community_updates';
    $sql_updates = "CREATE TABLE $table_updates (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint(20) unsigned DEFAULT NULL,
        nickname varchar(100) DEFAULT NULL,
        role varchar(30) DEFAULT 'Family',
        message text NOT NULL,
        update_type varchar(30) DEFAULT 'general',
        related_event_id bigint(20) unsigned DEFAULT NULL,
        visible_date datetime DEFAULT CURRENT_TIMESTAMP,
        status varchar(20) NOT NULL DEFAULT 'published',
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY visible_date (visible_date),
        KEY status (status),
        KEY user_id (user_id)
    ) $charset;";

    // Special days
    $table_sd = $wpdb->prefix . 'mf_special_days';
    $sql_sd = "CREATE TABLE $table_sd (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        title varchar(255) NOT NULL,
        description text DEFAULT NULL,
        day_date date NOT NULL,
        month_number tinyint(2) NOT NULL,
        accent_color varchar(20) DEFAULT 'blue',
        related_event_id bigint(20) unsigned DEFAULT NULL,
        images longtext DEFAULT NULL,
        status varchar(20) NOT NULL DEFAULT 'published',
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY day_date (day_date),
        KEY month_number (month_number)
    ) $charset;";

    // Host event requests
    $table_her = $wpdb->prefix . 'mf_host_event_requests';
    $sql_her = "CREATE TABLE $table_her (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        user_id bigint(20) unsigned DEFAULT NULL,
        requester_role varchar(30) DEFAULT NULL,
        event_type varchar(30) NOT NULL DEFAULT 'meetup',
        full_name varchar(255) NOT NULL,
        email varchar(255) NOT NULL,
        location_name varchar(255) DEFAULT NULL,
        city varchar(100) DEFAULT NULL,
        preferred_date date DEFAULT NULL,
        proposal_text text NOT NULL,
        venue_type varchar(50) DEFAULT NULL,
        space_notes text DEFAULT NULL,
        status varchar(20) NOT NULL DEFAULT 'new',
        admin_notes text DEFAULT NULL,
        public_notes text DEFAULT NULL,
        converted_event_id bigint(20) unsigned DEFAULT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY status (status),
        KEY user_id (user_id),
        KEY email (email)
    ) $charset;";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql_replies);
    dbDelta($sql_notif);
    dbDelta($sql_reactions);
    dbDelta($sql_events);
    dbDelta($sql_participants);
    dbDelta($sql_updates);
    dbDelta($sql_sd);
    dbDelta($sql_her);

    // Add parent_id column to existing replies table if missing
    $cols = $wpdb->get_col("SHOW COLUMNS FROM $table_replies");
    if (!in_array('parent_id', $cols)) {
        $wpdb->query("ALTER TABLE $table_replies ADD COLUMN parent_id bigint(20) unsigned DEFAULT 0 AFTER user_id");
        $wpdb->query("ALTER TABLE $table_replies ADD KEY parent_id (parent_id)");
    }

    // Add images column to mf_special_days if missing
    $sd_cols = $wpdb->get_col("SHOW COLUMNS FROM $table_sd");
    if (!in_array('images', $sd_cols)) {
        $wpdb->query("ALTER TABLE $table_sd ADD COLUMN images longtext DEFAULT NULL AFTER related_event_id");
    }

    // Add gallery_images to mf_events (post-event photo gallery)
    $ev_cols = $wpdb->get_col("SHOW COLUMNS FROM $table_events");
    if (!in_array('gallery_images', $ev_cols)) {
        $wpdb->query("ALTER TABLE $table_events ADD COLUMN gallery_images longtext DEFAULT NULL AFTER cover_image_url");
    }

    // Seed sample data once
    mf_seed_events_sample_data();
}

/**
 * Run migrations on every admin page load if version mismatch (catches plugin updates without re-activation).
 * Also auto-completes past events.
 */
add_action('admin_init', function(){
    global $wpdb;

    // Migration: add images column to mf_special_days if missing
    $installed = get_option('mf_db_version', '0.0.0');
    if (version_compare($installed, MF_VERSION, '<')) {
        $table_sd = $wpdb->prefix . 'mf_special_days';
        $sd_cols  = $wpdb->get_col("SHOW COLUMNS FROM $table_sd");
        if ($sd_cols && !in_array('images', $sd_cols)) {
            $wpdb->query("ALTER TABLE $table_sd ADD COLUMN images longtext DEFAULT NULL AFTER related_event_id");
        }
        // Migration: add gallery_images to mf_events
        $table_events = $wpdb->prefix . 'mf_events';
        $ev_cols = $wpdb->get_col("SHOW COLUMNS FROM $table_events");
        if ($ev_cols && !in_array('gallery_images', $ev_cols)) {
            $wpdb->query("ALTER TABLE $table_events ADD COLUMN gallery_images longtext DEFAULT NULL AFTER cover_image_url");
        }
        update_option('mf_db_version', MF_VERSION);
    }

    // Auto-complete: any published event whose start_datetime is in the past becomes 'completed'
    $wpdb->query("
        UPDATE {$wpdb->prefix}mf_events
        SET status='completed'
        WHERE status='published' AND start_datetime < NOW()
    ");
});

// Same auto-complete logic on front-end page loads (so users see correct status without admin visit)
add_action('init', function(){
    if (is_admin()) return; // already handled in admin_init
    global $wpdb;
    $te = $wpdb->prefix . 'mf_events';
    if ($wpdb->get_var("SHOW TABLES LIKE '$te'") === $te) {
        $wpdb->query("UPDATE $te SET status='completed' WHERE status='published' AND start_datetime < NOW()");
    }
});

/**
 * Seed sample events / updates / special-days once.
 * Runs only if tables are empty.
 */
function mf_seed_events_sample_data() {
    global $wpdb;
    $te  = $wpdb->prefix . 'mf_events';
    $tu  = $wpdb->prefix . 'mf_community_updates';
    $tsd = $wpdb->prefix . 'mf_special_days';

    // Events
    if ((int)$wpdb->get_var("SELECT COUNT(*) FROM $te") === 0) {
        $events = [
            ['Sensory Workshop',           'sensory-workshop',           'workshop',     'Guided session for sensory exploration', 'Izmir Talk-Spot',        'Izmir',    'small_group', '2026-04-13 14:00:00'],
            ['Family Park Meetup',         'family-park-meetup',         'meetup',       'Open meetup at Alsancak Park',           'Alsancak Park',          'Izmir',    'open',        '2026-04-20 11:00:00'],
            ['Communication Q&A',          'communication-qa',           'expert_session','Live session with our experts',         'Online',                 'Online',   'online',      '2026-04-22 19:00:00'],
            ['Talk-Spot Open Day',         'talk-spot-open-day',         'talkspot',     'Visit our new venue and meet the team',  'Karsiyaka Talk-Spot',    'Izmir',    'open',        '2026-04-23 13:00:00'],
            ['World Autism Day',           'world-autism-day',           'specialday',   'Awareness day across all venues',        'All Talk-Spots',         null,       'special',     '2026-04-24 10:00:00'],
            ['1000 Families Milestone',    '1000-families-milestone',    'milestone',    'A community milestone celebration',      'Online',                 null,       'online',      '2026-03-25 18:00:00'],
            ['Reading Together Workshop',  'reading-together-workshop',  'workshop',     'Quiet shared reading session',           'Istanbul Talk-Spot',     'Istanbul', '1on1',        '2026-05-06 15:00:00'],
            ['Spring Family Meetup',       'spring-family-meetup',       'meetup',       'Open relaxed meetup',                    'Bostanli Beach',         'Izmir',    'open',        '2026-05-12 16:00:00'],
            ['Mini-Expert Session',        'mini-expert-session-may',    'expert_session','Practical communication tips',          'Online',                 'Online',   'online',      '2026-05-18 19:00:00'],
            ['Talk-Spot Visit Day',        'talk-spot-visit-may',        'talkspot',     'Visit a Talk-Spot near you',             'Cesme Talk-Spot',        'Izmir',    'open',        '2026-05-22 12:00:00'],
        ];
        foreach ($events as $e) {
            $wpdb->insert($te, [
                'title'             => $e[0],
                'slug'              => $e[1],
                'event_type'        => $e[2],
                'short_description' => $e[3],
                'location_name'     => $e[4],
                'city'              => $e[5],
                'format_type'       => $e[6],
                'start_datetime'    => $e[7],
                'status'            => 'published',
            ]);
        }
    }

    // Community updates
    if ((int)$wpdb->get_var("SELECT COUNT(*) FROM $tu") === 0) {
        $updates = [
            ['selin','Family',    'joined a Talk-Spot meetup',     '2026-04-12 14:00:00'],
            ['ahmet','Volunteer', 'hosted a workshop in Izmir',    '2026-04-11 10:00:00'],
            ['aylin','Expert',    'shared a session recording',    '2026-04-10 09:00:00'],
            ['deniz','Family',    'visited a Mini-Talks event',    '2026-04-09 16:00:00'],
            ['kerem','Talk-Spot', 'opened a new venue',            '2026-04-08 12:00:00'],
            ['elif','Family',     'connected with 3 families',     '2026-04-07 18:00:00'],
            ['mete','Volunteer',  'organised a reading meetup',    '2026-04-05 11:00:00'],
            ['nazli','Family',    'shared a comfort moment',       '2026-04-04 17:00:00'],
            ['tunc','Expert',     'answered 8 community questions','2026-04-03 09:00:00'],
            ['yagmur','Family',   'attended her first workshop',   '2026-04-02 15:00:00'],
            ['baris','Talk-Spot', 'welcomed 12 families',          '2026-04-01 10:00:00'],
            ['cansu','Volunteer', 'started a new project',         '2026-03-31 13:00:00'],
        ];
        foreach ($updates as $u) {
            $wpdb->insert($tu, [
                'nickname'     => $u[0],
                'role'         => $u[1],
                'message'      => $u[2],
                'visible_date' => $u[3],
                'status'       => 'published',
                'update_type'  => 'general',
            ]);
        }
    }

    // Special days
    if ((int)$wpdb->get_var("SELECT COUNT(*) FROM $tsd") === 0) {
        $sds = [
            ['World Autism Day',         'A day of awareness and inclusion.',                  '2026-04-02', 4,  'blue'],
            ['World Mental Health Day',  'Mental wellbeing matters at every age.',             '2026-10-10', 10, 'red'],
            ["Children's Day",           'Celebrating the voice of every child.',              '2026-04-23', 4,  'yellow'],
            ['Down Syndrome Day',        'Inclusion and acceptance for everyone.',             '2026-03-21', 3,  'red'],
            ['World Education Day',      'Learning is for everyone.',                          '2026-01-24', 1,  'blue'],
            ['Random Acts of Kindness',  'Small kindness, big impact.',                        '2026-02-17', 2,  'yellow'],
        ];
        foreach ($sds as $s) {
            $wpdb->insert($tsd, [
                'title'        => $s[0],
                'description'  => $s[1],
                'day_date'     => $s[2],
                'month_number' => $s[3],
                'accent_color' => $s[4],
                'status'       => 'published',
            ]);
        }
    }
}

/* ── Deactivation ── */
register_deactivation_hook(__FILE__, function() {
    flush_rewrite_rules();
});

/* ── Init ── */
add_action('init', function() {
    Mini_Forum_CPT::register();
});

/* ────────────────────────────────────────────────────────────
   PENDING-APPROVAL GATE
   Newly-registered users get user_meta('mf_pending_approval')=1
   and cannot log in until an admin clears that flag.
   Admins can review/approve in the Users list.
──────────────────────────────────────────────────────────── */

// Block login for users still flagged pending
add_filter('wp_authenticate_user', function($user) {
    if (is_wp_error($user)) return $user;
    if (!is_a($user, 'WP_User')) return $user;
    if (get_user_meta($user->ID, 'mf_pending_approval', true)) {
        return new WP_Error(
            'mf_pending',
            __('<strong>Account pending review.</strong> Your application is still being reviewed by our team. You\'ll receive an email when your account is approved.', 'mini-forum')
        );
    }
    return $user;
}, 30);

// Add a "Pending Approval" column to the Users list
add_filter('manage_users_columns', function($cols) {
    $cols['mf_pending'] = __('Pending Approval', 'mini-forum');
    return $cols;
});
add_filter('manage_users_custom_column', function($val, $col, $user_id) {
    if ($col !== 'mf_pending') return $val;
    $pending = get_user_meta($user_id, 'mf_pending_approval', true);
    if ($pending) {
        $approve = wp_nonce_url(
            add_query_arg(['mf_action' => 'approve', 'user_id' => $user_id], admin_url('users.php')),
            'mf_approve_' . $user_id
        );
        return '<span style="color:#b00;font-weight:700">⏳ Pending</span><br>'
             . '<a href="' . esc_url($approve) . '" class="button button-small button-primary" style="margin-top:4px">Approve & Notify</a>';
    }
    return '<span style="color:#46b450;font-weight:700">✓ Approved</span>';
}, 10, 3);

// Handle the approve link
add_action('admin_init', function() {
    if (!is_admin()) return;
    if (empty($_GET['mf_action']) || $_GET['mf_action'] !== 'approve') return;
    if (!current_user_can('edit_users')) return;
    $user_id = intval($_GET['user_id'] ?? 0);
    if (!$user_id) return;
    if (!wp_verify_nonce($_GET['_wpnonce'] ?? '', 'mf_approve_' . $user_id)) return;

    delete_user_meta($user_id, 'mf_pending_approval');
    update_user_meta($user_id, 'mf_approved_on', current_time('mysql'));

    $user = get_user_by('id', $user_id);
    if ($user) {
        $site_name = get_bloginfo('name');
        $login_url = wp_login_url();
        $body = sprintf(
            "Hi %s,\n\n" .
            "Good news — your %s account has been approved! You can now sign in and join the community.\n\n" .
            "Sign in here: %s\n\n" .
            "Welcome aboard,\n— The Mini-Talks Team",
            mf_get_nickname($user_id), $site_name, $login_url
        );
        wp_mail($user->user_email, sprintf('[%s] Your account is approved', $site_name), $body);
    }

    wp_safe_redirect(add_query_arg('mf_approved', '1', admin_url('users.php')));
    exit;
});
add_action('admin_notices', function() {
    if (!empty($_GET['mf_approved'])) {
        echo '<div class="notice notice-success is-dismissible"><p><strong>User approved.</strong> A notification email has been sent.</p></div>';
    }
});

/* ── Auto-create events tables for existing installs ── */
add_action('plugins_loaded', function() {
    global $wpdb;
    $events_table = $wpdb->prefix . 'mf_events';
    $her_table    = $wpdb->prefix . 'mf_host_event_requests';
    if ($wpdb->get_var("SHOW TABLES LIKE '$events_table'") !== $events_table
        || $wpdb->get_var("SHOW TABLES LIKE '$her_table'") !== $her_table) {
        mf_create_tables();
    }
});

/* ── Enqueue Auth Assets — GLOBAL ── */
add_action('wp_enqueue_scripts', function() {
    // Cache-busting: use filemtime() so the URL changes whenever a file changes.
    // Without this, Safari (and other browsers) cache CSS aggressively under ?ver=1.0.0
    // and serve stale styles even after the file is updated.
    $auth_css_v   = file_exists(MF_PATH . 'assets/css/mini-forum-auth.css') ? filemtime(MF_PATH . 'assets/css/mini-forum-auth.css') : MF_VERSION;
    $auth_js_v    = file_exists(MF_PATH . 'assets/js/mini-forum-auth.js')   ? filemtime(MF_PATH . 'assets/js/mini-forum-auth.js')   : MF_VERSION;
    $forum_css_v  = file_exists(MF_PATH . 'assets/css/mini-forum.css')      ? filemtime(MF_PATH . 'assets/css/mini-forum.css')      : MF_VERSION;
    $forum_js_v   = file_exists(MF_PATH . 'assets/js/mini-forum.js')        ? filemtime(MF_PATH . 'assets/js/mini-forum.js')        : MF_VERSION;
    $avatar_css_v = file_exists(MF_PATH . 'assets/css/mini-forum-avatar.css') ? filemtime(MF_PATH . 'assets/css/mini-forum-avatar.css') : MF_VERSION;
    $avatar_js_v  = file_exists(MF_PATH . 'assets/js/mini-forum-avatar.js')   ? filemtime(MF_PATH . 'assets/js/mini-forum-avatar.js')   : MF_VERSION;

    wp_enqueue_style('mf-montserrat', 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap', [], null);
    wp_enqueue_style('mf-auth-style', MF_URL . 'assets/css/mini-forum-auth.css', ['mf-montserrat'], $auth_css_v);
    wp_enqueue_style('mf-avatar-style', MF_URL . 'assets/css/mini-forum-avatar.css', ['mf-auth-style'], $avatar_css_v);
    wp_enqueue_script('mf-auth-script', MF_URL . 'assets/js/mini-forum-auth.js', ['jquery'], $auth_js_v, true);
    wp_enqueue_script('mf-avatar-script', MF_URL . 'assets/js/mini-forum-avatar.js', ['jquery', 'mf-auth-script'], $avatar_js_v, true);
    // Default Mini-Talks avatar (used when user has no avatar set, and for the
    // logged-out auth button in the header). Centralized in Mini_Forum_Avatar.
    $mf_default_avatar = Mini_Forum_Avatar::$default_avatar_url;

    // Resolve a real avatar for the current user if logged in.
    // Full priority chain (plugin avatar → gravatar → default) lives in the helper.
    $mf_user_avatar = $mf_default_avatar;
    if (is_user_logged_in()) {
        $mf_user_avatar = Mini_Forum_Avatar::resolve_url(get_current_user_id(), 96);
    }

    wp_localize_script('mf-auth-script', 'mf_ajax', [
        'url'         => admin_url('admin-ajax.php'),
        'nonce'       => wp_create_nonce('mf_nonce'),
        'is_logged_in' => is_user_logged_in() ? 1 : 0,
        'forum_url'   => mf_get_forum_url(),
        'events_url'  => mf_get_events_url(),
        'profile_url' => add_query_arg('view', 'profile', mf_get_forum_url()),
        'default_avatar' => $mf_default_avatar,
        'user'        => is_user_logged_in() ? [
            'nickname'   => mf_get_nickname(),
            'role'       => mf_get_user_role(),
            'initial'    => strtoupper(substr(mf_get_nickname(), 0, 1)),
            'avatar_url' => $mf_user_avatar,
        ] : null,
    ]);

    /* ── Avatar Editor (React bundle) — only for logged-in users ── */
    if (is_user_logged_in()) {
        $editor_js_path  = MF_PATH . 'assets/avatar-editor/mf-avatar-editor.js';
        $editor_css_path = MF_PATH . 'assets/avatar-editor/mf-avatar-editor.css';
        if (file_exists($editor_js_path)) {
            $editor_js_v  = filemtime($editor_js_path);
            $editor_css_v = file_exists($editor_css_path) ? filemtime($editor_css_path) : $editor_js_v;
            if (file_exists($editor_css_path)) {
                wp_enqueue_style('mf-avatar-editor-style', MF_URL . 'assets/avatar-editor/mf-avatar-editor.css', ['mf-avatar-style'], $editor_css_v);
            }
            wp_enqueue_script('mf-avatar-editor', MF_URL . 'assets/avatar-editor/mf-avatar-editor.js', ['mf-avatar-script'], $editor_js_v, true);

            /*
             * GLB / PNG asset base URL.
             *
             * Avatar editor expects the following structure under this base:
             *   /hair/m_hair_01.glb ... f_hair_*.glb ... c_hair_*.glb
             *   /hair/png/m_hair_01_front_0.png ... etc
             *   /face/Man_Eye1.glb, Man_Eye_Brows1.glb, Man_Mouth1.glb
             *   /face/eyes/m_head_eye_glb/m_head_eye01.glb ... etc
             *   /face/eyes/m_head_eye_png/m_head_eye01.png ... etc
             *   /face/mouth/...
             *
             * Default: load from the Mini-Talks game origin (mini-talks.com) —
             * forum is on mini-talks.org, so this is a cross-origin fetch and
             * REQUIRES CORS headers on the game origin (see SERVER_CONFIG.md).
             *
             * Override anytime via the 'mf_avatar_glb_base' filter.
             */
            $glb_base = apply_filters('mf_avatar_glb_base', 'https://mini-talks.com/models');

            /*
             * Body GLB URL — auto-resolved from the game site since Vite adds a
             * content hash that changes on every build. See
             * Mini_Forum_Avatar::resolve_body_glb_url() for the strategy.
             */
            $body_glb_url = Mini_Forum_Avatar::resolve_body_glb_url();

            // Role + torso UV id (used for the upper-body texture in the editor)
            $current_user_id = get_current_user_id();
            $current_role    = mf_get_user_role($current_user_id);
            $torso_id        = mf_role_torso_id($current_role);

            wp_localize_script('mf-avatar-editor', 'mf_avatar_editor', [
                'glb_base'       => rtrim($glb_base, '/'),
                'body_glb_url'   => $body_glb_url,
                'role'           => $current_role,
                'torso_id'       => $torso_id,
                'initial_config' => Mini_Forum_Avatar::get_config($current_user_id),
            ]);
        }
    }

    // Forum CSS/JS only on forum pages
    if (!mf_is_forum_page()) return;
    wp_enqueue_style('mf-style', MF_URL . 'assets/css/mini-forum.css', ['mf-auth-style'], $forum_css_v);
    wp_enqueue_script('mf-script', MF_URL . 'assets/js/mini-forum.js', ['jquery', 'mf-auth-script'], $forum_js_v, true);

    // Profile tabs + Settings popup. Loaded on every forum page so the tab bar
    // works wherever the profile view is rendered.
    $profile_css_v = file_exists(MF_PATH . 'assets/css/mini-forum-profile.css') ? filemtime(MF_PATH . 'assets/css/mini-forum-profile.css') : MF_VERSION;
    $profile_js_v  = file_exists(MF_PATH . 'assets/js/mini-forum-profile.js')   ? filemtime(MF_PATH . 'assets/js/mini-forum-profile.js')   : MF_VERSION;
    wp_enqueue_style('mf-profile-style', MF_URL . 'assets/css/mini-forum-profile.css', ['mf-style'], $profile_css_v);
    wp_enqueue_script('mf-profile-script', MF_URL . 'assets/js/mini-forum-profile.js', ['jquery', 'mf-auth-script'], $profile_js_v, true);
});

/* ── Auth Popup — on ALL pages ── */
add_action('wp_footer', function() {
    if (is_user_logged_in()) return;
    include MF_PATH . 'templates/auth-popup.php';
});

function mf_is_forum_page() {
    global $post;
    if (!$post) return false;
    return has_shortcode($post->post_content, 'mini_forum')
        || has_shortcode($post->post_content, 'mini_join')
        || has_shortcode($post->post_content, 'mini_events');
}

function mf_is_events_page() {
    global $post;
    if (!$post) return false;
    return has_shortcode($post->post_content, 'mini_events');
}

function mf_get_forum_url() {
    // Try to find the page with [mini_forum] shortcode
    $pages = get_pages();
    foreach ($pages as $page) {
        if (has_shortcode($page->post_content, 'mini_forum')) {
            return get_permalink($page->ID);
        }
    }
    return home_url('/mini-community/forum/');
}

function mf_get_events_url() {
    $pages = get_pages();
    foreach ($pages as $page) {
        if (has_shortcode($page->post_content, 'mini_events')) {
            return get_permalink($page->ID);
        }
    }
    return home_url('/mini-community/events/');
}

/* ── Helper: Get user forum role label ── */
function mf_get_user_role($user_id = null) {
    if (!$user_id) $user_id = get_current_user_id();
    $user = get_userdata($user_id);
    if (!$user) return 'Family';

    $role_map = [
        'mini_family'    => 'Family',
        'mini_expert'    => 'Expert',
        'mini_volunteer' => 'Volunteer',
        'talk_spot'      => 'Talk-Spot',
        'administrator'  => 'Expert',
    ];

    // Check custom meta first
    $forum_role = get_user_meta($user_id, 'mf_role', true);
    if ($forum_role) return $forum_role;

    foreach ($user->roles as $role) {
        if (isset($role_map[$role])) return $role_map[$role];
    }
    return 'Family';
}

/* ── Helper: Get user nickname ── */
function mf_get_nickname($user_id = null) {
    if (!$user_id) $user_id = get_current_user_id();
    $nick = get_user_meta($user_id, 'mf_nickname', true);
    if ($nick) return $nick;
    $user = get_userdata($user_id);
    return $user ? $user->display_name : 'Anonymous';
}

/* ── Helper: Reply count ── */
function mf_get_reply_count($post_id) {
    global $wpdb;
    $table = $wpdb->prefix . 'mf_replies';
    return (int) $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM $table WHERE post_id = %d AND status = 'approved'", $post_id
    ));
}

/* ── Helper: Time ago ── */
function mf_time_ago($datetime) {
    $now  = current_time('timestamp');
    $diff = abs($now - strtotime($datetime));
    if ($diff < 60)       return 'just now';
    if ($diff < 3600)     { $n = floor($diff/60);    return $n . ($n==1?' min':' mins') . ' ago'; }
    if ($diff < 86400)    { $n = floor($diff/3600);   return $n . ($n==1?' hour':' hours') . ' ago'; }
    if ($diff < 604800)   { $n = floor($diff/86400);  return $n . ($n==1?' day':' days') . ' ago'; }
    if ($diff < 2592000)  { $n = floor($diff/604800);  return $n . ($n==1?' week':' weeks') . ' ago'; }
    if ($diff < 31536000) { $n = floor($diff/2592000); return $n . ($n==1?' month':' months') . ' ago'; }
    $n = floor($diff/31536000); return $n . ($n==1?' year':' years') . ' ago';
}

/* ── Helper: Role color ── */
function mf_role_color($role) {
    $map = [
        'Family'    => '#0055BF',
        'Expert'    => '#237841',
        'Volunteer' => '#c49a00',
        'Talk-Spot' => '#E52828',
    ];
    return $map[$role] ?? '#0055BF';
}

/* ── Helper: Role → torso UV ID ──
 *
 * Maps a plugin role to the torso GLB folder name on mini-talks.com:
 *   /models/torso/{id}/{id}_uv.png
 *
 * Color rules per design:
 *   Family    → red    (02_red)
 *   Expert    → green  (04_green)
 *   Volunteer → blue   (03_blue)
 *   Talk-Spot → orange (05_orange)
 *
 * Override the map via the 'mf_avatar_role_torso_map' filter.
 */
function mf_role_torso_id($role) {
    $map = apply_filters('mf_avatar_role_torso_map', [
        'Family'    => 'c_f_m_basic_minitalks_short_02_red',
        'Expert'    => 'c_f_m_basic_minitalks_short_04_green',
        'Volunteer' => 'c_f_m_basic_minitalks_short_03_blue',
        'Talk-Spot' => 'c_f_m_basic_minitalks_short_05_orange',
    ]);
    return $map[$role] ?? $map['Family'];
}

/* ── Helper: Type color ── */
function mf_type_color($type) {
    $map = [
        'question'   => '#E52828',
        'experience' => '#FFF03A',
        'idea'       => '#0055BF',
        'reflection' => '#237841',
    ];
    return $map[$type] ?? '#0055BF';
}

/* ── Helper: Type label ── */
function mf_type_label($type) {
    $map = [
        'question'   => 'Question',
        'experience' => 'Experience',
        'idea'       => 'Idea',
        'reflection' => 'Reflection',
    ];
    return $map[$type] ?? ucfirst($type);
}

/* ── Add html class on forum pages ── */
add_action('wp_head', function() {
    if (mf_is_forum_page()) {
        echo '<script>document.documentElement.classList.add("mf-active");</script>';
    }
});

/* ── Logout handler ── */
add_action('init', function() {
    if (isset($_GET['logout']) && $_GET['logout'] == '1' && is_user_logged_in()) {
        wp_logout();
        wp_safe_redirect(mf_get_forum_url());
        exit;
    }
});
