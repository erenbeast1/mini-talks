<?php
if (!defined('ABSPATH')) exit;

$eurl = function_exists('mf_get_events_url') ? mf_get_events_url() : get_permalink();

global $wpdb;
$tu  = $wpdb->prefix . 'mf_community_updates';
$tsd = $wpdb->prefix . 'mf_special_days';
$te  = $wpdb->prefix . 'mf_events';
$tp  = $wpdb->prefix . 'mf_event_participants';

// Real data — community updates (newest first)
$updates = $wpdb->get_results("
    SELECT * FROM $tu
    WHERE status = 'published'
    ORDER BY visible_date DESC
    LIMIT 24
");

// Real data — special days (all published, filtered client-side by calendar month)
$current_month = (int)date('n');
$special_days = $wpdb->get_results("
    SELECT * FROM $tsd
    WHERE status = 'published'
    ORDER BY month_number ASC, day_date ASC
");

// Build calendar event map (current view month — passed via JS too, but PHP renders default)
$cal_year  = (int)date('Y');
$cal_month = (int)date('n');
$start_dt = sprintf('%04d-%02d-01 00:00:00', $cal_year, $cal_month);
$end_dt   = date('Y-m-t 23:59:59', strtotime($start_dt));
$cal_events = $wpdb->get_results($wpdb->prepare("
    SELECT id, title, slug, event_type, DATE(start_datetime) AS d
    FROM $te
    WHERE status IN ('published','completed') AND start_datetime BETWEEN %s AND %s
    ORDER BY start_datetime ASC
", $start_dt, $end_dt));

$type_class_map = [
    'workshop'        => 'mfe-workshop',
    'meetup'          => 'mfe-meetup',
    'expert_session'  => 'mfe-expert',
    'update'          => 'mfe-update',
    'talkspot'        => 'mfe-talkspot',
    'specialday'      => 'mfe-specialday',
    'milestone'       => 'mfe-milestone',
];

$cal_payload = [];
foreach ($cal_events as $ev) {
    $cls = $type_class_map[$ev->event_type] ?? 'mfe-meetup';
    $cal_payload[$ev->d][] = [
        'id'    => (int)$ev->id,
        'title' => $ev->title,
        'slug'  => $ev->slug,
        'cls'   => $cls,
    ];
}

// Merge Special Days
$cal_specials = $wpdb->get_results($wpdb->prepare("
    SELECT id, title, day_date FROM $tsd
    WHERE status='published' AND day_date BETWEEN %s AND %s
", date('Y-m-d', strtotime($start_dt)), date('Y-m-d', strtotime($end_dt))));
foreach ($cal_specials as $sd) {
    $cal_payload[$sd->day_date][] = [
        'id'    => (int)$sd->id,
        'title' => $sd->title,
        'slug'  => '',
        'cls'   => 'mfe-specialday',
    ];
}

// Helpers
function mfe_short_day($dt){ return ucfirst(strtolower(date('D', strtotime($dt)))); }
function mfe_short_mon($dt){ return ucfirst(strtolower(date('M', strtotime($dt)))); }
function mfe_day_num($dt) { return date('d', strtotime($dt)); }

// Fetch upcoming events for ALL types
$home_month_start = sprintf('%04d-%02d-01 00:00:00', $cal_year, $cal_month);
$home_event_window_end = date('Y-m-d 23:59:59', strtotime('+90 days'));

function mfe_home_fetch_events_by_type($type, $start_dt, $end_dt, $limit = 12) {
    global $wpdb;
    $te = $wpdb->prefix . 'mf_events';
    return $wpdb->get_results($wpdb->prepare("
        SELECT * FROM $te
        WHERE event_type=%s AND status IN ('published','completed') AND start_datetime BETWEEN %s AND %s
        ORDER BY start_datetime ASC
        LIMIT %d
    ", $type, $start_dt, $end_dt, $limit));
}

/**
 * Fetch ALL events for a given type — upcoming first (ASC), then past (DESC).
 * The full set is rendered into the slider track on the server, and JS performs
 * the 3-tier filter client-side when the calendar month changes:
 *
 *   Tier 1: Upcoming events in the calendar's currently-selected month (priority)
 *   Tier 2: Upcoming events from OTHER months (closest future first) — fill toward min_count
 *   Tier 3: If still under min_count → fill the remainder with PAST events (most recent first)
 *
 * The DOM is pre-sorted (upcoming ASC, then past DESC) so client-side filtering can
 * just iterate in order and pick matching cards per tier.
 */
function mfe_home_fetch_all_events_for_type($type, $upcoming_limit = 30, $past_limit = 30) {
    global $wpdb;
    $te = $wpdb->prefix . 'mf_events';

    $upcoming = $wpdb->get_results($wpdb->prepare("
        SELECT * FROM $te
        WHERE event_type=%s
          AND status IN ('published','completed')
          AND DATE(start_datetime) >= CURDATE()
        ORDER BY start_datetime ASC
        LIMIT %d
    ", $type, $upcoming_limit));

    $past = $wpdb->get_results($wpdb->prepare("
        SELECT * FROM $te
        WHERE event_type=%s
          AND status IN ('published','completed')
          AND DATE(start_datetime) < CURDATE()
        ORDER BY start_datetime DESC
        LIMIT %d
    ", $type, $past_limit));

    return array_merge($upcoming, $past);
}

$home_workshops = mfe_home_fetch_all_events_for_type('workshop');
$home_meetups   = mfe_home_fetch_all_events_for_type('meetup');
$home_experts   = mfe_home_fetch_all_events_for_type('expert_session');

// Card render helper
function mfe_home_render_event_card($ev, $type_color, $type_token) {
    global $wpdb;
    $tp = $wpdb->prefix . 'mf_event_participants';
    $count = (int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $tp WHERE event_id=%d AND status='joined'", $ev->id));
    $img = $ev->cover_image_url ?: '';
    $avatars = class_exists('Mini_Forum_Ajax') ? Mini_Forum_Ajax::get_event_avatars($ev->id, 3) : [];
    $extra   = max(0, $count - count($avatars));

    $current_user_joined = false;
    if (is_user_logged_in()) {
        $uid = get_current_user_id();
        $current_user_joined = (bool)$wpdb->get_var($wpdb->prepare("SELECT 1 FROM $tp WHERE event_id=%d AND user_id=%d AND status='joined'", $ev->id, $uid));
    }
    $is_disabled = in_array($ev->status, ['completed','cancelled'], true);

    $btn_labels = [
        'red'    => 'Join Workshop',
        'yellow' => 'Join Meetup',
        'blue'   => 'Join Session',
    ];
    // Status shown on button (so users know it's past), never on photo
    $btn_label = $is_disabled ? ucfirst($ev->status)
               : ($current_user_joined ? 'Joined ✓' : ($btn_labels[$type_color] ?? 'Join'));
    // Date metadata used by client-side month filter
    $_ev_ts          = strtotime($ev->start_datetime);
    $_ev_month_key   = date('Y-m', $_ev_ts);
    $_ev_date_key    = date('Y-m-d', $_ev_ts);
    $_ev_is_upcoming = ($_ev_date_key >= date('Y-m-d', current_time('timestamp'))) ? '1' : '0';
    ?>
    <div class="mfe-frame-card<?php echo $img ? '' : ' mfe-frame-card-noimg'; ?>"
         data-event-id="<?php echo (int)$ev->id; ?>"
         data-month-key="<?php echo esc_attr($_ev_month_key); ?>"
         data-date-key="<?php echo esc_attr($_ev_date_key); ?>"
         data-is-upcoming="<?php echo $_ev_is_upcoming; ?>">
        <div class="mfe-frame-studs mfe-stud-<?php echo esc_attr($type_color); ?>"></div>
        <div class="mfe-frame-body mfe-frame-<?php echo esc_attr($type_color); ?>">
            <div class="mfe-frame-inner">
                <?php if ($img): ?>
                <div class="mfe-evcard-img mfe-evcard-img-has mfe-evcard-img-bdr-<?php echo esc_attr($type_color); ?>">
                    <img src="<?php echo esc_url($img); ?>" alt="" />
                    <div class="mfe-datebox mfe-db-<?php echo esc_attr($type_color); ?> mfe-db-noborder" style="position:absolute;top:12px;left:12px">
                        <span class="mfe-d-day"><?php echo esc_html(mfe_short_day($ev->start_datetime)); ?></span>
                        <span class="mfe-d-num"><?php echo esc_html(mfe_day_num($ev->start_datetime)); ?></span>
                        <span class="mfe-d-mon"><?php echo esc_html(mfe_short_mon($ev->start_datetime)); ?></span>
                    </div>
                </div>
                <?php endif; ?>
                <div class="mfe-evcard-body">
                    <?php if (!$img): ?>
                    <div class="mfe-evcard-headerow">
                      <div class="mfe-datebox mfe-db-<?php echo esc_attr($type_color); ?>">
                        <span class="mfe-d-day"><?php echo esc_html(mfe_short_day($ev->start_datetime)); ?></span>
                        <span class="mfe-d-num"><?php echo esc_html(mfe_day_num($ev->start_datetime)); ?></span>
                        <span class="mfe-d-mon"><?php echo esc_html(mfe_short_mon($ev->start_datetime)); ?></span>
                      </div>
                      <h3 class="mfe-evcard-title mfe-evcard-title-inline"><?php echo esc_html($ev->title); ?></h3>
                    </div>
                    <?php else: ?>
                    <h3 class="mfe-evcard-title"><?php echo esc_html($ev->title); ?></h3>
                    <?php endif; ?>
                    <div class="mfe-evcard-meta">
                        <span class="mfe-evcard-meta-item">
                            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                            <?php echo esc_html(date('g:i A', strtotime($ev->start_datetime))); ?>
                        </span>
                        <?php if (!empty($ev->location_name)): ?>
                        <span class="mfe-evcard-meta-item">
                            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>
                            <?php echo esc_html($ev->location_name); ?>
                        </span>
                        <?php endif; ?>
                    </div>
                    <span class="mfe-evcard-sep"></span>
                    <p class="mfe-evcard-desc"><?php
                        $allowed = ['strong'=>[],'b'=>[],'em'=>[],'i'=>[],'u'=>[],'br'=>[],'span'=>['style'=>true],'a'=>['href'=>true,'target'=>true,'rel'=>true]];
                        echo wp_kses($ev->short_description ?: '', $allowed);
                    ?></p>
                    <div class="mfe-evcard-foot">
                        <div class="mfe-evcard-avatars" data-event-id="<?php echo (int)$ev->id; ?>">
                            <?php foreach ($avatars as $a): ?>
                                <span class="mfe-evcard-av" title="<?php echo esc_attr($a['name']); ?>" style="background-image:url('<?php echo esc_url($a['url']); ?>');background-size:cover;background-position:center"></span>
                            <?php endforeach; ?>
                            <?php if ($extra > 0): ?><span class="mfe-evcard-av-more">+<?php echo $extra; ?></span><?php endif; ?>
                            <span class="mfe-evcard-count"><span class="mfe-evcard-count-num"><?php echo $count; ?></span> members</span>
                        </div>
                    </div>
                    <div class="mfe-evcard-btnrow">
                        <button type="button" class="mfe-evcard-btn-details det-<?php echo esc_attr($type_color); ?> mfe-detail-btn"
                                data-event-id="<?php echo (int)$ev->id; ?>"
                                data-event-type="<?php echo esc_attr($type_token); ?>">See Details</button>
                        <button type="button" class="mfe-evcard-btn mfe-btn-<?php echo esc_attr($type_color); ?> mfe-join-btn<?php echo $current_user_joined ? ' is-joined' : ''; ?>"
                                data-event-id="<?php echo (int)$ev->id; ?>"
                                data-default-label="<?php echo esc_attr($btn_labels[$type_color] ?? 'Join'); ?>"
                                <?php echo $is_disabled ? 'disabled' : ''; ?>><?php echo esc_html($btn_label); ?></button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <?php
}

function mfe_home_render_section($args) {
    $a = $args;
    $sid = $a['section_id'];
?>
<section class="mfe-section-hero">
  <div class="mf-container">
    <div class="mf-hero-new">
      <div class="mf-hero-face bg-<?php echo esc_attr($a['face_color']); ?>">
        <img src="<?php echo esc_url($a['face_img']); ?>" alt="" />
      </div>
      <div class="mf-hero-left">
        <h2 class="mf-title-contour <?php echo esc_attr($a['title_color']); ?>" style="font-size:clamp(24px,2.6vw,38px)"><?php echo esc_html($a['title']); ?></h2>
        <div class="mf-hero-bars">
          <span style="background:var(--mf-red)"></span>
          <span style="background:var(--mf-yellow)"></span>
          <span style="background:var(--mf-blue)"></span>
          <span style="background:var(--mf-green)"></span>
        </div>
        <p class="mf-hero-desc"><?php echo esc_html($a['description']); ?></p>
        <div class="mfe-section-hero-actions">
          <a href="<?php echo esc_url($a['see_all_url']); ?>" class="mfe-see-all mfe-see-all-<?php echo esc_attr($a['see_all_color']); ?>"><?php echo esc_html($a['see_all_label']); ?></a>
        </div>
      </div>
    </div>
  </div>

  <?php
  // DEBUG (HTML comment): tells us what the fetch actually returned for each section.
  // Visible only via View Source / F12 — not on the visible page.
  $_dbg_count = is_array($a['events']) ? count($a['events']) : 'NOT-ARRAY';
  echo "\n<!-- mfe-debug section={$sid} type_token={$a['type_token']} fetched_count={$_dbg_count} -->\n";
  ?>
  <?php if (!empty($a['events'])): ?>
  <div class="mfe-evsec-slider" data-section="<?php echo esc_attr($sid); ?>">
    <button class="mfe-arrow mfe-arrow-left mfe-evsec-prev" aria-label="Previous" type="button">‹</button>
    <div class="mfe-evsec-viewport">
      <div class="mfe-evsec-track">
        <?php foreach ($a['events'] as $ev) {
          mfe_home_render_event_card($ev, $a['type_color'], $a['type_token']);
        } ?>
      </div>
    </div>
    <button class="mfe-arrow mfe-arrow-right mfe-evsec-next" aria-label="Next" type="button">›</button>
  </div>
  <?php else: ?>
  <div class="mf-container">
    <div class="mfe-evsec-empty">No upcoming events for this period yet.</div>
  </div>
  <?php endif; ?>
</section>
<?php
}
?>

<!-- ═══ HERO ═══ -->
<div class="mf-container">
  <div class="mf-hero-new">
    <div class="mf-hero-left">
      <h1 class="mf-title-contour">Mini-Events</h1>
      <div class="mf-hero-bars">
        <span style="background:var(--mf-red)"></span>
        <span style="background:var(--mf-yellow)"></span>
        <span style="background:var(--mf-blue)"></span>
        <span style="background:var(--mf-green)"></span>
      </div>
      <p class="mf-hero-desc">Real-world meetups where the Mini-Talks experience comes to life.</p>
      <p class="mf-hero-desc">Natural interactions where children and volunteers connect together.</p>
    </div>
    <div class="mf-hero-face">
      <img src="https://mini-talks.org/wp-content/uploads/2026/04/minitalks-logo-2.png" alt="Mini-Talks" />
    </div>
  </div>
</div>

<!-- ═══ MONTHLY CALENDAR ═══ -->
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <filter id="mf-today-outline" x="-0.15" y="-0.15" width="1.3" height="1.3">
      <feMorphology in="SourceAlpha" operator="dilate" radius="6" result="outer" />
      <feFlood flood-color="#E52828" />
      <feComposite in2="outer" operator="in" result="redring" />
      <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="innergap" />
      <feFlood flood-color="#FFFFFF" />
      <feComposite in2="innergap" operator="in" result="whitegap" />
      <feMerge>
        <feMergeNode in="redring" />
        <feMergeNode in="whitegap" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
</svg>
<div class="mf-container" style="margin-top:24px">
  <div class="mfe-calendar-frame">
    <div class="mfe-cal-header">
      <button class="mfe-cal-arrow" id="mfe-cal-prev" aria-label="Previous month" type="button">
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M15 4L7 12L15 20" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
      </button>
      <h2 class="mf-title-contour blue mfe-cal-title" id="mfe-cal-title"><?php echo date('F Y', strtotime($start_dt)); ?></h2>
      <button class="mfe-cal-arrow" id="mfe-cal-next" aria-label="Next month" type="button">
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M9 4L17 12L9 20" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
      </button>
    </div>
    <div class="mfe-cal-weekdays">
      <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
    </div>
    <div class="mfe-cal-grid" id="mfe-cal-grid" role="grid" aria-label="Events calendar"
         data-init-year="<?php echo $cal_year; ?>"
         data-init-month="<?php echo $cal_month - 1; ?>"
         data-events='<?php echo wp_json_encode($cal_payload); ?>'></div>
    <div class="mfe-cal-legend">
      <span><img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-547.png" alt="" class="mfe-legend-img" />Workshop</span>
      <span><img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-545.png" alt="" class="mfe-legend-img" />Family Meetup</span>
      <span><img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-543.png" alt="" class="mfe-legend-img" />Expert Session</span>
      <span><img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-542.png" alt="" class="mfe-legend-img" />Update</span>
      <span><img src="https://mini-talks.org/wp-content/uploads/2026/04/Group-546.png" alt="" class="mfe-legend-img" />Special Day</span>
    </div>
  </div>
</div>

<?php
mfe_home_render_section([
  'title'         => 'Mini-Volunteer Workshops',
  'title_color'   => 'red',
  'face_color'    => 'red',
  'face_img'      => 'https://mini-talks.org/wp-content/uploads/2026/04/minitalks-logo-2.png',
  'description'   => 'Guided play sessions at Talk-Spots, where children spend pressure-free time with Mini-Volunteers. Mini-Kits and the App & Studio may join the play, while families observe quietly nearby.',
  'see_all_url'   => add_query_arg('view','workshops',$eurl),
  'see_all_color' => 'red',
  'see_all_label' => 'See All Workshops',
  'section_id'    => 'workshops',
  'events'        => $home_workshops,
  'type_color'    => 'red',
  'type_token'    => 'workshop',
]);
mfe_home_render_section([
  'title'         => 'Mini-Family Meetups',
  'title_color'   => 'yellow',
  'face_color'    => 'yellow',
  'face_img'      => 'https://mini-talks.org/wp-content/uploads/2026/04/minitalks-logo-2.png',
  'description'   => 'Family gatherings at Talk-Spots or online — with or without children — where families find peer-support, share experiences, and know they are not alone.',
  'see_all_url'   => add_query_arg('view','meetups',$eurl),
  'see_all_color' => 'yellow',
  'see_all_label' => 'See All Meetups',
  'section_id'    => 'meetups',
  'events'        => $home_meetups,
  'type_color'    => 'yellow',
  'type_token'    => 'meetup',
]);
mfe_home_render_section([
  'title'         => 'Mini-Expert Sessions',
  'title_color'   => 'blue',
  'face_color'    => 'blue',
  'face_img'      => 'https://mini-talks.org/wp-content/uploads/2026/04/minitalks-logo-2.png',
  'description'   => 'Online sessions where clinicians, educators, and researchers share knowledge with the Mini-Talks community.',
  'see_all_url'   => add_query_arg('view','experts',$eurl),
  'see_all_color' => 'blue',
  'see_all_label' => 'See All Sessions',
  'section_id'    => 'experts',
  'events'        => $home_experts,
  'type_color'    => 'blue',
  'type_token'    => 'expert',
]);
?>

<!-- ═══ MINI-COMMUNITY UPDATES ═══ -->
<section class="mfe-section-hero">
  <div class="mf-container">
    <div class="mf-hero-new">
      <div class="mf-hero-face bg-green">
        <img src="https://mini-talks.org/wp-content/uploads/2026/04/minitalks-logo-2.png" alt="" />
      </div>
      <div class="mf-hero-left">
        <h2 class="mf-title-contour green" style="font-size:clamp(24px,2.6vw,38px)">Mini-Community Updates</h2>
        <div class="mf-hero-bars">
          <span style="background:var(--mf-red)"></span>
          <span style="background:var(--mf-yellow)"></span>
          <span style="background:var(--mf-blue)"></span>
          <span style="background:var(--mf-green)"></span>
        </div>
        <p class="mf-hero-desc">News, stories, and milestones from across the Mini-Talks community — families, volunteers, Talk-Spots, and experts around the world.</p>
        <div class="mfe-section-hero-actions">
          <a href="<?php echo esc_url(add_query_arg('view','updates',$eurl));?>" class="mfe-see-all mfe-see-all-green">See All Updates</a>
        </div>
      </div>
    </div>
  </div>

  <div class="mfe-updates-section">
    <button class="mfe-arrow mfe-arrow-left" id="mfe-upd-prev" aria-label="Previous updates">‹</button>
    <div class="mfe-updates-viewport">
      <div class="mfe-updates-track" id="mfe-updates-track">
        <?php if ($updates): foreach ($updates as $u):
          $day = mfe_short_day($u->visible_date);
          $num = mfe_day_num($u->visible_date);
          $mon = mfe_short_mon($u->visible_date);
        ?>
        <div class="mfe-upd-card" data-date="<?php echo esc_attr($u->visible_date); ?>">
          <div class="mfe-upd-studs"></div>
          <div class="mfe-upd-frame">
            <div class="mfe-upd-inner">
              <div class="mfe-datebox mfe-db-green">
                <span class="mfe-d-day"><?php echo esc_html($day); ?></span>
                <span class="mfe-d-num"><?php echo esc_html($num); ?></span>
                <span class="mfe-d-mon"><?php echo esc_html($mon); ?></span>
              </div>
              <div class="mfe-upd-avatar">
                <?php if (!empty($u->user_id)): ?>
                  <?php echo mf_avatar_html((int)$u->user_id, 'md'); ?>
                <?php else: ?>
                  <img class="mf-av mf-av-md" src="<?php echo esc_url(Mini_Forum_Avatar::$default_avatar_url); ?>" alt="@<?php echo esc_attr($u->nickname); ?>" width="54" height="54" loading="lazy" />
                <?php endif; ?>
              </div>
              <div class="mfe-upd-text">
                <div class="mfe-upd-user">@<?php echo esc_html($u->nickname); ?></div>
                <div class="mfe-upd-msg"><?php echo esc_html($u->message); ?></div>
              </div>
            </div>
          </div>
        </div>
        <?php endforeach; else: ?>
        <div class="mfe-upd-card"><div class="mfe-upd-frame"><div class="mfe-upd-inner"><p style="margin:0;font-weight:700;color:#888">No updates yet.</p></div></div></div>
        <?php endif; ?>
      </div>
    </div>
    <button class="mfe-arrow mfe-arrow-right" id="mfe-upd-next" aria-label="Next updates">›</button>
  </div>
  <div class="mfe-dots" id="mfe-upd-dots"></div>
</section>

<!-- ═══ MINI-SPECIAL DAYS (ORANGE) ═══ -->
<section class="mfe-section-hero">
  <div class="mf-container">
    <div class="mf-hero-new">
      <div class="mf-hero-face bg-orange">
        <img src="https://mini-talks.org/wp-content/uploads/2026/04/minitalks-logo-2.png" alt="" />
      </div>
      <div class="mf-hero-left">
        <h2 class="mf-title-contour orange" style="font-size:clamp(24px,2.6vw,38px)">Mini-Special Days</h2>
        <div class="mf-hero-bars">
          <span style="background:var(--mf-red)"></span>
          <span style="background:var(--mf-yellow)"></span>
          <span style="background:var(--mf-blue)"></span>
          <span style="background:var(--mf-green)"></span>
        </div>
        <p class="mf-hero-desc">A year-round calendar of awareness days that bring attention to children's voices, communication, and inclusion.</p>
        <div class="mfe-section-hero-actions">
          <a href="<?php echo esc_url(add_query_arg('view','special-days',$eurl));?>" class="mfe-see-all mfe-see-all-black">See All Special Days</a>
        </div>
      </div>
    </div>
  </div>

  <div class="mf-container" style="margin-top:24px">
    <div class="mfe-sd-grid" id="mfe-sd-grid-home">
      <?php if ($special_days): foreach ($special_days as $s):
        $day = mfe_short_day($s->day_date);
        $num = mfe_day_num($s->day_date);
        $mon = mfe_short_mon($s->day_date);
        $accent = in_array($s->accent_color, ['blue','red','yellow','green','orange'], true) ? $s->accent_color : 'orange';
      ?>
      <a href="#" class="mfe-sd-card mfe-sd-<?php echo esc_attr($accent); ?> mfe-detail-btn"
         data-event-id="<?php echo (int)$s->id; ?>"
         data-event-type="specialday"
         data-month="<?php echo (int)$s->month_number; ?>"
         data-date="<?php echo esc_attr($s->day_date); ?>">
        <div class="mfe-datebox mfe-db-<?php echo esc_attr($accent); ?>">
          <span class="mfe-d-day"><?php echo esc_html($day); ?></span>
          <span class="mfe-d-num"><?php echo esc_html($num); ?></span>
          <span class="mfe-d-mon"><?php echo esc_html($mon); ?></span>
        </div>
        <div class="mfe-sd-name"><?php echo esc_html($s->title); ?></div>
      </a>
      <?php endforeach; endif; ?>
    </div>
  </div>
</section>

<!-- ═══ CTA BAND ═══ -->
<div class="mfe-cta-band">
  <div class="mfe-cta-inner">
    <a href="<?php echo esc_url(add_query_arg('view','workshops',$eurl));?>" class="mfe-cta-brick mfe-cta-red">
      <span class="mfe-cta-stud" aria-hidden="true"></span>
      <div class="mfe-cta-topbar"></div>
      <div class="mfe-cta-white">Join an Event</div>
    </a>
    <a href="/mini-community/join-us/?interest=talk-spot" class="mfe-cta-brick mfe-cta-green">
      <span class="mfe-cta-stud" aria-hidden="true"></span>
      <div class="mfe-cta-topbar"></div>
      <div class="mfe-cta-white">Become a Talk-Spot</div>
    </a>
    <a href="<?php echo esc_url(add_query_arg('view','host',$eurl));?>" class="mfe-cta-brick mfe-cta-blue">
      <span class="mfe-cta-stud" aria-hidden="true"></span>
      <div class="mfe-cta-topbar"></div>
      <div class="mfe-cta-white">Host a Workshop</div>
    </a>
  </div>
</div>

<!-- ═══ EVENT DETAIL POPUP ═══ -->
<div id="mfe-detail-overlay" role="dialog" aria-modal="true" aria-labelledby="mfe-detail-title">
  <div class="mfe-detail-wrapper">
    <div class="mfe-detail-studs"></div>
    <div class="mfe-detail-modal">
      <div class="mfe-detail-inner">
        <button type="button" class="mfe-detail-close" id="mfe-detail-close" aria-label="Close">×</button>
        <div id="mfe-detail-content"><!-- Filled by JS --></div>
      </div>
    </div>
    <div class="mfe-detail-scroll-cue" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
  </div>
</div>
