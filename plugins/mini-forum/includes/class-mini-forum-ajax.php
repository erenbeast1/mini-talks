<?php
if (!defined('ABSPATH')) exit;

class Mini_Forum_Ajax {

    public static function init() {
        // Logged-in actions
        add_action('wp_ajax_mf_create_post',   [__CLASS__, 'create_post']);
        add_action('wp_ajax_mf_create_reply',   [__CLASS__, 'create_reply']);
        add_action('wp_ajax_mf_toggle_reaction', [__CLASS__, 'toggle_reaction']);
        add_action('wp_ajax_mf_load_posts',     [__CLASS__, 'load_posts']);
        add_action('wp_ajax_mf_load_post',      [__CLASS__, 'load_single_post']);
        add_action('wp_ajax_mf_load_replies',   [__CLASS__, 'load_replies']);
        add_action('wp_ajax_mf_change_password', [__CLASS__, 'change_password']);

        // Non-logged-in actions
        add_action('wp_ajax_nopriv_mf_load_posts',   [__CLASS__, 'load_posts']);
        add_action('wp_ajax_nopriv_mf_load_post',    [__CLASS__, 'load_single_post']);
        add_action('wp_ajax_nopriv_mf_load_replies', [__CLASS__, 'load_replies']);
        add_action('wp_ajax_nopriv_mf_register',     [__CLASS__, 'register_user']);
        add_action('wp_ajax_nopriv_mf_login',        [__CLASS__, 'login_user']);

        // Events
        add_action('wp_ajax_mfe_get_calendar',        [__CLASS__, 'get_calendar']);
        add_action('wp_ajax_nopriv_mfe_get_calendar', [__CLASS__, 'get_calendar']);
        add_action('wp_ajax_mfe_submit_host',         [__CLASS__, 'submit_host_request']);
        add_action('wp_ajax_nopriv_mfe_submit_host',  [__CLASS__, 'submit_host_request']);
        add_action('wp_ajax_mfe_toggle_join',         [__CLASS__, 'toggle_join']);
        add_action('wp_ajax_nopriv_mfe_toggle_join',  [__CLASS__, 'toggle_join']);
        add_action('wp_ajax_mfe_get_event_detail',        [__CLASS__, 'get_event_detail']);
        add_action('wp_ajax_nopriv_mfe_get_event_detail', [__CLASS__, 'get_event_detail']);
        add_action('wp_ajax_mf_submit_story',         [__CLASS__, 'submit_real_story']);
        add_action('wp_ajax_nopriv_mf_submit_story',  [__CLASS__, 'submit_real_story']);
        add_action('wp_ajax_mf_subscribe',            [__CLASS__, 'subscribe_newsletter']);
        add_action('wp_ajax_nopriv_mf_subscribe',     [__CLASS__, 'subscribe_newsletter']);
    }

    /* ── Toggle Join / Leave Event ── */
    public static function toggle_join() {
        check_ajax_referer('mf_nonce', 'nonce');
        if (!is_user_logged_in()) wp_send_json_error(['message' => 'Login required'], 401);

        global $wpdb;
        $event_id = intval($_POST['event_id'] ?? 0);
        $user_id  = get_current_user_id();
        if (!$event_id) wp_send_json_error(['message' => 'Invalid event']);

        $tp = $wpdb->prefix . 'mf_event_participants';
        $te = $wpdb->prefix . 'mf_events';

        // Verify event exists
        $event = $wpdb->get_row($wpdb->prepare("SELECT id, status FROM $te WHERE id=%d", $event_id));
        if (!$event) wp_send_json_error(['message' => 'Event not found']);
        if ($event->status === 'completed' || $event->status === 'cancelled') {
            wp_send_json_error(['message' => 'This event is no longer joinable']);
        }

        $existing = $wpdb->get_row($wpdb->prepare("SELECT id, status FROM $tp WHERE event_id=%d AND user_id=%d", $event_id, $user_id));

        if ($existing && $existing->status === 'joined') {
            // Leave
            $wpdb->update($tp, ['status' => 'left', 'left_at' => current_time('mysql')], ['id' => $existing->id]);
            $action = 'left';
        } else if ($existing) {
            // Re-join
            $wpdb->update($tp, ['status' => 'joined', 'left_at' => null], ['id' => $existing->id]);
            $action = 'joined';
        } else {
            // First time
            $wpdb->insert($tp, ['event_id' => $event_id, 'user_id' => $user_id, 'status' => 'joined']);
            $action = 'joined';
        }

        $count = (int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $tp WHERE event_id=%d AND status='joined'", $event_id));
        wp_send_json_success([
            'action'  => $action,
            'count'   => $count,
            'avatars' => self::get_event_avatars($event_id, 3),
        ]);
    }

    /* ── Helper: Avatars of joined participants (limit N) ── */
    public static function get_event_avatars($event_id, $limit = 3) {
        global $wpdb;
        $tp = $wpdb->prefix . 'mf_event_participants';
        $rows = $wpdb->get_results($wpdb->prepare("
            SELECT user_id FROM $tp WHERE event_id=%d AND status='joined' ORDER BY joined_at DESC LIMIT %d
        ", $event_id, $limit));
        $avatars = [];
        foreach ($rows as $r) {
            $url = class_exists('Mini_Forum_Avatar')
                ? Mini_Forum_Avatar::resolve_url((int)$r->user_id, 64)
                : get_avatar_url($r->user_id, ['size' => 64]);
            $name = get_user_meta($r->user_id, 'mf_nickname', true);
            if (!$name) $name = get_userdata($r->user_id)->display_name ?? '';
            $avatars[] = ['url' => $url, 'name' => $name];
        }
        return $avatars;
    }

    /* ── Get full event detail (for popup) ── */
    public static function get_event_detail() {
        check_ajax_referer('mf_nonce', 'nonce');
        global $wpdb;
        $event_id = intval($_POST['event_id'] ?? 0);
        $event_type_token = sanitize_text_field($_POST['event_type'] ?? '');
        if ($event_id <= 0 || !$event_type_token) wp_send_json_error(['message' => 'Invalid request'], 400);

        if ($event_type_token === 'specialday') {
            $tsd = $wpdb->prefix . 'mf_special_days';
            $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM $tsd WHERE id=%d AND status='published'", $event_id));
            if (!$row) wp_send_json_error(['message' => 'Not found'], 404);

            // Decode images JSON
            $imgs = [];
            if (!empty($row->images)) {
                $decoded = json_decode($row->images, true);
                if (is_array($decoded)) $imgs = $decoded;
            }

            $allowed = ['strong'=>[],'b'=>[],'em'=>[],'i'=>[],'u'=>[],'br'=>[],'p'=>[],'span'=>['style'=>true],'a'=>['href'=>true,'target'=>true,'rel'=>true]];
            wp_send_json_success([
                'kind'        => 'specialday',
                'type_token'  => 'specialday',
                'id'          => (int)$row->id,
                'title'       => $row->title,
                'description' => wp_kses($row->description, $allowed),
                'date_iso'    => $row->day_date,
                'date_label'  => date('l, F j', strtotime($row->day_date)),
                'images'      => $imgs,
                'accent'      => $row->accent_color ?: 'orange',
                'has_join'    => false,
            ]);
        } else {
            $te = $wpdb->prefix . 'mf_events';
            $tp = $wpdb->prefix . 'mf_event_participants';
            $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM $te WHERE id=%d AND status IN ('published','completed','cancelled')", $event_id));
            if (!$row) wp_send_json_error(['message' => 'Not found'], 404);

            // Decode gallery images if column exists
            $imgs = [];
            if (isset($row->gallery_images) && !empty($row->gallery_images)) {
                $decoded = json_decode($row->gallery_images, true);
                if (is_array($decoded)) $imgs = $decoded;
            }

            $count = (int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $tp WHERE event_id=%d AND status='joined'", $row->id));
            $current_user_joined = false;
            if (is_user_logged_in()) {
                $uid = get_current_user_id();
                $current_user_joined = (bool)$wpdb->get_var($wpdb->prepare("SELECT 1 FROM $tp WHERE event_id=%d AND user_id=%d AND status='joined'", $row->id, $uid));
            }

            $allowed = ['strong'=>[],'b'=>[],'em'=>[],'i'=>[],'u'=>[],'br'=>[],'p'=>[],'span'=>['style'=>true],'a'=>['href'=>true,'target'=>true,'rel'=>true]];
            $long_desc = !empty($row->description) ? $row->description : ($row->short_description ?? '');

            $is_disabled = in_array($row->status, ['completed','cancelled'], true);

            wp_send_json_success([
                'kind'         => $event_type_token, // workshop | meetup | expert
                'type_token'   => $event_type_token,
                'id'           => (int)$row->id,
                'title'        => $row->title,
                'description'  => wp_kses($long_desc, $allowed),
                'date_iso'     => $row->start_datetime,
                'date_label'   => date('l, F j · H:i', strtotime($row->start_datetime)),
                'location'     => $row->location_name ?? '',
                'cover'        => $row->cover_image_url ?? '',
                'images'       => $imgs,
                'count'        => $count,
                'is_joined'    => $current_user_joined,
                'is_disabled'  => $is_disabled,
                'status'       => $row->status,
                'has_join'     => true,
            ]);
        }
    }

    /* ── Submit Host Event Request ── */
    public static function submit_host_request() {
        check_ajax_referer('mf_nonce', 'nonce');
        global $wpdb;

        $full_name      = sanitize_text_field($_POST['full_name']    ?? '');
        $email          = sanitize_email($_POST['email']             ?? '');
        $city           = sanitize_text_field($_POST['city']         ?? '');
        $location_name  = sanitize_text_field($_POST['location_name']?? '');
        $event_type     = sanitize_text_field($_POST['event_type']   ?? '');
        $preferred_date = sanitize_text_field($_POST['preferred_date'] ?? '');
        $proposal_text  = sanitize_textarea_field($_POST['proposal_text'] ?? '');
        $venue_type     = sanitize_text_field($_POST['venue_type']   ?? '');
        $space_notes    = sanitize_textarea_field($_POST['space_notes'] ?? '');

        $allowed_types = ['workshop','meetup','expert_session','talkspot'];
        if (!in_array($event_type, $allowed_types, true)) $event_type = 'meetup';

        // Required fields
        if (empty($full_name) || empty($email) || empty($proposal_text)) {
            wp_send_json_error(['message' => 'Please fill all required fields.']);
        }
        if (!is_email($email)) {
            wp_send_json_error(['message' => 'Please enter a valid email.']);
        }

        $user_id = is_user_logged_in() ? get_current_user_id() : null;
        $role    = $user_id ? mf_get_user_role($user_id) : 'Guest';

        $table_her = $wpdb->prefix . 'mf_host_event_requests';
        $inserted = $wpdb->insert($table_her, [
            'user_id'        => $user_id,
            'requester_role' => $role,
            'event_type'     => $event_type,
            'full_name'      => $full_name,
            'email'          => $email,
            'location_name'  => $location_name,
            'city'           => $city,
            'preferred_date' => $preferred_date ?: null,
            'proposal_text'  => $proposal_text,
            'venue_type'     => $venue_type,
            'space_notes'    => $space_notes,
            'status'         => 'new',
        ]);

        if (!$inserted) {
            wp_send_json_error(['message' => 'Could not save your request. Please try again.']);
        }

        // Notify admin
        $admin_email = get_option('admin_email');
        $subject = '[Mini-Talks] New Host Event Request';
        $body = sprintf(
            "A new host event request was submitted.\n\nFrom: %s <%s>\nRole: %s\nType: %s\nCity: %s\nLocation: %s\nPreferred date: %s\n\nProposal:\n%s\n\n— Mini-Forum",
            $full_name, $email, $role, $event_type, $city, $location_name,
            $preferred_date ?: '(unspecified)', $proposal_text
        );
        @wp_mail($admin_email, $subject, $body);

        wp_send_json_success(['message' => 'Thanks! Your request was sent. We will get back to you soon.']);
    }

    /* ── Events Calendar (month payload) ── */
    public static function get_calendar() {
        check_ajax_referer('mf_nonce', 'nonce');
        global $wpdb;
        $year  = max(2020, min(2100, intval($_POST['year'] ?? 0)));
        $month = max(1, min(12, intval($_POST['month'] ?? 0)));
        if (!$year || !$month) { wp_send_json_error([]); }

        $start = sprintf('%04d-%02d-01 00:00:00', $year, $month);
        $end   = date('Y-m-t 23:59:59', strtotime($start));
        $te    = $wpdb->prefix . 'mf_events';
        $tsd   = $wpdb->prefix . 'mf_special_days';

        $rows = $wpdb->get_results($wpdb->prepare("
            SELECT id, title, slug, event_type, DATE(start_datetime) AS d
            FROM $te
            WHERE status IN ('published','completed') AND start_datetime BETWEEN %s AND %s
            ORDER BY start_datetime ASC
        ", $start, $end));

        $map = [
            'workshop'        => 'mfe-workshop',
            'meetup'          => 'mfe-meetup',
            'expert_session'  => 'mfe-expert',
            'talkspot'        => 'mfe-talkspot',
            'specialday'      => 'mfe-specialday',
            'milestone'       => 'mfe-milestone',
        ];
        $out = [];
        foreach ($rows as $r) {
            $cls = $map[$r->event_type] ?? 'mfe-meetup';
            $out[$r->d][] = [
                'id'    => (int)$r->id,
                'title' => $r->title,
                'slug'  => $r->slug,
                'cls'   => $cls,
            ];
        }

        // Merge Special Days
        $sds = $wpdb->get_results($wpdb->prepare("
            SELECT id, title, day_date FROM $tsd
            WHERE status='published' AND day_date BETWEEN %s AND %s
        ", date('Y-m-d', strtotime($start)), date('Y-m-d', strtotime($end))));
        foreach ($sds as $sd) {
            $out[$sd->day_date][] = [
                'id'    => (int)$sd->id,
                'title' => $sd->title,
                'slug'  => '',
                'cls'   => 'mfe-specialday',
            ];
        }

        wp_send_json_success($out);
    }

    /* ── Create Post ── */
    public static function create_post() {
        check_ajax_referer('mf_nonce', 'nonce');

        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Please log in first.']);
        }

        $title   = sanitize_text_field($_POST['title'] ?? '');
        $content = sanitize_textarea_field($_POST['content'] ?? '');
        $type    = sanitize_text_field($_POST['post_type'] ?? 'question');
        $topic   = sanitize_text_field($_POST['topic'] ?? '');
        $tag     = sanitize_text_field($_POST['tag'] ?? '');

        if (empty($title) || empty($content)) {
            wp_send_json_error(['message' => 'Title and content are required.']);
        }

        $post_id = wp_insert_post([
            'post_type'   => 'mf_post',
            'post_title'  => $title,
            'post_content' => $content,
            'post_status' => 'publish',
            'post_author' => get_current_user_id(),
        ]);

        if (is_wp_error($post_id)) {
            wp_send_json_error(['message' => 'Could not create post.']);
        }

        update_post_meta($post_id, '_mf_type', $type);
        update_post_meta($post_id, '_mf_tag', $tag);

        if ($topic) {
            wp_set_object_terms($post_id, $topic, 'mf_topic');
        }

        wp_send_json_success([
            'message' => 'Post shared successfully.',
            'post_id' => $post_id,
        ]);
    }

    /* ── Create Reply ── */
    public static function create_reply() {
        check_ajax_referer('mf_nonce', 'nonce');

        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Please log in first.']);
        }

        global $wpdb;
        $table = $wpdb->prefix . 'mf_replies';

        $post_id = intval($_POST['post_id'] ?? 0);
        $content = sanitize_textarea_field($_POST['content'] ?? '');
        $parent_id = intval($_POST['parent_id'] ?? 0);

        if (!$post_id || empty($content)) {
            wp_send_json_error(['message' => 'Reply content is required.']);
        }

        $wpdb->insert($table, [
            'post_id'    => $post_id,
            'user_id'    => get_current_user_id(),
            'parent_id'  => $parent_id,
            'content'    => $content,
            'created_at' => current_time('mysql'),
            'status'     => 'approved',
        ]);

        // Notify post author
        $post = get_post($post_id);
        if ($post && $post->post_author != get_current_user_id()) {
            $notif_table = $wpdb->prefix . 'mf_notifications';
            $wpdb->insert($notif_table, [
                'user_id'    => $post->post_author,
                'type'       => 'reply',
                'message'    => 'New reply to your post',
                'ref_id'     => $post_id,
                'created_at' => current_time('mysql'),
            ]);
        }

        $user_id = get_current_user_id();
        wp_send_json_success([
            'message'  => 'Reply shared.',
            'reply'    => [
                'id'        => $wpdb->insert_id,
                'parent_id' => $parent_id,
                'user'      => mf_get_nickname($user_id),
                'role'      => mf_get_user_role($user_id),
                'content'   => $content,
                'time'      => 'just now',
            ],
        ]);
    }

    /* ── Toggle Reaction ── */
    public static function toggle_reaction() {
        check_ajax_referer('mf_nonce', 'nonce');
        if (!is_user_logged_in()) wp_send_json_error(['message' => 'Please log in.']);

        global $wpdb;
        $table = $wpdb->prefix . 'mf_reactions';
        $reply_id = intval($_POST['reply_id'] ?? 0);
        $emoji = sanitize_text_field($_POST['emoji'] ?? '❤️');
        $user_id = get_current_user_id();

        if (!$reply_id) wp_send_json_error(['message' => 'Invalid reply.']);

        $existing = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM $table WHERE reply_id=%d AND user_id=%d AND emoji=%s",
            $reply_id, $user_id, $emoji
        ));

        if ($existing) {
            $wpdb->delete($table, ['id' => $existing]);
        } else {
            $wpdb->insert($table, [
                'reply_id' => $reply_id, 'user_id' => $user_id,
                'emoji' => $emoji, 'created_at' => current_time('mysql'),
            ]);
        }

        $counts = $wpdb->get_results($wpdb->prepare(
            "SELECT emoji, COUNT(*) as cnt FROM $table WHERE reply_id=%d GROUP BY emoji", $reply_id
        ), OBJECT_K);

        $result = [];
        foreach ($counts as $e => $row) {
            $mine = (bool)$wpdb->get_var($wpdb->prepare(
                "SELECT id FROM $table WHERE reply_id=%d AND user_id=%d AND emoji=%s",
                $reply_id, $user_id, $e
            ));
            $result[$e] = ['count' => (int)$row->cnt, 'mine' => $mine];
        }

        wp_send_json_success(['reactions' => $result]);
    }

    /* ── Load Posts ── */
    public static function load_posts() {
        $filter = sanitize_text_field($_POST['filter'] ?? 'all');
        $search = sanitize_text_field($_POST['search'] ?? '');
        $page   = max(1, intval($_POST['page'] ?? 1));
        $per    = 10;

        $args = [
            'post_type'      => 'mf_post',
            'post_status'    => 'publish',
            'posts_per_page' => $per,
            'paged'          => $page,
            'orderby'        => 'date',
            'order'          => 'DESC',
        ];

        if ($filter && $filter !== 'all') {
            $args['tax_query'] = [[
                'taxonomy' => 'mf_topic',
                'field'    => 'slug',
                'terms'    => $filter,
            ]];
        }

        if ($search) {
            $args['s'] = $search;
        }

        $query = new WP_Query($args);
        $posts = [];

        while ($query->have_posts()) {
            $query->the_post();
            $pid = get_the_ID();
            $type = get_post_meta($pid, '_mf_type', true) ?: 'question';
            $tag  = get_post_meta($pid, '_mf_tag', true) ?: '';
            $topics = wp_get_object_terms($pid, 'mf_topic', ['fields' => 'names']);
            $topic_label = !empty($topics) ? $topics[0] : '';

            // Simplify topic label for display
            $topic_short = str_replace(['With Family & Close Circle', 'At School', 'In Social Settings', 'Mini-Talks Experiences'], ['Family', 'School', 'Social', 'Mini-Talks'], $topic_label);

            $posts[] = [
                'id'       => $pid,
                'type'     => $type,
                'type_label' => mf_type_label($type),
                'type_color' => mf_type_color($type),
                'topic'    => $topic_short,
                'tag'      => $tag,
                'title'    => get_the_title(),
                'preview'  => wp_trim_words(get_the_content(), 30),
                'user'     => mf_get_nickname(get_the_author_meta('ID')),
                'role'     => mf_get_user_role(get_the_author_meta('ID')),
                'role_color' => mf_role_color(mf_get_user_role(get_the_author_meta('ID'))),
                'replies'  => mf_get_reply_count($pid),
                'time'     => mf_time_ago(get_the_date('Y-m-d H:i:s')),
            ];
        }
        wp_reset_postdata();

        wp_send_json_success([
            'posts'     => $posts,
            'max_pages' => $query->max_num_pages,
            'total'     => $query->found_posts,
        ]);
    }

    /* ── Load Single Post ── */
    public static function load_single_post() {
        $post_id = intval($_POST['post_id'] ?? 0);
        if (!$post_id) wp_send_json_error(['message' => 'Invalid post.']);

        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'mf_post') {
            wp_send_json_error(['message' => 'Post not found.']);
        }

        $type = get_post_meta($post_id, '_mf_type', true) ?: 'question';
        $tag  = get_post_meta($post_id, '_mf_tag', true) ?: '';
        $topics = wp_get_object_terms($post_id, 'mf_topic', ['fields' => 'names']);
        $topic_label = !empty($topics) ? $topics[0] : '';
        $topic_short = str_replace(['With Family & Close Circle', 'At School', 'In Social Settings', 'Mini-Talks Experiences'], ['Family', 'School', 'Social', 'Mini-Talks'], $topic_label);

        wp_send_json_success([
            'id'         => $post_id,
            'type'       => $type,
            'type_label' => mf_type_label($type),
            'type_color' => mf_type_color($type),
            'topic'      => $topic_short,
            'tag'        => $tag,
            'title'      => $post->post_title,
            'content'    => wpautop($post->post_content),
            'content_raw' => $post->post_content,
            'user'       => mf_get_nickname($post->post_author),
            'role'       => mf_get_user_role($post->post_author),
            'role_color' => mf_role_color(mf_get_user_role($post->post_author)),
            'replies'    => mf_get_reply_count($post_id),
            'time'       => mf_time_ago($post->post_date),
        ]);
    }

    /* ── Load Replies ── */
    public static function load_replies() {
        global $wpdb;
        $table = $wpdb->prefix . 'mf_replies';

        $post_id = intval($_POST['post_id'] ?? 0);
        if (!$post_id) wp_send_json_error(['message' => 'Invalid post.']);

        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table WHERE post_id = %d AND status = 'approved' ORDER BY created_at ASC",
            $post_id
        ));

        $replies = [];
        foreach ($rows as $row) {
            $react_table = $wpdb->prefix . 'mf_reactions';
            $react_counts = $wpdb->get_results($wpdb->prepare(
                "SELECT emoji, COUNT(*) as cnt FROM $react_table WHERE reply_id=%d GROUP BY emoji", $row->id
            ), OBJECT_K);
            $react_data = [];
            foreach ($react_counts as $e => $rd) {
                $mine = is_user_logged_in() ? (bool)$wpdb->get_var($wpdb->prepare(
                    "SELECT id FROM $react_table WHERE reply_id=%d AND user_id=%d AND emoji=%s",
                    $row->id, get_current_user_id(), $e
                )) : false;
                $react_data[$e] = ['count' => (int)$rd->cnt, 'mine' => $mine];
            }
            $replies[] = [
                'id'        => $row->id,
                'parent_id' => isset($row->parent_id) ? (int)$row->parent_id : 0,
                'user'      => mf_get_nickname($row->user_id),
                'role'      => mf_get_user_role($row->user_id),
                'role_color' => mf_role_color(mf_get_user_role($row->user_id)),
                'content'   => nl2br(esc_html($row->content)),
                'time'      => mf_time_ago($row->created_at),
                'reactions' => $react_data,
            ];
        }

        wp_send_json_success(['replies' => $replies]);
    }

    /* ── Register ── */
    public static function register_user() {
        check_ajax_referer('mf_nonce', 'nonce');

        $nickname = sanitize_text_field($_POST['nickname'] ?? '');
        $email    = sanitize_email($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';
        $roles    = array_map('sanitize_text_field', (array)($_POST['roles'] ?? []));

        if (empty($nickname) || empty($email) || empty($password)) {
            wp_send_json_error(['message' => 'All fields are required.']);
        }

        if (email_exists($email)) {
            wp_send_json_error(['message' => 'This email is already registered.']);
        }

        // Use nickname as username (sanitized)
        $username = sanitize_user(strtolower($nickname));
        if (username_exists($username)) {
            $username .= rand(100, 999);
        }

        $user_id = wp_create_user($username, $password, $email);
        if (is_wp_error($user_id)) {
            wp_send_json_error(['message' => $user_id->get_error_message()]);
        }

        // Set display name and meta
        wp_update_user(['ID' => $user_id, 'display_name' => $nickname]);
        update_user_meta($user_id, 'mf_nickname', $nickname);

        // Extra registration fields
        $fullname = sanitize_text_field($_POST['fullname'] ?? '');
        $country  = sanitize_text_field($_POST['country'] ?? '');
        $city     = sanitize_text_field($_POST['city'] ?? '');
        $extra1   = sanitize_text_field($_POST['extra1'] ?? '');
        $extra2   = sanitize_text_field($_POST['extra2'] ?? '');

        if ($fullname) update_user_meta($user_id, 'mf_fullname', $fullname);
        if ($country)  update_user_meta($user_id, 'mf_country', $country);
        if ($city)     update_user_meta($user_id, 'mf_city', $city);
        if ($extra1)   update_user_meta($user_id, 'mf_extra1', $extra1);
        if ($extra2)   update_user_meta($user_id, 'mf_extra2', $extra2);

        // Set primary forum role
        $role_map = [
            'Mini-Family'    => 'mini_family',
            'Mini-Expert'    => 'mini_expert',
            'Mini-Volunteer' => 'mini_volunteer',
            'Talk-Spot'      => 'talk_spot',
        ];

        $role_label_map = [
            'Mini-Family'    => 'Family',
            'Mini-Expert'    => 'Expert',
            'Mini-Volunteer' => 'Volunteer',
            'Talk-Spot'      => 'Talk-Spot',
        ];

        $user = new WP_User($user_id);
        $user->set_role('subscriber'); // base role

        if (!empty($roles)) {
            // Store primary forum role
            $primary = $roles[0];
            if (isset($role_label_map[$primary])) {
                update_user_meta($user_id, 'mf_role', $role_label_map[$primary]);
            }
            // Store all selected roles
            update_user_meta($user_id, 'mf_roles', $roles);
        }

        // ─── Pending-approval gate ─────────────────────────────────────────
        // New registrations are NOT auto-logged-in. They must wait for an
        // admin to flip the `mf_pending_approval` meta to 0 before login works.
        // (See `mf_block_pending_login` filter in mini-forum.php.)
        update_user_meta($user_id, 'mf_pending_approval', 1);
        update_user_meta($user_id, 'mf_pending_since', current_time('mysql'));

        // Notify the user
        $site_name  = get_bloginfo('name');
        $admin_mail = get_option('admin_email');
        $subject    = sprintf('[%s] We received your application', $site_name);
        $body       = sprintf(
            "Hi %s,\n\n" .
            "Thank you for joining %s! Your application is currently in pending review.\n\n" .
            "What happens next?\n" .
            "Our team will review your details and approve your account shortly. " .
            "You will receive a second email as soon as your account is active and you can log in.\n\n" .
            "If you have any questions in the meantime, just reply to this email and we'll get back to you.\n\n" .
            "— The Mini-Talks Team",
            $nickname, $site_name
        );
        wp_mail($email, $subject, $body);

        // Notify the admin (best-effort, doesn't block on failure)
        $admin_subject = sprintf('[%s] New pending registration: %s', $site_name, $nickname);
        $admin_body    = sprintf(
            "A new user has registered and is awaiting approval.\n\n" .
            "Nickname: %s\nFull name: %s\nEmail: %s\nRole: %s\nCity / Country: %s / %s\n\n" .
            "Review pending users in the Users admin screen (look for the Pending Approval column).",
            $nickname, $fullname, $email, ($roles[0] ?? '—'),
            ($city ?: '—'), ($country ?: '—')
        );
        if ($admin_mail) wp_mail($admin_mail, $admin_subject, $admin_body);

        wp_send_json_success([
            'message'  => 'Thank you! Your application is pending review.',
            'pending'  => true,
            'nickname' => $nickname,
        ]);
    }

    /* ── Login ── */
    /**
     * Change the signed-in user's password.
     * Requires the current password, so a hijacked session cannot lock the
     * owner out. The auth cookie is reissued afterwards; WordPress otherwise
     * invalidates it on a password change and signs the user straight out.
     */
    public static function change_password() {
        check_ajax_referer('mf_nonce', 'nonce');

        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'You need to be signed in.']);
        }

        $user    = wp_get_current_user();
        $current = $_POST['current_password'] ?? '';
        $new     = $_POST['new_password'] ?? '';

        if ($current === '' || $new === '') {
            wp_send_json_error(['message' => 'Please fill in all fields.']);
        }
        if (!wp_check_password($current, $user->user_pass, $user->ID)) {
            wp_send_json_error(['message' => 'Your current password is not correct.']);
        }
        if (strlen($new) < 8) {
            wp_send_json_error(['message' => 'New password must be at least 8 characters.']);
        }
        if ($new === $current) {
            wp_send_json_error(['message' => 'The new password must be different from the current one.']);
        }

        wp_set_password($new, $user->ID);

        // wp_set_password() clears the session; sign the user back in here so
        // the popup can report success instead of the page bouncing to login.
        wp_set_current_user($user->ID);
        wp_set_auth_cookie($user->ID, true);

        wp_send_json_success(['message' => 'Password updated.']);
    }

    public static function login_user() {
        check_ajax_referer('mf_nonce', 'nonce');

        $email    = sanitize_text_field($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';

        $user = get_user_by('email', $email);
        if (!$user) {
            // Try username
            $user = get_user_by('login', $email);
        }

        if (!$user || !wp_check_password($password, $user->user_pass, $user->ID)) {
            wp_send_json_error(['message' => 'Invalid credentials.']);
        }

        wp_set_current_user($user->ID);
        wp_set_auth_cookie($user->ID);

        wp_send_json_success([
            'message'  => 'Welcome back!',
            'nickname' => mf_get_nickname($user->ID),
            'role'     => mf_get_user_role($user->ID),
        ]);
    }

    /**
     * Real Story submission handler.
     * Saves the story as a private CPT post (status: pending) so an admin can
     * review and publish it from wp-admin → Posts → Real Stories.
     * Sends an admin notification email.
     */
    public static function submit_real_story() {
        check_ajax_referer('mf_nonce', 'nonce');

        $email    = sanitize_email($_POST['email'] ?? '');
        $nickname = sanitize_text_field($_POST['nickname'] ?? '');
        $story    = trim($_POST['story'] ?? '');
        $consent  = !empty($_POST['consent']) ? 1 : 0;

        // Validation
        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            wp_send_json_error(['message' => 'Please enter a valid email address.']);
        }
        if (!$nickname || mb_strlen($nickname) < 2) {
            wp_send_json_error(['message' => 'Please enter a nickname (at least 2 characters).']);
        }
        if (!$story || mb_strlen($story) < 30) {
            wp_send_json_error(['message' => 'Please share a bit more — at least 30 characters.']);
        }
        if (mb_strlen($story) > 8000) {
            wp_send_json_error(['message' => 'Story is too long (max 8000 characters).']);
        }

        // Insert as a pending post under our CPT
        $title = $nickname . ' — ' . wp_trim_words(strip_tags($story), 8, '…');
        $post_id = wp_insert_post([
            'post_type'    => 'mf_real_story',
            'post_status'  => 'pending',           // admin reviews & publishes
            'post_title'   => $title,
            'post_content' => wp_kses_post($story),
            'meta_input'   => [
                'mfs_email'       => $email,
                'mfs_nickname'    => $nickname,
                'mfs_consent'     => $consent,
                'mfs_user_id'     => is_user_logged_in() ? get_current_user_id() : 0,
                'mfs_submitted_at'=> current_time('mysql'),
                'mfs_submitter_ip'=> $_SERVER['REMOTE_ADDR'] ?? '',
            ],
        ], true);

        if (is_wp_error($post_id) || !$post_id) {
            wp_send_json_error(['message' => 'We could not save your story. Please try again.']);
        }

        // Notify admin
        $site_name  = get_bloginfo('name');
        $admin_mail = get_option('admin_email');
        if ($admin_mail) {
            $review_url = admin_url('post.php?action=edit&post=' . $post_id);
            $admin_subject = sprintf('[%s] New Real Story submission from %s', $site_name, $nickname);
            $admin_body    = sprintf(
                "A new Real Story has been submitted and is awaiting review.\n\n" .
                "Nickname: %s\nEmail: %s\nConsent to publish: %s\n\n" .
                "Story preview:\n%s\n\n" .
                "Review and publish:\n%s",
                $nickname, $email, ($consent ? 'Yes' : 'No'),
                wp_trim_words(strip_tags($story), 60, '…'),
                $review_url
            );
            wp_mail($admin_mail, $admin_subject, $admin_body);
        }

        // Confirmation to the submitter
        wp_mail(
            $email,
            sprintf('[%s] We received your story', $site_name),
            sprintf(
                "Hi %s,\n\n" .
                "Thank you for sharing your story with %s. Our team will review it and, if you agreed to publish, it will appear in the Real Stories section soon.\n\n" .
                "If you have any questions, just reply to this email.\n\n" .
                "— The Mini-Talks Team",
                $nickname, $site_name
            )
        );

        wp_send_json_success([
            'message' => $consent
                ? 'Thank you! Your story is in review and will appear in Real Stories once approved.'
                : 'Thank you! Your story has been received and will be kept confidential.',
        ]);
    }

    /**
     * Newsletter subscribe handler.
     * Saves the email as a published post under the mf_newsletter CPT, sends a
     * welcome email, and returns a success message that the widget shows inline.
     * Duplicate emails return a friendly "already subscribed" success (so we
     * don't leak which addresses are in the list).
     */
    public static function subscribe_newsletter() {
        check_ajax_referer('mf_nonce', 'nonce');

        $email = sanitize_email($_POST['email'] ?? '');
        $name  = sanitize_text_field($_POST['name']   ?? '');
        $src   = sanitize_text_field($_POST['source'] ?? 'footer');

        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            wp_send_json_error(['message' => 'Please enter a valid email address.']);
        }

        // Already subscribed?
        $existing = get_posts([
            'post_type'      => 'mf_newsletter',
            'post_status'    => ['publish', 'pending', 'draft'],
            'title'          => $email,
            'posts_per_page' => 1,
            'fields'         => 'ids',
            'no_found_rows'  => true,
        ]);
        if (!empty($existing)) {
            wp_send_json_success([
                'message' => "You're already subscribed — thanks for being with us!",
                'already' => true,
            ]);
        }

        $post_id = wp_insert_post([
            'post_type'   => 'mf_newsletter',
            'post_status' => 'publish',          // single opt-in (active immediately)
            'post_title'  => $email,
            'meta_input'  => [
                'mfn_email'        => $email,
                'mfn_name'         => $name,
                'mfn_source'       => $src,
                'mfn_subscribed_at'=> current_time('mysql'),
                'mfn_user_id'      => is_user_logged_in() ? get_current_user_id() : 0,
                'mfn_ip'           => $_SERVER['REMOTE_ADDR'] ?? '',
            ],
        ], true);

        if (is_wp_error($post_id) || !$post_id) {
            wp_send_json_error(['message' => 'Could not save your subscription. Please try again.']);
        }

        $site_name = get_bloginfo('name');
        wp_mail(
            $email,
            sprintf('[%s] Welcome to the Mini-Talks newsletter', $site_name),
            sprintf(
                "Hi%s,\n\n" .
                "Thanks for subscribing to the %s newsletter! You'll be the first to hear about new stories, events, workshops, and updates from our community.\n\n" .
                "If you ever want to unsubscribe, just reply to this email and we'll take care of it.\n\n" .
                "— The Mini-Talks Team",
                $name ? ' ' . $name : '',
                $site_name
            )
        );

        wp_send_json_success([
            'message' => 'Thanks for subscribing! Check your inbox for a welcome email.',
        ]);
    }
}

Mini_Forum_Ajax::init();
