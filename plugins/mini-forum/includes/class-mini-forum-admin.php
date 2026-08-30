<?php
if (!defined('ABSPATH')) exit;

class Mini_Forum_Admin {

    public static function init() {
        add_action('admin_menu',           [__CLASS__, 'register_menus']);
        add_action('admin_init',           [__CLASS__, 'handle_actions']);
        add_action('admin_enqueue_scripts',[__CLASS__, 'enqueue_assets']);
        add_action('admin_notices',        [__CLASS__, 'show_notice']);
    }

    /* ── Menu Registration ── */
    public static function register_menus() {
        global $wpdb;
        $her_pending = (int)$wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}mf_host_event_requests WHERE status IN ('new','reviewing')");
        $upd_pending = (int)$wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}mf_community_updates WHERE status='pending'");
        $total = $her_pending + $upd_pending;

        $badge = $total > 0 ? ' <span class="awaiting-mod count-' . $total . '"><span class="pending-count">' . $total . '</span></span>' : '';
        $her_b = $her_pending > 0 ? ' <span class="awaiting-mod"><span class="pending-count">' . $her_pending . '</span></span>' : '';
        $upd_b = $upd_pending > 0 ? ' <span class="awaiting-mod"><span class="pending-count">' . $upd_pending . '</span></span>' : '';

        add_menu_page('Mini-Events', 'Mini-Events' . $badge, 'manage_options', 'mfe-dashboard',
            [__CLASS__, 'page_dashboard'], 'dashicons-calendar-alt', 30);

        add_submenu_page('mfe-dashboard', 'Dashboard',                'Dashboard',          'manage_options', 'mfe-dashboard',     [__CLASS__, 'page_dashboard']);
        add_submenu_page('mfe-dashboard', 'Mini-Events',              'Events',             'manage_options', 'mfe-events',        [__CLASS__, 'page_events']);
        add_submenu_page('mfe-dashboard', 'Host Requests',            'Host Requests' . $her_b, 'manage_options', 'mfe-host',      [__CLASS__, 'page_host_requests']);
        add_submenu_page('mfe-dashboard', 'Mini-Community Updates',   'Community Updates' . $upd_b, 'manage_options', 'mfe-updates', [__CLASS__, 'page_updates']);
        add_submenu_page('mfe-dashboard', 'Mini-Special Days',        'Special Days',       'manage_options', 'mfe-special-days',  [__CLASS__, 'page_special_days']);
    }

    /* ── Action handler (POST) ── */
    public static function handle_actions() {
        if (!is_admin() || !current_user_can('manage_options')) return;
        if (empty($_POST['mfe_action'])) return;
        if (!isset($_POST['_wpnonce']) || !wp_verify_nonce($_POST['_wpnonce'], 'mfe_admin')) return;

        $action = sanitize_text_field($_POST['mfe_action']);
        switch ($action) {
            case 'event_save':    self::do_event_save();     break;
            case 'event_delete':  self::do_event_delete();   break;
            case 'her_update':    self::do_her_update();     break;
            case 'her_delete':    self::do_her_delete();     break;
            case 'her_to_event':  self::do_her_to_event();   break;
            case 'upd_save':      self::do_upd_save();       break;
            case 'upd_status':    self::do_upd_status();     break;
            case 'upd_delete':    self::do_upd_delete();     break;
            case 'sd_save':       self::do_sd_save();        break;
            case 'sd_delete':     self::do_sd_delete();      break;
        }
    }

    public static function enqueue_assets($hook) {
        if (strpos($hook, 'mfe-') === false && strpos($hook, 'mini-events') === false) return;
        // WP Media Library — needed for image picker on Special Days form
        wp_enqueue_media();
        wp_add_inline_style('wp-admin', '
            .mfe-card{background:#fff;border:1px solid #c3c4c7;border-radius:6px;padding:18px 20px;margin-bottom:16px}
            .mfe-stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:24px}
            .mfe-stat{background:#fff;border-left:5px solid #2271b1;border-radius:6px;padding:14px 18px;box-shadow:0 1px 1px rgba(0,0,0,.04)}
            .mfe-stat-num{font-size:28px;font-weight:700;color:#1d2327;line-height:1.1;margin:0}
            .mfe-stat-lbl{font-size:12px;color:#646970;text-transform:uppercase;letter-spacing:.4px;font-weight:600;margin-top:4px;display:block}
            .mfe-stat.green{border-color:#00a32a}.mfe-stat.red{border-color:#d63638}.mfe-stat.yellow{border-color:#dba617}.mfe-stat.blue{border-color:#2271b1}
            .mfe-status{display:inline-block;padding:3px 10px;border-radius:10px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.3px}
            .mfe-st-new{background:#e7f5fa;color:#005670}
            .mfe-st-reviewing{background:#fcf9e8;color:#7a5a00}
            .mfe-st-approved,.mfe-st-published,.mfe-st-completed{background:#edfaef;color:#00622a}
            .mfe-st-rejected,.mfe-st-cancelled{background:#fbeaea;color:#8a1f24}
            .mfe-st-pending,.mfe-st-draft{background:#fff;color:#646970;border:1px solid #dcdcde}
            .mfe-form-row{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:16px}
            .mfe-form-row.full{grid-template-columns:1fr}
            .mfe-form-row label{display:block;font-weight:600;color:#1d2327;margin-bottom:6px;font-size:13px}
            .mfe-form-row input[type="text"],.mfe-form-row input[type="email"],.mfe-form-row input[type="date"],.mfe-form-row input[type="datetime-local"],.mfe-form-row input[type="number"],.mfe-form-row select,.mfe-form-row textarea{width:100%;padding:7px 10px;border:1px solid #8c8f94;border-radius:4px;font-size:13px}
            .mfe-form-row textarea{min-height:120px;resize:vertical;font-family:inherit}
            .mfe-actions{display:flex;gap:8px;flex-wrap:wrap}
            table.widefat td .mfe-actions a,table.widefat td .mfe-actions button{font-size:12px}
            .mfe-table-toolbar{display:flex;gap:14px;align-items:center;margin-bottom:14px;flex-wrap:wrap}
            .mfe-filter-link{padding:5px 12px;border-radius:4px;text-decoration:none;font-size:13px;color:#2271b1;border:1px solid transparent}
            .mfe-filter-link.active{background:#2271b1;color:#fff;border-color:#2271b1}
            .mfe-her-detail{display:grid;grid-template-columns:1fr 1fr;gap:24px}
            .mfe-her-detail dt{font-weight:600;color:#646970;font-size:11px;text-transform:uppercase;letter-spacing:.4px;margin-top:10px}
            .mfe-her-detail dd{margin:4px 0 0;font-size:14px;color:#1d2327}
            .mfe-media-picker{padding:12px;background:#f6f7f7;border:1px solid #dcdcde;border-radius:4px}
            .mfe-media-thumbs{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;min-height:0}
            .mfe-media-thumbs:empty{display:none}
            .mfe-media-thumb{position:relative;display:inline-block;width:96px;height:72px;border-radius:4px;overflow:hidden;background:#fff;border:1px solid #dcdcde}
            .mfe-media-thumb img{width:100%;height:100%;object-fit:cover;display:block}
            .mfe-media-remove{position:absolute;top:2px;right:2px;width:22px;height:22px;border-radius:50%;border:none;background:rgba(0,0,0,.65);color:#fff;font-size:16px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
            .mfe-media-remove:hover{background:#d63638}
        ');
        wp_add_inline_script('media-editor', "
            jQuery(function($){
              var picker = $('#mfe-sd-media-picker');
              if (picker.length) {
                var \$input  = picker.find('#mfe-sd-images-input');
                var \$thumbs = picker.find('#mfe-sd-media-thumbs');

                function readUrls(){
                  try { var v = JSON.parse(\$input.val() || '[]'); return Array.isArray(v) ? v : []; }
                  catch(e){ return []; }
                }
                function writeUrls(urls){
                  \$input.val(JSON.stringify(urls));
                  renderThumbs(urls);
                }
                function renderThumbs(urls){
                  \$thumbs.empty();
                  urls.forEach(function(url){
                    \$thumbs.append('<span class=\"mfe-media-thumb\" data-url=\"'+url+'\"><img src=\"'+url+'\" alt=\"\"/><button type=\"button\" class=\"mfe-media-remove\" aria-label=\"Remove\">&times;</button></span>');
                  });
                }

                picker.on('click', '#mfe-sd-media-add', function(e){
                  e.preventDefault();
                  var frame = wp.media({ title: 'Select Images', button: { text: 'Add to gallery' }, multiple: true, library: { type: 'image' } });
                  frame.on('select', function(){
                    var sels = frame.state().get('selection').toJSON();
                    var urls = readUrls();
                    sels.forEach(function(a){ if (a.url && urls.indexOf(a.url) === -1) urls.push(a.url); });
                    writeUrls(urls);
                  });
                  frame.open();
                });

                picker.on('click', '.mfe-media-remove', function(e){
                  e.preventDefault();
                  var url = \$(this).closest('.mfe-media-thumb').data('url');
                  var urls = readUrls().filter(function(u){ return u !== url; });
                  writeUrls(urls);
                });
              }

              // ── Event Cover Image (single-select) ──
              \$('#mfe-event-cover-pick').on('click', function(e){
                e.preventDefault();
                var frame = wp.media({ title: 'Choose Cover Image', button: { text: 'Use this image' }, multiple: false, library: { type: 'image' } });
                frame.on('select', function(){
                  var att = frame.state().get('selection').first().toJSON();
                  \$('#mfe-event-cover-url').val(att.url);
                  \$('#mfe-event-cover-preview').html('<img src=\"'+att.url+'\" alt=\"\" style=\"max-width:200px;max-height:120px;border-radius:6px;border:1px solid #dcdcde\" />');
                });
                frame.open();
              });
              \$(document).on('click', '#mfe-event-cover-clear', function(e){
                e.preventDefault();
                \$('#mfe-event-cover-url').val('');
                \$('#mfe-event-cover-preview').empty();
              });
              \$(document).on('click', '#mfe-event-cover-default', function(e){
                e.preventDefault();
                var defaultUrl = 'https://mini-talks.org/wp-content/uploads/2025/12/header.png';
                \$('#mfe-event-cover-url').val(defaultUrl);
                \$('#mfe-event-cover-preview').html('<img src=\"'+defaultUrl+'\" alt=\"\" style=\"max-width:200px;max-height:120px;border-radius:6px;border:1px solid #dcdcde\" />');
              });

              // ── Event Gallery Images (multi-select) — uses same JSON pattern as SD ──
              var gpicker = \$('#mfe-event-gallery-picker');
              if (gpicker.length) {
                var \$gInput  = gpicker.find('#mfe-event-gallery-input');
                var \$gThumbs = gpicker.find('#mfe-event-gallery-thumbs');

                function readGUrls(){
                  try { var v = JSON.parse(\$gInput.val() || '[]'); return Array.isArray(v) ? v : []; }
                  catch(e){ return []; }
                }
                function writeGUrls(urls){
                  \$gInput.val(JSON.stringify(urls));
                  renderGThumbs(urls);
                }
                function renderGThumbs(urls){
                  \$gThumbs.empty();
                  urls.forEach(function(url){
                    \$gThumbs.append('<span class=\"mfe-media-thumb\" data-url=\"'+url+'\"><img src=\"'+url+'\" alt=\"\"/><button type=\"button\" class=\"mfe-media-remove mfe-event-gallery-remove\" aria-label=\"Remove\">&times;</button></span>');
                  });
                }

                gpicker.on('click', '#mfe-event-gallery-add', function(e){
                  e.preventDefault();
                  var frame = wp.media({ title: 'Add Event Photos', button: { text: 'Add to gallery' }, multiple: true, library: { type: 'image' } });
                  frame.on('select', function(){
                    var sels = frame.state().get('selection').toJSON();
                    var urls = readGUrls();
                    sels.forEach(function(a){ if (a.url && urls.indexOf(a.url) === -1) urls.push(a.url); });
                    writeGUrls(urls);
                  });
                  frame.open();
                });

                gpicker.on('click', '.mfe-event-gallery-remove', function(e){
                  e.preventDefault();
                  var url = \$(this).closest('.mfe-media-thumb').data('url');
                  var urls = readGUrls().filter(function(u){ return u !== url; });
                  writeGUrls(urls);
                });
              }
            });
        ");
    }

    public static function show_notice() {
        if (empty($_GET['mfe_msg'])) return;
        $msg_map = [
            'event_saved'   => ['updated', 'Event saved.'],
            'event_deleted' => ['updated', 'Event deleted.'],
            'her_updated'   => ['updated', 'Host request updated.'],
            'her_deleted'   => ['updated', 'Host request deleted.'],
            'her_converted' => ['updated', 'Host request converted to event (draft).'],
            'upd_saved'     => ['updated', 'Update saved.'],
            'upd_status'    => ['updated', 'Update status changed.'],
            'upd_deleted'   => ['updated', 'Update deleted.'],
            'sd_saved'      => ['updated', 'Special day saved.'],
            'sd_deleted'    => ['updated', 'Special day deleted.'],
            'error'         => ['error',   'Operation failed. Please check inputs.'],
        ];
        $key = sanitize_text_field($_GET['mfe_msg']);
        if (!isset($msg_map[$key])) return;
        list($cls, $text) = $msg_map[$key];
        printf('<div class="notice notice-%s is-dismissible"><p>%s</p></div>', esc_attr($cls), esc_html($text));
    }

    private static function redirect($page, $extra = []) {
        $url = admin_url('admin.php?page=' . $page);
        foreach ($extra as $k => $v) $url = add_query_arg($k, $v, $url);
        wp_safe_redirect($url); exit;
    }

    /* ═══════════════════════ DASHBOARD ═══════════════════════ */
    public static function page_dashboard() {
        global $wpdb;
        $stats = [
            'events_total'    => (int)$wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}mf_events WHERE status='published'"),
            'events_upcoming' => (int)$wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}mf_events WHERE status='published' AND start_datetime > NOW()"),
            'her_pending'     => (int)$wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}mf_host_event_requests WHERE status IN ('new','reviewing')"),
            'upd_pending'     => (int)$wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}mf_community_updates WHERE status='pending'"),
            'upd_total'       => (int)$wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}mf_community_updates WHERE status='published'"),
            'sd_total'        => (int)$wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}mf_special_days WHERE status='published'"),
        ];

        $recent_her = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}mf_host_event_requests ORDER BY created_at DESC LIMIT 5");
        $recent_events = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}mf_events ORDER BY start_datetime DESC LIMIT 5");

        ?>
        <div class="wrap">
          <h1>Mini-Events Dashboard</h1>

          <div class="mfe-stats-row">
            <div class="mfe-stat blue"><p class="mfe-stat-num"><?php echo $stats['events_total']; ?></p><span class="mfe-stat-lbl">Published Events</span></div>
            <div class="mfe-stat green"><p class="mfe-stat-num"><?php echo $stats['events_upcoming']; ?></p><span class="mfe-stat-lbl">Upcoming</span></div>
            <div class="mfe-stat yellow"><p class="mfe-stat-num"><?php echo $stats['her_pending']; ?></p><span class="mfe-stat-lbl">Host Requests Pending</span></div>
            <div class="mfe-stat red"><p class="mfe-stat-num"><?php echo $stats['upd_pending']; ?></p><span class="mfe-stat-lbl">Updates Pending</span></div>
            <div class="mfe-stat blue"><p class="mfe-stat-num"><?php echo $stats['upd_total']; ?></p><span class="mfe-stat-lbl">Total Updates</span></div>
            <div class="mfe-stat yellow"><p class="mfe-stat-num"><?php echo $stats['sd_total']; ?></p><span class="mfe-stat-lbl">Special Days</span></div>
          </div>

          <div class="mfe-card">
            <h2>Recent Host Requests</h2>
            <?php if ($recent_her): ?>
            <table class="widefat striped">
              <thead><tr><th>From</th><th>Type</th><th>City</th><th>Status</th><th>Date</th><th></th></tr></thead>
              <tbody>
                <?php foreach ($recent_her as $r): ?>
                <tr>
                  <td><strong><?php echo esc_html($r->full_name); ?></strong><br><small><?php echo esc_html($r->email); ?></small></td>
                  <td><?php echo esc_html(ucfirst($r->event_type)); ?></td>
                  <td><?php echo esc_html($r->city ?: '—'); ?></td>
                  <td><span class="mfe-status mfe-st-<?php echo esc_attr($r->status); ?>"><?php echo esc_html($r->status); ?></span></td>
                  <td><?php echo esc_html(date('Y-m-d', strtotime($r->created_at))); ?></td>
                  <td><a class="button button-small" href="<?php echo esc_url(admin_url('admin.php?page=mfe-host&id=' . $r->id)); ?>">Review</a></td>
                </tr>
                <?php endforeach; ?>
              </tbody>
            </table>
            <?php else: ?><p>No host requests yet.</p><?php endif; ?>
          </div>

          <div class="mfe-card">
            <h2>Recent Events</h2>
            <?php if ($recent_events): ?>
            <table class="widefat striped">
              <thead><tr><th>Title</th><th>Type</th><th>Start</th><th>City</th><th>Status</th></tr></thead>
              <tbody>
                <?php foreach ($recent_events as $e): ?>
                <tr>
                  <td><a href="<?php echo esc_url(admin_url('admin.php?page=mfe-events&action=edit&id=' . $e->id)); ?>"><strong><?php echo esc_html($e->title); ?></strong></a></td>
                  <td><?php echo esc_html(str_replace('_',' ',ucfirst($e->event_type))); ?></td>
                  <td><?php echo esc_html(date('Y-m-d H:i', strtotime($e->start_datetime))); ?></td>
                  <td><?php echo esc_html($e->city ?: '—'); ?></td>
                  <td><span class="mfe-status mfe-st-<?php echo esc_attr($e->status); ?>"><?php echo esc_html($e->status); ?></span></td>
                </tr>
                <?php endforeach; ?>
              </tbody>
            </table>
            <?php else: ?><p>No events yet.</p><?php endif; ?>
          </div>
        </div>
        <?php
    }

    /* ═══════════════════════ EVENTS ═══════════════════════ */
    public static function page_events() {
        $action = sanitize_text_field($_GET['action'] ?? 'list');
        if (in_array($action, ['edit','new'], true)) { self::render_event_form(); return; }
        self::render_events_list();
    }

    private static function render_events_list() {
        global $wpdb;
        $te = $wpdb->prefix . 'mf_events';
        $filter_status = sanitize_text_field($_GET['status'] ?? 'all');
        $filter_type   = sanitize_text_field($_GET['type'] ?? 'all');

        $where = ['1=1'];
        if ($filter_status !== 'all') $where[] = $wpdb->prepare('status = %s', $filter_status);
        if ($filter_type !== 'all')   $where[] = $wpdb->prepare('event_type = %s', $filter_type);
        $where_sql = implode(' AND ', $where);

        $rows = $wpdb->get_results("SELECT * FROM $te WHERE $where_sql ORDER BY start_datetime DESC LIMIT 100");

        $statuses = ['all','published','draft','cancelled','completed'];
        $types    = ['all','workshop','meetup','expert_session','talkspot','specialday','milestone'];
        ?>
        <div class="wrap">
          <h1>Events <a class="page-title-action" href="<?php echo esc_url(admin_url('admin.php?page=mfe-events&action=new')); ?>">Add New</a></h1>

          <div class="mfe-table-toolbar">
            <span><strong>Status:</strong></span>
            <?php foreach ($statuses as $s): $u = add_query_arg('status', $s, admin_url('admin.php?page=mfe-events')); ?>
              <a class="mfe-filter-link <?php echo $filter_status===$s?'active':''; ?>" href="<?php echo esc_url($u); ?>"><?php echo esc_html(ucfirst($s)); ?></a>
            <?php endforeach; ?>
            <span style="margin-left:14px"><strong>Type:</strong></span>
            <?php foreach ($types as $t): $u = add_query_arg('type', $t, admin_url('admin.php?page=mfe-events')); ?>
              <a class="mfe-filter-link <?php echo $filter_type===$t?'active':''; ?>" href="<?php echo esc_url($u); ?>"><?php echo esc_html(str_replace('_',' ',ucfirst($t))); ?></a>
            <?php endforeach; ?>
          </div>

          <table class="widefat striped">
            <thead><tr><th>Title</th><th>Type</th><th>Start</th><th>City</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
            <?php if ($rows): foreach ($rows as $r): ?>
              <tr>
                <td><a href="<?php echo esc_url(admin_url('admin.php?page=mfe-events&action=edit&id='.$r->id)); ?>"><strong><?php echo esc_html($r->title); ?></strong></a><br><small><?php echo esc_html($r->location_name); ?></small></td>
                <td><?php echo esc_html(str_replace('_',' ',ucfirst($r->event_type))); ?></td>
                <td><?php echo esc_html(date('Y-m-d H:i', strtotime($r->start_datetime))); ?></td>
                <td><?php echo esc_html($r->city ?: '—'); ?></td>
                <td><span class="mfe-status mfe-st-<?php echo esc_attr($r->status); ?>"><?php echo esc_html($r->status); ?></span></td>
                <td>
                  <div class="mfe-actions">
                    <a class="button button-small" href="<?php echo esc_url(admin_url('admin.php?page=mfe-events&action=edit&id='.$r->id)); ?>">Edit</a>
                    <form method="post" style="display:inline" onsubmit="return confirm('Delete this event?')">
                      <?php wp_nonce_field('mfe_admin'); ?>
                      <input type="hidden" name="mfe_action" value="event_delete" />
                      <input type="hidden" name="id" value="<?php echo (int)$r->id; ?>" />
                      <button class="button button-small button-link-delete" type="submit">Delete</button>
                    </form>
                  </div>
                </td>
              </tr>
            <?php endforeach; else: ?>
              <tr><td colspan="6"><em>No events match these filters.</em></td></tr>
            <?php endif; ?>
            </tbody>
          </table>
        </div>
        <?php
    }

    private static function render_event_form() {
        global $wpdb;
        $id = intval($_GET['id'] ?? 0);
        $row = $id ? $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}mf_events WHERE id=%d", $id)) : null;
        $is_new = !$row;
        $title = $is_new ? 'Add New Event' : 'Edit Event';
        $get = function($k, $d='') use($row){ return $row && isset($row->$k) ? $row->$k : $d; };
        ?>
        <div class="wrap">
          <h1><?php echo esc_html($title); ?> <a class="page-title-action" href="<?php echo esc_url(admin_url('admin.php?page=mfe-events')); ?>">← Back</a></h1>
          <form method="post" class="mfe-card">
            <?php wp_nonce_field('mfe_admin'); ?>
            <input type="hidden" name="mfe_action" value="event_save" />
            <input type="hidden" name="id" value="<?php echo (int)$id; ?>" />

            <div class="mfe-form-row full"><label>Title *<input type="text" name="title" required value="<?php echo esc_attr($get('title')); ?>" /></label></div>

            <div class="mfe-form-row">
              <label>Type
                <select name="event_type">
                  <?php foreach (['workshop','meetup','expert_session'] as $t): ?>
                    <option value="<?php echo $t; ?>" <?php selected($get('event_type','meetup'), $t); ?>><?php echo str_replace('_',' ',ucfirst($t)); ?></option>
                  <?php endforeach; ?>
                </select>
                <span class="description" style="display:block;margin-top:4px;color:#666;font-size:11px">For Updates, use Community Updates section. For Special Days, use Special Days section.</span>
              </label>
              <label>Status
                <select name="status">
                  <?php foreach (['draft','published','cancelled','completed'] as $s): ?>
                    <option value="<?php echo $s; ?>" <?php selected($get('status','published'), $s); ?>><?php echo ucfirst($s); ?></option>
                  <?php endforeach; ?>
                </select>
              </label>
            </div>

            <div class="mfe-form-row">
              <label>Start *<input type="datetime-local" name="start_datetime" required value="<?php echo esc_attr($row ? date('Y-m-d\TH:i', strtotime($row->start_datetime)) : ''); ?>" /></label>
              <label>End<input type="datetime-local" name="end_datetime" value="<?php echo esc_attr($row && $row->end_datetime ? date('Y-m-d\TH:i', strtotime($row->end_datetime)) : ''); ?>" /></label>
            </div>

            <div class="mfe-form-row">
              <label>Location Name<input type="text" name="location_name" value="<?php echo esc_attr($get('location_name')); ?>" /></label>
              <label>City<input type="text" name="city" value="<?php echo esc_attr($get('city')); ?>" placeholder="e.g. Izmir / Istanbul / Online" /></label>
            </div>

            <div class="mfe-form-row">
              <label>Format Type<input type="text" name="format_type" value="<?php echo esc_attr($get('format_type')); ?>" placeholder="small_group / 1on1 / open / online" /></label>
              <label>Cover Image <small style="color:#888;font-weight:normal">(optional — leave empty for the compact no-image layout)</small>
                <input type="hidden" id="mfe-event-cover-url" name="cover_image_url" value="<?php echo esc_attr($get('cover_image_url')); ?>" />
                <span style="display:inline-flex;gap:8px;align-items:center;margin-top:4px;flex-wrap:wrap">
                  <button type="button" class="button" id="mfe-event-cover-pick">Choose Image</button>
                  <button type="button" class="button" id="mfe-event-cover-default">Use Default</button>
                  <button type="button" class="button-link" id="mfe-event-cover-clear" style="color:#a00">Clear</button>
                </span>
                <div id="mfe-event-cover-preview" style="margin-top:8px"><?php
                  $cov = $get('cover_image_url');
                  if ($cov) echo '<img src="' . esc_url($cov) . '" alt="" style="max-width:200px;max-height:120px;border-radius:6px;border:1px solid #dcdcde" />';
                ?></div>
              </label>
            </div>

            <div class="mfe-form-row full">
              <label>Short Description (shown on event cards — keep brief, supports bold / italic / color)</label>
              <?php
                wp_editor($get('short_description'), 'mfe_event_short_desc', [
                    'textarea_name' => 'short_description',
                    'media_buttons' => false,
                    'textarea_rows' => 3,
                    'teeny'         => true,
                    'tinymce'       => [
                        'toolbar1' => 'bold,italic,underline,forecolor,link,unlink,undo,redo',
                    ],
                    'quicktags'     => false,
                ]);
              ?>
            </div>
            <div class="mfe-form-row full"><label>Full Description (rich text — supports <strong>bold</strong>, <em>italics</em>, colors, links)
              <?php
                wp_editor($get('description'), 'mfe_event_description', [
                    'textarea_name' => 'description',
                    'media_buttons' => false,
                    'textarea_rows' => 10,
                    'teeny'         => false,
                    'tinymce'       => [
                        'toolbar1' => 'bold,italic,underline,forecolor,bullist,numlist,link,unlink,undo,redo',
                        'toolbar2' => '',
                    ],
                    'quicktags'     => false,
                ]);
              ?>
            </label></div>

            <div class="mfe-form-row full">
              <label>Gallery Images <small>(post-event photos — shown in detail popup)</small></label>
              <div id="mfe-event-gallery-picker">
                <?php
                  $gallery_raw = $get('gallery_images', '');
                  $gallery_arr = [];
                  if ($gallery_raw) { $gd = json_decode($gallery_raw, true); if (is_array($gd)) $gallery_arr = $gd; }
                  $gallery_json = $gallery_raw ? wp_json_encode($gallery_arr) : '[]';
                ?>
                <input type="hidden" id="mfe-event-gallery-input" name="gallery_images" value='<?php echo esc_attr($gallery_json); ?>' />
                <div id="mfe-event-gallery-thumbs" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">
                  <?php foreach ($gallery_arr as $url): ?>
                    <span class="mfe-media-thumb" data-url="<?php echo esc_attr($url); ?>">
                      <img src="<?php echo esc_url($url); ?>" alt="" />
                      <button type="button" class="mfe-media-remove mfe-event-gallery-remove" aria-label="Remove">&times;</button>
                    </span>
                  <?php endforeach; ?>
                </div>
                <button type="button" class="button" id="mfe-event-gallery-add">+ Add Photos</button>
              </div>
              <p class="description" style="margin-top:6px;color:#666">For past events, add photos taken during the event. They will appear in the detail popup gallery.</p>
            </div>

            <p><button class="button button-primary" type="submit">Save Event</button></p>
          </form>
        </div>
        <?php
    }

    private static function do_event_save() {
        global $wpdb;
        $te = $wpdb->prefix . 'mf_events';
        $id = intval($_POST['id'] ?? 0);
        $title = sanitize_text_field($_POST['title'] ?? '');
        if (empty($title)) self::redirect('mfe-events', ['mfe_msg'=>'error']);

        $data = [
            'title'             => $title,
            'slug'              => sanitize_title($title) . '-' . wp_generate_password(4, false, false),
            'event_type'        => sanitize_text_field($_POST['event_type'] ?? 'meetup'),
            'status'            => sanitize_text_field($_POST['status'] ?? 'published'),
            'start_datetime'    => sanitize_text_field(str_replace('T',' ', $_POST['start_datetime'] ?? '') ) . ':00',
            'end_datetime'      => !empty($_POST['end_datetime']) ? sanitize_text_field(str_replace('T',' ', $_POST['end_datetime'])) . ':00' : null,
            'location_name'     => sanitize_text_field($_POST['location_name'] ?? ''),
            'city'              => sanitize_text_field($_POST['city'] ?? ''),
            'format_type'       => sanitize_text_field($_POST['format_type'] ?? ''),
            'cover_image_url'   => esc_url_raw($_POST['cover_image_url'] ?? ''),
            'short_description' => wp_kses($_POST['short_description'] ?? '', ['strong'=>[],'b'=>[],'em'=>[],'i'=>[],'u'=>[],'br'=>[],'span'=>['style'=>true],'a'=>['href'=>true,'target'=>true,'rel'=>true]]),
            'description'       => wp_kses_post($_POST['description'] ?? ''),
        ];

        // Gallery images — comes as JSON from the media picker
        $gallery_raw = isset($_POST['gallery_images']) ? wp_unslash($_POST['gallery_images']) : '';
        $gallery = [];
        if ($gallery_raw) {
            $decoded = json_decode($gallery_raw, true);
            if (is_array($decoded)) {
                foreach ($decoded as $url) {
                    $clean = esc_url_raw(trim((string)$url));
                    if ($clean) $gallery[] = $clean;
                }
            }
        }
        $data['gallery_images'] = !empty($gallery) ? wp_json_encode($gallery) : null;

        if ($id > 0) {
            unset($data['slug']); // don't regen slug on edit
            $wpdb->update($te, $data, ['id' => $id]);
        } else {
            $wpdb->insert($te, $data);
            $id = (int)$wpdb->insert_id;
        }
        self::redirect('mfe-events', ['mfe_msg'=>'event_saved','action'=>'edit','id'=>$id]);
    }

    private static function do_event_delete() {
        global $wpdb;
        $id = intval($_POST['id'] ?? 0);
        if ($id > 0) $wpdb->delete($wpdb->prefix . 'mf_events', ['id' => $id]);
        self::redirect('mfe-events', ['mfe_msg'=>'event_deleted']);
    }

    /* ═══════════════════════ HOST REQUESTS ═══════════════════════ */
    public static function page_host_requests() {
        $id = intval($_GET['id'] ?? 0);
        if ($id > 0) { self::render_her_detail($id); return; }
        self::render_her_list();
    }

    private static function render_her_list() {
        global $wpdb;
        $th = $wpdb->prefix . 'mf_host_event_requests';
        $f = sanitize_text_field($_GET['status'] ?? 'all');
        $where = $f === 'all' ? '1=1' : $wpdb->prepare('status = %s', $f);
        $rows = $wpdb->get_results("SELECT * FROM $th WHERE $where ORDER BY created_at DESC LIMIT 100");
        ?>
        <div class="wrap">
          <h1>Host Requests</h1>
          <div class="mfe-table-toolbar">
            <strong>Status:</strong>
            <?php foreach (['all','new','reviewing','approved','rejected'] as $s): $u = add_query_arg('status',$s,admin_url('admin.php?page=mfe-host')); ?>
              <a class="mfe-filter-link <?php echo $f===$s?'active':''; ?>" href="<?php echo esc_url($u); ?>"><?php echo esc_html(ucfirst($s)); ?></a>
            <?php endforeach; ?>
          </div>

          <table class="widefat striped">
            <thead><tr><th>Submitted</th><th>From</th><th>Type</th><th>City</th><th>Preferred Date</th><th>Status</th><th></th></tr></thead>
            <tbody>
            <?php if ($rows): foreach ($rows as $r): ?>
              <tr>
                <td><?php echo esc_html(date('Y-m-d H:i', strtotime($r->created_at))); ?></td>
                <td><strong><?php echo esc_html($r->full_name); ?></strong><br><small><?php echo esc_html($r->email); ?></small></td>
                <td><?php echo esc_html(str_replace('_',' ',ucfirst($r->event_type))); ?></td>
                <td><?php echo esc_html($r->city ?: '—'); ?></td>
                <td><?php echo $r->preferred_date ? esc_html($r->preferred_date) : '—'; ?></td>
                <td><span class="mfe-status mfe-st-<?php echo esc_attr($r->status); ?>"><?php echo esc_html($r->status); ?></span></td>
                <td><a class="button button-small" href="<?php echo esc_url(admin_url('admin.php?page=mfe-host&id='.$r->id)); ?>">Review</a></td>
              </tr>
            <?php endforeach; else: ?>
              <tr><td colspan="7"><em>No requests.</em></td></tr>
            <?php endif; ?>
            </tbody>
          </table>
        </div>
        <?php
    }

    private static function render_her_detail($id) {
        global $wpdb;
        $r = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}mf_host_event_requests WHERE id=%d", $id));
        if (!$r) { echo '<div class="wrap"><h1>Not found</h1></div>'; return; }
        ?>
        <div class="wrap">
          <h1>Host Request #<?php echo (int)$r->id; ?> <a class="page-title-action" href="<?php echo esc_url(admin_url('admin.php?page=mfe-host')); ?>">← Back</a></h1>

          <div class="mfe-card">
            <dl class="mfe-her-detail">
              <div><dt>From</dt><dd><strong><?php echo esc_html($r->full_name); ?></strong> &lt;<?php echo esc_html($r->email); ?>&gt;</dd></div>
              <div><dt>Role</dt><dd><?php echo esc_html($r->requester_role ?: '—'); ?></dd></div>
              <div><dt>Event Type</dt><dd><?php echo esc_html(str_replace('_',' ',ucfirst($r->event_type))); ?></dd></div>
              <div><dt>City</dt><dd><?php echo esc_html($r->city ?: '—'); ?></dd></div>
              <div><dt>Location / Venue</dt><dd><?php echo esc_html($r->location_name ?: '—'); ?></dd></div>
              <div><dt>Preferred Date</dt><dd><?php echo esc_html($r->preferred_date ?: '—'); ?></dd></div>
              <div><dt>Submitted</dt><dd><?php echo esc_html(date('Y-m-d H:i', strtotime($r->created_at))); ?></dd></div>
              <div><dt>Status</dt><dd><span class="mfe-status mfe-st-<?php echo esc_attr($r->status); ?>"><?php echo esc_html($r->status); ?></span></dd></div>
            </dl>
            <hr style="margin:20px 0">
            <h3>Proposal</h3>
            <p style="white-space:pre-wrap;background:#f6f7f7;padding:14px;border-radius:6px"><?php echo esc_html($r->proposal_text); ?></p>
            <?php if ($r->venue_type || $r->space_notes): ?>
            <h3>Venue Details</h3>
            <p><strong>Venue type:</strong> <?php echo esc_html($r->venue_type ?: '—'); ?></p>
            <?php if ($r->space_notes): ?><p style="white-space:pre-wrap;background:#f6f7f7;padding:14px;border-radius:6px"><?php echo esc_html($r->space_notes); ?></p><?php endif; ?>
            <?php endif; ?>
          </div>

          <div class="mfe-card">
            <h2>Update Status</h2>
            <form method="post">
              <?php wp_nonce_field('mfe_admin'); ?>
              <input type="hidden" name="mfe_action" value="her_update" />
              <input type="hidden" name="id" value="<?php echo (int)$r->id; ?>" />
              <div class="mfe-form-row">
                <label>Status
                  <select name="status">
                    <?php foreach (['new','reviewing','approved','rejected'] as $s): ?>
                      <option value="<?php echo $s; ?>" <?php selected($r->status, $s); ?>><?php echo ucfirst($s); ?></option>
                    <?php endforeach; ?>
                  </select>
                </label>
                <label>Public Notes (visible to applicant)<input type="text" name="public_notes" value="<?php echo esc_attr($r->public_notes ?? ''); ?>" /></label>
              </div>
              <div class="mfe-form-row full"><label>Admin Notes (internal)<textarea name="admin_notes"><?php echo esc_textarea($r->admin_notes ?? ''); ?></textarea></label></div>
              <p><button class="button button-primary" type="submit">Save</button></p>
            </form>
          </div>

          <?php if ($r->status === 'approved' && empty($r->converted_event_id)): ?>
          <div class="mfe-card">
            <h2>Convert to Draft Event</h2>
            <p>Create a draft event from this request. The host will be linked. You can publish it later from <em>Events</em>.</p>
            <form method="post">
              <?php wp_nonce_field('mfe_admin'); ?>
              <input type="hidden" name="mfe_action" value="her_to_event" />
              <input type="hidden" name="id" value="<?php echo (int)$r->id; ?>" />
              <button class="button button-primary" type="submit">Create Draft Event</button>
            </form>
          </div>
          <?php elseif ($r->converted_event_id): ?>
          <div class="mfe-card">
            <h2>Linked Event</h2>
            <p><a class="button" href="<?php echo esc_url(admin_url('admin.php?page=mfe-events&action=edit&id='.(int)$r->converted_event_id)); ?>">Open Linked Event #<?php echo (int)$r->converted_event_id; ?></a></p>
          </div>
          <?php endif; ?>

          <div class="mfe-card">
            <form method="post" onsubmit="return confirm('Delete this request? This cannot be undone.')">
              <?php wp_nonce_field('mfe_admin'); ?>
              <input type="hidden" name="mfe_action" value="her_delete" />
              <input type="hidden" name="id" value="<?php echo (int)$r->id; ?>" />
              <button class="button button-link-delete" type="submit">Delete Request</button>
            </form>
          </div>
        </div>
        <?php
    }

    private static function do_her_update() {
        global $wpdb;
        $id = intval($_POST['id'] ?? 0);
        if (!$id) self::redirect('mfe-host', ['mfe_msg'=>'error']);
        $allowed = ['new','reviewing','approved','rejected'];
        $status = sanitize_text_field($_POST['status'] ?? 'new');
        if (!in_array($status, $allowed, true)) $status = 'new';
        $wpdb->update($wpdb->prefix . 'mf_host_event_requests', [
            'status'       => $status,
            'admin_notes'  => sanitize_textarea_field($_POST['admin_notes'] ?? ''),
            'public_notes' => sanitize_text_field($_POST['public_notes'] ?? ''),
        ], ['id' => $id]);
        self::redirect('mfe-host', ['mfe_msg'=>'her_updated','id'=>$id]);
    }

    private static function do_her_to_event() {
        global $wpdb;
        $id = intval($_POST['id'] ?? 0);
        $r = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}mf_host_event_requests WHERE id=%d", $id));
        if (!$r || $r->status !== 'approved' || $r->converted_event_id) self::redirect('mfe-host', ['mfe_msg'=>'error']);

        $start = $r->preferred_date ? $r->preferred_date . ' 12:00:00' : current_time('mysql');
        $type_map = ['workshop'=>'workshop','meetup'=>'meetup','expert_session'=>'expert_session','talkspot'=>'talkspot'];
        $event_type = $type_map[$r->event_type] ?? 'meetup';

        $wpdb->insert($wpdb->prefix . 'mf_events', [
            'title'             => sprintf('[Draft] %s by %s', ucfirst(str_replace('_',' ',$event_type)), $r->full_name),
            'slug'              => 'draft-' . $r->id . '-' . wp_generate_password(4, false, false),
            'event_type'        => $event_type,
            'status'            => 'draft',
            'start_datetime'    => $start,
            'location_name'     => $r->location_name,
            'city'              => $r->city,
            'host_user_id'      => $r->user_id,
            'short_description' => mb_substr($r->proposal_text, 0, 200),
            'description'       => $r->proposal_text,
        ]);
        $event_id = (int)$wpdb->insert_id;
        $wpdb->update($wpdb->prefix . 'mf_host_event_requests', ['converted_event_id' => $event_id], ['id' => $id]);
        self::redirect('mfe-host', ['mfe_msg'=>'her_converted','id'=>$id]);
    }

    private static function do_her_delete() {
        global $wpdb;
        $id = intval($_POST['id'] ?? 0);
        if ($id > 0) $wpdb->delete($wpdb->prefix . 'mf_host_event_requests', ['id'=>$id]);
        self::redirect('mfe-host', ['mfe_msg'=>'her_deleted']);
    }

    /* ═══════════════════════ COMMUNITY UPDATES ═══════════════════════ */
    public static function page_updates() {
        $action = sanitize_text_field($_GET['action'] ?? 'list');
        if (in_array($action, ['edit','new'], true)) { self::render_upd_form(); return; }
        self::render_upd_list();
    }

    private static function render_upd_list() {
        global $wpdb;
        $tu = $wpdb->prefix . 'mf_community_updates';
        $f = sanitize_text_field($_GET['status'] ?? 'all');
        $where = $f === 'all' ? '1=1' : $wpdb->prepare('status = %s', $f);
        $rows = $wpdb->get_results("SELECT * FROM $tu WHERE $where ORDER BY visible_date DESC LIMIT 100");
        ?>
        <div class="wrap">
          <h1>Community Updates <a class="page-title-action" href="<?php echo esc_url(admin_url('admin.php?page=mfe-updates&action=new')); ?>">Add New</a></h1>
          <div class="mfe-table-toolbar">
            <strong>Status:</strong>
            <?php foreach (['all','pending','published','rejected'] as $s): $u = add_query_arg('status',$s,admin_url('admin.php?page=mfe-updates')); ?>
              <a class="mfe-filter-link <?php echo $f===$s?'active':''; ?>" href="<?php echo esc_url($u); ?>"><?php echo esc_html(ucfirst($s)); ?></a>
            <?php endforeach; ?>
          </div>

          <table class="widefat striped">
            <thead><tr><th>Date</th><th>User</th><th>Role</th><th>Message</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
            <?php if ($rows): foreach ($rows as $r): ?>
              <tr>
                <td><?php echo esc_html(date('Y-m-d', strtotime($r->visible_date))); ?></td>
                <td>@<?php echo esc_html($r->nickname); ?></td>
                <td><?php echo esc_html($r->role); ?></td>
                <td><?php echo esc_html(wp_trim_words($r->message, 14)); ?></td>
                <td><span class="mfe-status mfe-st-<?php echo esc_attr($r->status); ?>"><?php echo esc_html($r->status); ?></span></td>
                <td>
                  <div class="mfe-actions">
                    <a class="button button-small" href="<?php echo esc_url(admin_url('admin.php?page=mfe-updates&action=edit&id='.$r->id)); ?>">Edit</a>
                    <?php if ($r->status === 'pending'): ?>
                    <form method="post" style="display:inline">
                      <?php wp_nonce_field('mfe_admin'); ?>
                      <input type="hidden" name="mfe_action" value="upd_status" />
                      <input type="hidden" name="id" value="<?php echo (int)$r->id; ?>" />
                      <input type="hidden" name="status" value="published" />
                      <button class="button button-small button-primary" type="submit">Approve</button>
                    </form>
                    <form method="post" style="display:inline">
                      <?php wp_nonce_field('mfe_admin'); ?>
                      <input type="hidden" name="mfe_action" value="upd_status" />
                      <input type="hidden" name="id" value="<?php echo (int)$r->id; ?>" />
                      <input type="hidden" name="status" value="rejected" />
                      <button class="button button-small" type="submit">Reject</button>
                    </form>
                    <?php endif; ?>
                    <form method="post" style="display:inline" onsubmit="return confirm('Delete?')">
                      <?php wp_nonce_field('mfe_admin'); ?>
                      <input type="hidden" name="mfe_action" value="upd_delete" />
                      <input type="hidden" name="id" value="<?php echo (int)$r->id; ?>" />
                      <button class="button button-small button-link-delete" type="submit">Delete</button>
                    </form>
                  </div>
                </td>
              </tr>
            <?php endforeach; else: ?>
              <tr><td colspan="6"><em>No updates.</em></td></tr>
            <?php endif; ?>
            </tbody>
          </table>
        </div>
        <?php
    }

    private static function render_upd_form() {
        global $wpdb;
        $id = intval($_GET['id'] ?? 0);
        $row = $id ? $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}mf_community_updates WHERE id=%d", $id)) : null;
        $get = function($k, $d='') use($row){ return $row && isset($row->$k) ? $row->$k : $d; };
        ?>
        <div class="wrap">
          <h1><?php echo $row ? 'Edit Update' : 'Add New Update'; ?> <a class="page-title-action" href="<?php echo esc_url(admin_url('admin.php?page=mfe-updates')); ?>">← Back</a></h1>
          <form method="post" class="mfe-card">
            <?php wp_nonce_field('mfe_admin'); ?>
            <input type="hidden" name="mfe_action" value="upd_save" />
            <input type="hidden" name="id" value="<?php echo (int)$id; ?>" />
            <div class="mfe-form-row">
              <label>Nickname *<input type="text" name="nickname" required value="<?php echo esc_attr($get('nickname')); ?>" /></label>
              <label>Role
                <select name="role">
                  <?php foreach (['Family','Volunteer','Expert','Talk-Spot'] as $r): ?>
                    <option value="<?php echo $r; ?>" <?php selected($get('role','Family'), $r); ?>><?php echo $r; ?></option>
                  <?php endforeach; ?>
                </select>
              </label>
            </div>
            <div class="mfe-form-row full"><label>Message *<textarea name="message" required><?php echo esc_textarea($get('message')); ?></textarea></label></div>
            <div class="mfe-form-row">
              <label>Visible Date<input type="datetime-local" name="visible_date" value="<?php echo esc_attr($row ? date('Y-m-d\TH:i', strtotime($row->visible_date)) : date('Y-m-d\TH:i')); ?>" /></label>
              <label>Status
                <select name="status">
                  <?php foreach (['pending','published','rejected'] as $s): ?>
                    <option value="<?php echo $s; ?>" <?php selected($get('status','published'), $s); ?>><?php echo ucfirst($s); ?></option>
                  <?php endforeach; ?>
                </select>
              </label>
            </div>
            <p><button class="button button-primary" type="submit">Save</button></p>
          </form>
        </div>
        <?php
    }

    private static function do_upd_save() {
        global $wpdb;
        $id = intval($_POST['id'] ?? 0);
        $data = [
            'nickname'     => sanitize_text_field($_POST['nickname'] ?? ''),
            'role'         => sanitize_text_field($_POST['role'] ?? 'Family'),
            'message'      => sanitize_textarea_field($_POST['message'] ?? ''),
            'visible_date' => sanitize_text_field(str_replace('T',' ', $_POST['visible_date'] ?? current_time('mysql'))) . (strpos($_POST['visible_date'] ?? '', ':') ? ':00' : ''),
            'status'       => sanitize_text_field($_POST['status'] ?? 'published'),
            'update_type'  => 'general',
        ];
        if (empty($data['nickname']) || empty($data['message'])) self::redirect('mfe-updates', ['mfe_msg'=>'error']);
        if ($id > 0) $wpdb->update($wpdb->prefix . 'mf_community_updates', $data, ['id' => $id]);
        else         $wpdb->insert($wpdb->prefix . 'mf_community_updates', $data);
        self::redirect('mfe-updates', ['mfe_msg'=>'upd_saved']);
    }

    private static function do_upd_status() {
        global $wpdb;
        $id = intval($_POST['id'] ?? 0);
        $allowed = ['pending','published','rejected'];
        $status = sanitize_text_field($_POST['status'] ?? 'pending');
        if (!in_array($status, $allowed, true)) $status = 'pending';
        if ($id > 0) $wpdb->update($wpdb->prefix . 'mf_community_updates', ['status'=>$status], ['id'=>$id]);
        self::redirect('mfe-updates', ['mfe_msg'=>'upd_status']);
    }

    private static function do_upd_delete() {
        global $wpdb;
        $id = intval($_POST['id'] ?? 0);
        if ($id > 0) $wpdb->delete($wpdb->prefix . 'mf_community_updates', ['id'=>$id]);
        self::redirect('mfe-updates', ['mfe_msg'=>'upd_deleted']);
    }

    /* ═══════════════════════ SPECIAL DAYS ═══════════════════════ */
    public static function page_special_days() {
        $action = sanitize_text_field($_GET['action'] ?? 'list');
        if (in_array($action, ['edit','new'], true)) { self::render_sd_form(); return; }
        self::render_sd_list();
    }

    private static function render_sd_list() {
        global $wpdb;
        $rows = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}mf_special_days ORDER BY month_number ASC, day_date ASC LIMIT 200");
        ?>
        <div class="wrap">
          <h1>Special Days <a class="page-title-action" href="<?php echo esc_url(admin_url('admin.php?page=mfe-special-days&action=new')); ?>">Add New</a></h1>
          <table class="widefat striped">
            <thead><tr><th>Date</th><th>Title</th><th>Description</th><th>Accent</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
            <?php if ($rows): foreach ($rows as $r): ?>
              <tr>
                <td><?php echo esc_html(date('M d', strtotime($r->day_date))); ?></td>
                <td><strong><?php echo esc_html($r->title); ?></strong></td>
                <td><?php echo esc_html(wp_trim_words($r->description, 16)); ?></td>
                <td><span class="mfe-status" style="background:var(--mf-<?php echo esc_attr($r->accent_color); ?>,#888);color:#fff"><?php echo esc_html($r->accent_color); ?></span></td>
                <td><span class="mfe-status mfe-st-<?php echo esc_attr($r->status); ?>"><?php echo esc_html($r->status); ?></span></td>
                <td>
                  <div class="mfe-actions">
                    <a class="button button-small" href="<?php echo esc_url(admin_url('admin.php?page=mfe-special-days&action=edit&id='.$r->id)); ?>">Edit</a>
                    <form method="post" style="display:inline" onsubmit="return confirm('Delete?')">
                      <?php wp_nonce_field('mfe_admin'); ?>
                      <input type="hidden" name="mfe_action" value="sd_delete" />
                      <input type="hidden" name="id" value="<?php echo (int)$r->id; ?>" />
                      <button class="button button-small button-link-delete" type="submit">Delete</button>
                    </form>
                  </div>
                </td>
              </tr>
            <?php endforeach; else: ?>
              <tr><td colspan="6"><em>No special days yet.</em></td></tr>
            <?php endif; ?>
            </tbody>
          </table>
        </div>
        <?php
    }

    private static function render_sd_form() {
        global $wpdb;
        $id = intval($_GET['id'] ?? 0);
        $row = $id ? $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}mf_special_days WHERE id=%d", $id)) : null;
        $get = function($k, $d='') use($row){ return $row && isset($row->$k) ? $row->$k : $d; };
        ?>
        <div class="wrap">
          <h1><?php echo $row ? 'Edit Special Day' : 'Add New Special Day'; ?> <a class="page-title-action" href="<?php echo esc_url(admin_url('admin.php?page=mfe-special-days')); ?>">← Back</a></h1>
          <form method="post" class="mfe-card">
            <?php wp_nonce_field('mfe_admin'); ?>
            <input type="hidden" name="mfe_action" value="sd_save" />
            <input type="hidden" name="id" value="<?php echo (int)$id; ?>" />
            <div class="mfe-form-row full"><label>Title *<input type="text" name="title" required value="<?php echo esc_attr($get('title')); ?>" /></label></div>
            <div class="mfe-form-row"><label>Date *<input type="date" name="day_date" required value="<?php echo esc_attr($get('day_date')); ?>" /></label>
              <label>Accent Color
                <select name="accent_color">
                  <?php foreach (['orange','blue','red','yellow','green'] as $c): ?>
                    <option value="<?php echo $c; ?>" <?php selected($get('accent_color','orange'), $c); ?>><?php echo ucfirst($c); ?></option>
                  <?php endforeach; ?>
                </select>
              </label>
            </div>
            <div class="mfe-form-row full">
              <label>Description (supports <strong>bold</strong>, <em>italics</em>, colors, links)</label>
              <?php
                wp_editor($get('description'), 'mfe_sd_description', [
                    'textarea_name' => 'description',
                    'media_buttons' => false,
                    'textarea_rows' => 6,
                    'teeny'         => false,
                    'tinymce'       => [
                        'toolbar1' => 'bold,italic,underline,forecolor,bullist,numlist,link,unlink,undo,redo',
                        'toolbar2' => '',
                    ],
                    'quicktags'     => false,
                ]);
              ?>
            </div>
            <div class="mfe-form-row full">
              <label>Images (upload via Media Library — drag to reorder)</label>
              <div class="mfe-media-picker" id="mfe-sd-media-picker">
                <?php
                  $imgs_raw = $get('images', '');
                  $imgs = [];
                  if ($imgs_raw) {
                    $decoded = json_decode($imgs_raw, true);
                    if (is_array($decoded)) $imgs = $decoded;
                  }
                ?>
                <input type="hidden" name="images" id="mfe-sd-images-input" value="<?php echo esc_attr(wp_json_encode($imgs)); ?>" />
                <div class="mfe-media-thumbs" id="mfe-sd-media-thumbs">
                  <?php foreach ($imgs as $img_url): ?>
                    <span class="mfe-media-thumb" data-url="<?php echo esc_attr($img_url); ?>">
                      <img src="<?php echo esc_url($img_url); ?>" alt="" />
                      <button type="button" class="mfe-media-remove" aria-label="Remove">&times;</button>
                    </span>
                  <?php endforeach; ?>
                </div>
                <button type="button" class="button" id="mfe-sd-media-add">+ Add Images</button>
              </div>
            </div>
            <div class="mfe-form-row"><label>Status
              <select name="status">
                <?php foreach (['draft','published'] as $s): ?>
                  <option value="<?php echo $s; ?>" <?php selected($get('status','published'), $s); ?>><?php echo ucfirst($s); ?></option>
                <?php endforeach; ?>
              </select>
            </label></div>
            <p><button class="button button-primary" type="submit">Save</button></p>
          </form>
        </div>
        <?php
    }

    private static function do_sd_save() {
        global $wpdb;
        $id = intval($_POST['id'] ?? 0);
        $date = sanitize_text_field($_POST['day_date'] ?? '');
        if (empty($_POST['title']) || empty($date)) self::redirect('mfe-special-days', ['mfe_msg'=>'error']);
        $month = (int)date('n', strtotime($date));

        // Parse images: hidden input contains JSON-encoded array of URLs from the media picker
        $images_raw = isset($_POST['images']) ? wp_unslash($_POST['images']) : '';
        $images = [];
        if ($images_raw) {
            $decoded = json_decode($images_raw, true);
            if (is_array($decoded)) {
                foreach ($decoded as $url) {
                    $clean = esc_url_raw($url);
                    if ($clean) $images[] = $clean;
                }
            } elseif (is_string($images_raw)) {
                // Backward compat: newline-separated URLs
                $lines = array_filter(array_map('trim', explode("\n", $images_raw)));
                foreach ($lines as $line) {
                    $clean = esc_url_raw($line);
                    if ($clean) $images[] = $clean;
                }
            }
        }
        $images_json = $images ? wp_json_encode($images) : null;

        $data = [
            'title'        => sanitize_text_field($_POST['title']),
            'description'  => wp_kses_post($_POST['description'] ?? ''),
            'day_date'     => $date,
            'month_number' => $month,
            'accent_color' => sanitize_text_field($_POST['accent_color'] ?? 'orange'),
            'images'       => $images_json,
            'status'       => sanitize_text_field($_POST['status'] ?? 'published'),
        ];
        if ($id > 0) $wpdb->update($wpdb->prefix . 'mf_special_days', $data, ['id' => $id]);
        else         $wpdb->insert($wpdb->prefix . 'mf_special_days', $data);
        self::redirect('mfe-special-days', ['mfe_msg'=>'sd_saved']);
    }

    private static function do_sd_delete() {
        global $wpdb;
        $id = intval($_POST['id'] ?? 0);
        if ($id > 0) $wpdb->delete($wpdb->prefix . 'mf_special_days', ['id' => $id]);
        self::redirect('mfe-special-days', ['mfe_msg'=>'sd_deleted']);
    }
}

Mini_Forum_Admin::init();
