<?php
if (!defined('ABSPATH')) exit;
$eurl = function_exists('mf_get_events_url') ? mf_get_events_url() : get_permalink();
$view = sanitize_text_field($_GET['view'] ?? 'meetups');

global $wpdb;
$te = $wpdb->prefix . 'mf_events';
$tp = $wpdb->prefix . 'mf_event_participants';

/* ── View-specific config ─────────────────────────────── */
$views_config = [
  'meetups'   => [
    'title'         => 'Mini-Family Meetups',
    'sub'           => 'Family gatherings at Talk-Spots or online — with or without children — where families find peer-support, share experiences, and know they are not alone.',
    'hero_color'    => 'yellow',
    'frame'         => 'yellow',
    'event_type'    => 'meetup',
    'this_label'    => 'Meetups',
    'how_title'     => 'What Happens in a Meetup?',
    'how_sub'       => 'Our meetups are informal, relaxed, and pressure-free.',
    'how_blocks'    => [
      ['With or Without Children',  'Adults welcome to come solo.'],
      ['Family-Led',                'Conversations grow from shared experience.'],
      ['Online or In-Person',       'Both formats supported.'],
      ['About 90 Minutes',          'Time for real conversation.'],
      ['Confidential',              'What is shared stays among families.'],
      ['Open Across Differences',   'SM, autism, language, more.'],
      ['Peer Support',              'You are not alone.'],
      ['Light Structure',           'Conversation flows freely.'],
    ],
    'locations'     => [
      ['Izmir Talk-Spot', 'Safe, welcoming spaces',         'red'],
      ['Schools',         'In collaboration with schools',   'blue'],
      ['Community Spaces','Parks, centers, and more',        'yellow'],
      ['Online',          'Join from anywhere',              'green'],
    ],
    'banner_text'   => 'Every meetup is a space where families share, observe, and support each other. Together, we are stronger.',
    'cta_join_text' => 'Find a meetup near you and become part of our growing community.',
    'cta_host_text' => 'Create a safe space for families in your school, community, or city.',
    'card_btn'      => 'Join Meetup',
    'count_label'   => 'members',
  ],
  'workshops' => [
    'title'         => 'Mini-Volunteer Workshops',
    'sub'           => 'Guided play sessions at Talk-Spots, where children spend pressure-free time with Mini-Volunteers. Mini-Kits and the App & Studio may join the play, while families observe quietly nearby.',
    'hero_color'    => 'red',
    'frame'         => 'red',
    'event_type'    => 'workshop',
    'this_label'    => 'Workshops',
    'how_title'     => 'What Happens in a Workshop?',
    'how_sub'       => 'Mini-Workshops are gentle, structured, and low-pressure.',
    'how_blocks'    => [
      ['1:1 or Small Group',       'Up to 4 children per session.'],
      ['Mini-Volunteers Present',  'Trusted volunteers guide the moments.'],
      ['At a Talk-Spot',           'A familiar in-person setting.'],
      ['About 60 Minutes',         'Short and predictable.'],
      ['No Pressure to Speak',     'Communication at the child\'s pace.'],
      ['Family Observes',          'Parents stay close, not in the play.'],
      ['Mini-Kits & Studio',       'Supportive tools when they help.'],
      ['Same Routine Each Time',   'Predictable flow.'],
    ],
    'locations'     => [
      ['Izmir Talk-Spot', 'In partner venues',          'red'],
      ['Schools',         'Inside school programs',     'blue'],
      ['Community Spaces','Local community centers',    'yellow'],
      ['Online',          'Remote 1:1 sessions',        'green'],
    ],
    'banner_text'   => 'Workshops are small, calm spaces — gentle moments shaped around the child, not the schedule.',
    'cta_join_text' => 'Find a workshop near you and join a small, supportive session.',
    'cta_host_text' => 'Host a Mini-Workshop as a Mini-Volunteer or partner venue.',
    'card_btn'      => 'Join Workshop',
    'count_label'   => 'members',
  ],
  'experts'   => [
    'title'         => 'Mini-Expert Sessions',
    'sub'           => 'Online sessions where clinicians, educators, and researchers share knowledge with the Mini-Talks community.',
    'hero_color'    => 'blue',
    'frame'         => 'blue',
    'event_type'    => 'expert_session',
    'this_label'    => 'Sessions',
    'how_title'     => 'What Happens in a Session?',
    'how_sub'       => 'Sessions are informative, calm, and family-friendly.',
    'how_blocks'    => [
      ['All Members Welcome',  'Open to the whole community.'],
      ['Expert-Led',           'Clinicians, educators, researchers.'],
      ['Online Format',        'Join from anywhere.'],
      ['45–60 Minutes',        'Short, focused talks.'],
      ['Knowledge, Not Advice','Learning, not personal counseling.'],
      ['Focused Topics',       'One subject per session.'],
      ['Recorded for Later',   'Watch live or revisit.'],
      ['Resources Shared',     'Slides and references after each.'],
    ],
    'locations'     => [
      ['Izmir Talk-Spot', 'Selected partner venues',    'red'],
      ['Online',          'Live web sessions',          'blue'],
      ['Recorded',        'Watch when you can',         'yellow'],
      ['Q&A Forum',       'Follow-up conversations',    'green'],
    ],
    'banner_text'   => 'Each session is a calm space to listen, ask, and reflect — no pressure, no judgment.',
    'cta_join_text' => 'Join a session and learn from real, lived experience.',
    'cta_host_text' => 'Host a Mini-Expert Session and share what you have learned.',
    'card_btn'      => 'Join Session',
    'count_label'   => 'members',
  ],
];
$cfg = $views_config[$view] ?? $views_config['meetups'];

/* ── Filters ──────────────────────────────────────────── */
$filter_city = sanitize_text_field($_GET['city'] ?? 'all');
$filter_month_raw = sanitize_text_field($_GET['month'] ?? '');
// Month filter is OPTIONAL — empty means "no month restriction" (show all months).
// Only apply if user explicitly chose a valid YYYY-MM value.
$filter_month = ($filter_month_raw && preg_match('/^\d{4}-\d{2}$/', $filter_month_raw)) ? $filter_month_raw : '';

/* ── Build list of months that actually have events for this type ──────── */
// Returns ['2026-04' => 'April 2026', '2026-05' => 'May 2026', ...] sorted desc
$avail_months_rows = $wpdb->get_results($wpdb->prepare("
  SELECT DISTINCT DATE_FORMAT(start_datetime, '%%Y-%%m') AS ym
  FROM $te
  WHERE event_type=%s AND status IN ('published','completed')
  ORDER BY ym DESC
", $cfg['event_type']));
$avail_months = [];
foreach ($avail_months_rows as $r) {
    $ym = $r->ym;
    $avail_months[$ym] = date('F Y', strtotime($ym . '-01'));
}

/* ── Query Upcoming + Past + Cross-type events ──────────── */
$where_city = ($filter_city !== 'all') ? $wpdb->prepare(' AND city = %s', $filter_city) : '';

// Optional month filter (YYYY-MM) — when set, restricts to that month only
$where_month = '';
if ($filter_month && preg_match('/^(\d{4})-(\d{2})$/', $filter_month, $m)) {
    $month_start = sprintf('%04d-%02d-01 00:00:00', (int)$m[1], (int)$m[2]);
    $month_end   = date('Y-m-t 23:59:59', strtotime($month_start));
    $where_month = $wpdb->prepare(' AND start_datetime BETWEEN %s AND %s', $month_start, $month_end);
}

// Upcoming = events today or in the future (DB-side date comparison)
$up_events = $wpdb->get_results($wpdb->prepare("
  SELECT * FROM $te
  WHERE event_type=%s AND status IN ('published','completed')
    AND DATE(start_datetime) >= CURDATE()
    $where_city
    $where_month
  ORDER BY start_datetime ASC LIMIT 30
", $cfg['event_type']));

// Past = events before today (newest first so the slider's first card is the most recent past)
$past_events = $wpdb->get_results($wpdb->prepare("
  SELECT * FROM $te
  WHERE event_type=%s AND status IN ('published','completed')
    AND DATE(start_datetime) < CURDATE()
    $where_city
    $where_month
  ORDER BY start_datetime DESC LIMIT 30
", $cfg['event_type']));

// You May Also Like — pick events from BOTH other event types (not just one)
// Workshop page → meetup + expert ; Meetup page → workshop + expert ; Expert page → workshop + meetup
$all_types = ['workshop','meetup','expert_session'];
$other_types_arr = array_values(array_diff($all_types, [$cfg['event_type']]));
$other_frame_map = ['workshop'=>'red', 'meetup'=>'yellow', 'expert_session'=>'blue'];
$other_label_map = [
  'workshop' => 'Workshop',
  'meetup'   => 'Meetup',
  'expert_session' => 'Expert Session',
];
$other_btn_map = [
  'workshop' => 'Join Workshop',
  'meetup'   => 'Join Meetup',
  'expert_session' => 'Join Session',
];

// Fetch up to 2 from each other type, then merge & sort by date, take first 3
$other_events_pool = [];
foreach ($other_types_arr as $ot) {
    $rows = $wpdb->get_results($wpdb->prepare("
      SELECT * FROM $te
      WHERE event_type=%s AND status IN ('published','completed')
        AND DATE(start_datetime) >= CURDATE()
      ORDER BY start_datetime ASC LIMIT 2
    ", $ot));
    foreach ($rows as $r) {
        $r->_other_type = $ot;
        $other_events_pool[] = $r;
    }
}
// Sort the pool by date so closest upcoming events come first
usort($other_events_pool, function($a, $b){
    return strcmp($a->start_datetime, $b->start_datetime);
});
$other_events = array_slice($other_events_pool, 0, 3);

// Helpers
function mfe_evcard_short_day($dt){ return strtoupper(date('D', strtotime($dt))); }
function mfe_evcard_day_num($dt){ return date('d', strtotime($dt)); }
function mfe_evcard_short_mon($dt){ return strtoupper(date('M', strtotime($dt))); }
function mfe_evcard_time($dt){ return date('g:i A', strtotime($dt)); }

function mfe_render_event_card($ev, $cfg, $tp_table, $idx = 0) {
  global $wpdb;
  $count = (int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $tp_table WHERE event_id=%d AND status='joined'", $ev->id));
  $img = $ev->cover_image_url ?: '';
  // Use TYPE color (red=workshop, yellow=meetup, blue=expert) for visual consistency
  $frame = $cfg['frame'] ?? 'green';

  // Get up to 3 most recent joined avatars
  $avatars = class_exists('Mini_Forum_AJAX') ? Mini_Forum_AJAX::get_event_avatars($ev->id, 3) : [];
  $extra   = max(0, $count - count($avatars));

  // Check if current user already joined
  $current_user_joined = false;
  if (is_user_logged_in()) {
    $uid = get_current_user_id();
    $current_user_joined = (bool)$wpdb->get_var($wpdb->prepare("SELECT 1 FROM $tp_table WHERE event_id=%d AND user_id=%d AND status='joined'", $ev->id, $uid));
  }

  $is_disabled = in_array($ev->status, ['completed','cancelled'], true);
  // Status appears on the BUTTON (so users know it's past/cancelled),
  // but never as an overlay on the photo.
  $btn_label = $is_disabled ? ucfirst($ev->status)
             : ($current_user_joined ? 'Joined ✓' : $cfg['card_btn']);
  ?>
  <div class="mfe-frame-card<?php echo $img ? '' : ' mfe-frame-card-noimg'; ?>">
    <div class="mfe-frame-studs mfe-stud-<?php echo esc_attr($frame); ?>"></div>
    <div class="mfe-frame-body mfe-frame-<?php echo esc_attr($frame); ?>">
      <div class="mfe-frame-inner">
        <?php if ($img): ?>
        <div class="mfe-evcard-img mfe-evcard-img-has mfe-evcard-img-bdr-<?php echo esc_attr($frame); ?>">
          <img src="<?php echo esc_url($img); ?>" alt="" />
          <div class="mfe-datebox mfe-db-<?php echo esc_attr($frame); ?> mfe-db-noborder" style="position:absolute;top:12px;left:12px">
            <span class="mfe-d-day"><?php echo mfe_evcard_short_day($ev->start_datetime); ?></span>
            <span class="mfe-d-num"><?php echo mfe_evcard_day_num($ev->start_datetime); ?></span>
            <span class="mfe-d-mon"><?php echo mfe_evcard_short_mon($ev->start_datetime); ?></span>
          </div>
        </div>
        <?php endif; ?>
        <div class="mfe-evcard-body">
          <?php if (!$img): ?>
          <div class="mfe-evcard-headerow">
            <div class="mfe-datebox mfe-db-<?php echo esc_attr($frame); ?>">
              <span class="mfe-d-day"><?php echo mfe_evcard_short_day($ev->start_datetime); ?></span>
              <span class="mfe-d-num"><?php echo mfe_evcard_day_num($ev->start_datetime); ?></span>
              <span class="mfe-d-mon"><?php echo mfe_evcard_short_mon($ev->start_datetime); ?></span>
            </div>
            <h3 class="mfe-evcard-title mfe-evcard-title-inline"><?php echo esc_html($ev->title); ?></h3>
          </div>
          <?php else: ?>
          <h3 class="mfe-evcard-title"><?php echo esc_html($ev->title); ?></h3>
          <?php endif; ?>
          <div class="mfe-evcard-meta">
            <span class="mfe-evcard-meta-item">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              <?php echo esc_html(mfe_evcard_time($ev->start_datetime)); ?>
            </span>
            <?php if ($ev->location_name): ?>
            <span class="mfe-evcard-meta-item">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>
              <?php echo esc_html($ev->location_name); ?>
            </span>
            <?php endif; ?>
          </div>
          <span class="mfe-evcard-sep"></span>
          <p class="mfe-evcard-desc"><?php
            $allowed = ['strong'=>[],'b'=>[],'em'=>[],'i'=>[],'u'=>[],'br'=>[],'span'=>['style'=>true],'a'=>['href'=>true,'target'=>true,'rel'=>true]];
            echo wp_kses($ev->short_description ?: 'Lorem ipsum dolor sit amet consectetur. Orci a est varius nisi proin viverra quam elementum tellus. Et bibendum ac tristique tempus.', $allowed);
          ?></p>
          <div class="mfe-evcard-foot">
            <div class="mfe-evcard-avatars" data-event-id="<?php echo (int)$ev->id; ?>">
              <?php foreach ($avatars as $a): ?>
                <span class="mfe-evcard-av" title="<?php echo esc_attr($a['name']); ?>" style="background-image:url('<?php echo esc_url($a['url']); ?>');background-size:cover;background-position:center"></span>
              <?php endforeach; ?>
              <?php if ($extra > 0): ?><span class="mfe-evcard-av-more">+<?php echo $extra; ?></span><?php endif; ?>
              <span class="mfe-evcard-count"><span class="mfe-evcard-count-num"><?php echo $count; ?></span> <?php echo esc_html($cfg['count_label']); ?></span>
            </div>
          </div>
          <div class="mfe-evcard-btnrow">
            <button type="button" class="mfe-evcard-btn-details det-<?php echo esc_attr($frame); ?> mfe-detail-btn"
                    data-event-id="<?php echo (int)$ev->id; ?>"
                    data-event-type="<?php echo esc_attr($cfg['event_type'] === 'expert_session' ? 'expert' : $cfg['event_type']); ?>">See Details</button>
            <button type="button" class="mfe-evcard-btn mfe-btn-<?php echo esc_attr($frame); ?> mfe-join-btn<?php echo $current_user_joined ? ' is-joined' : ''; ?>"
                    data-event-id="<?php echo (int)$ev->id; ?>"
                    data-default-label="<?php echo esc_attr($cfg['card_btn']); ?>"
                    <?php echo $is_disabled ? 'disabled' : ''; ?>><?php echo esc_html($btn_label); ?></button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <?php
}
?>

<!-- ═══ HERO ═══ -->
<div class="mf-container">
  <div style="display:flex;align-items:center;gap:14px;margin:30px 0 16px">
    <a href="<?php echo esc_url($eurl); ?>" class="mfe-back">‹ Mini-Events</a>
  </div>
  <div class="mf-hero-new">
    <div class="mf-hero-left">
      <h1 class="mf-title-contour <?php echo esc_attr($cfg['hero_color']); ?>"><?php echo esc_html($cfg['title']); ?></h1>
      <div class="mf-hero-bars">
        <span style="background:var(--mf-red)"></span>
        <span style="background:var(--mf-yellow)"></span>
        <span style="background:var(--mf-blue)"></span>
        <span style="background:var(--mf-green)"></span>
      </div>
      <p class="mf-hero-desc"><?php echo esc_html($cfg['sub']); ?></p>
      <div class="mfe-connect-row">
        <a href="<?php echo esc_url(home_url('/mini-volunteers/')); ?>" class="mfe-connect-chip mfe-connect-green">
          <span class="mfe-connect-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 21c0-3.5 3-6 7-6s7 2.5 7 6"/></svg>
          </span>
          Connect
        </a>
        <a href="<?php echo esc_url(home_url('/mini-community/')); ?>" class="mfe-connect-chip mfe-connect-blue">
          <span class="mfe-connect-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a3 3 0 0 1-3 3H8l-5 4V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3z"/></svg>
          </span>
          Connect
        </a>
        <a href="<?php echo esc_url(home_url('/real-stories/')); ?>" class="mfe-connect-chip mfe-connect-purple">
          <span class="mfe-connect-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.5-7-10a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.5-7 10-7 10z" fill="currentColor"/></svg>
          </span>
          Connect
        </a>
      </div>
    </div>
    <div class="mf-hero-face">
      <img src="https://mini-talks.org/wp-content/uploads/2026/04/minitalks-logo-2.png" alt="Mini-Talks" />
    </div>
  </div>
</div>

<!-- ═══ WHAT HAPPENS IN A [X]? — pastel band with colored border + image-left blocks ═══ -->
<div class="mf-container" style="margin-top:24px">
  <div class="mfe-whatpens mfe-whatpens-<?php echo esc_attr($cfg['frame']); ?>">
    <h3 class="mfe-whatpens-title"><?php echo esc_html($cfg['how_title']); ?></h3>
    <p class="mfe-whatpens-sub"><?php echo esc_html($cfg['how_sub']); ?></p>
    <div class="mfe-whatpens-grid">
      <?php foreach ($cfg['how_blocks'] as $b): ?>
      <div class="mfe-whatpens-block">
        <div class="mfe-whatpens-img" aria-hidden="true"></div>
        <div class="mfe-whatpens-text">
          <h4><?php echo esc_html($b[0]); ?></h4>
          <p><?php echo esc_html($b[1]); ?></p>
        </div>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</div>

<!-- ═══ FILTER ROW ═══ -->
<?php
  // Active filter month: pre-resolve the label (e.g. "April 2026") if a month is selected.
  // Always format it nicely from the YYYY-MM value, regardless of whether it appears
  // in the available-months list (the URL might carry an arbitrary value).
  $active_month_label = '';
  if ($filter_month && preg_match('/^(\d{4})-(\d{2})$/', $filter_month)) {
      $active_month_label = date('F Y', strtotime($filter_month . '-01'));
  }
?>
<div class="mf-container" style="margin-top:48px">
  <form class="mfe-filterbar" method="get" action="<?php echo esc_url($eurl); ?>" id="mfe-eventtype-filter">
    <input type="hidden" name="view" value="<?php echo esc_attr($view); ?>" />
    <input type="hidden" name="month" value="<?php echo esc_attr($filter_month); ?>" id="mfe-et-month-input" />
    <input type="hidden" name="city" value="<?php echo esc_attr($filter_city); ?>" id="mfe-et-city-input" />

    <!-- Month dropdown (Updates-style) -->
    <div class="mfe-sd-monthwrap" style="position:relative">
      <button class="mfe-sd-monthselect" type="button" id="mfe-et-monthbtn">
        <span class="mfe-sd-monthselect-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
        </span>
        <span class="mfe-sd-monthbtn-label"><?php echo esc_html($active_month_label ?: 'Month Selection'); ?></span>
      </button>
      <div class="mfe-sd-monthdd" id="mfe-et-monthdd" hidden>
        <a href="#" class="mfe-sd-monthdd-item" data-month="">All Months</a>
        <?php foreach ($avail_months as $ym => $label): ?>
          <a href="#" class="mfe-sd-monthdd-item<?php echo $filter_month === $ym ? ' is-active' : ''; ?>" data-month="<?php echo esc_attr($ym); ?>"><?php echo esc_html($label); ?></a>
        <?php endforeach; ?>
      </div>
    </div>

    <div class="mfe-filter-cities">
      <button type="button" class="mfe-fchip mfe-fchip-blue mfe-et-city <?php echo $filter_city==='all'?'active':''; ?>" data-city="all">
        <span class="mfe-fpin" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 22s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5" fill="#fff"/></svg></span>
        All Locations
      </button>
      <button type="button" class="mfe-fchip mfe-fchip-yellow mfe-et-city <?php echo $filter_city==='Izmir'?'active':''; ?>" data-city="Izmir">
        <span class="mfe-fpin" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 22s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5" fill="#fff"/></svg></span>
        Izmir
      </button>
      <button type="button" class="mfe-fchip mfe-fchip-red mfe-et-city <?php echo $filter_city==='Istanbul'?'active':''; ?>" data-city="Istanbul">
        <span class="mfe-fpin" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 22s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5" fill="#fff"/></svg></span>
        Istanbul
      </button>
      <button type="button" class="mfe-fchip mfe-fchip-mono mfe-et-city <?php echo $filter_city==='Online'?'active':''; ?>" data-city="Online">
        <span class="mfe-fpin" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="1.5"/><path d="M8 21h8M12 17v4"/></svg></span>
        Online
      </button>
    </div>
  </form>
</div>

<!-- ═══ UPCOMING — hidden when a past month is selected ═══ -->
<?php
  // Determine if the selected month is in the past (whole month already over)
  $selected_month_is_past = false;
  if ($filter_month && preg_match('/^(\d{4})-(\d{2})$/', $filter_month, $_m)) {
      $sel_end = date('Y-m-t', strtotime($filter_month . '-01'));
      $selected_month_is_past = ($sel_end < date('Y-m-d'));
  }
?>
<?php if (!$selected_month_is_past): ?>
<?php $up_count = is_array($up_events) ? count($up_events) : 0; ?>
<div class="mf-container" style="margin-top:40px">
  <h2 class="mf-title-contour <?php echo esc_attr($cfg['hero_color']); ?> mfe-section-h" style="font-size:clamp(22px,2.4vw,36px);margin-bottom:0">Upcoming <?php echo esc_html($cfg['this_label']); ?></h2>
  <?php if ($up_count === 0): ?>
    <p class="mfe-empty">No upcoming <?php echo esc_html(strtolower($cfg['this_label'])); ?> scheduled.</p>
  <?php elseif ($up_count > 3): ?>
    <div class="mfe-evsec-slider mfe-evsec-inline" data-section="up-<?php echo esc_attr($cfg['event_type']); ?>">
      <button class="mfe-arrow mfe-arrow-left mfe-evsec-prev" aria-label="Previous" type="button">‹</button>
      <div class="mfe-evsec-viewport">
        <div class="mfe-evsec-track">
          <?php foreach ($up_events as $i => $ev) mfe_render_event_card($ev, $cfg, $tp, $i); ?>
        </div>
      </div>
      <button class="mfe-arrow mfe-arrow-right mfe-evsec-next" aria-label="Next" type="button">›</button>
    </div>
  <?php else: ?>
    <div class="mfe-evcards-grid">
      <?php foreach ($up_events as $i => $ev) mfe_render_event_card($ev, $cfg, $tp, $i); ?>
    </div>
  <?php endif; ?>
</div>
<?php endif; ?>

<!-- ═══ PAST — hidden when a future month is selected ═══ -->
<?php
  // A month is considered "fully in the future" only if its first day is after the
  // LAST day of the current month — i.e. nothing of that month overlaps with today.
  $selected_month_is_future = false;
  if ($filter_month && preg_match('/^(\d{4})-(\d{2})$/', $filter_month, $_m)) {
      $sel_start = $filter_month . '-01';
      $current_month_end = date('Y-m-t');
      $selected_month_is_future = ($sel_start > $current_month_end);
  }
?>
<?php if (!$selected_month_is_future): ?>
<?php $past_count = is_array($past_events) ? count($past_events) : 0; ?>
<div class="mf-container" style="margin-top:40px">
  <h2 class="mf-title-contour black mfe-section-h" style="font-size:clamp(22px,2.4vw,36px);margin-bottom:0">Past <?php echo esc_html($cfg['this_label']); ?></h2>
  <?php if ($past_count === 0): ?>
    <p class="mfe-empty">No past <?php echo esc_html(strtolower($cfg['this_label'])); ?> match this filter.</p>
  <?php elseif ($past_count > 3): ?>
    <div class="mfe-evsec-slider mfe-evsec-inline" data-section="past-<?php echo esc_attr($cfg['event_type']); ?>">
      <button class="mfe-arrow mfe-arrow-left mfe-evsec-prev" aria-label="Previous" type="button">‹</button>
      <div class="mfe-evsec-viewport">
        <div class="mfe-evsec-track">
          <?php foreach ($past_events as $i => $ev) mfe_render_event_card($ev, $cfg, $tp, $i); ?>
        </div>
      </div>
      <button class="mfe-arrow mfe-arrow-right mfe-evsec-next" aria-label="Next" type="button">›</button>
    </div>
  <?php else: ?>
    <div class="mfe-evcards-grid">
      <?php foreach ($past_events as $i => $ev) mfe_render_event_card($ev, $cfg, $tp, $i); ?>
    </div>
  <?php endif; ?>
</div>
<?php endif; ?>

<!-- ═══ YOU MAY ALSO LIKE — events from BOTH other categories ═══ -->
<?php if ($other_events): ?>
<div class="mf-container" style="margin-top:40px">
  <h2 class="mf-title-contour black mfe-section-h" style="font-size:clamp(22px,2.4vw,36px);margin-bottom:0">You May Also Like</h2>
  <div class="mfe-evcards-grid">
    <?php
      foreach ($other_events as $i => $ev) {
        $ot = $ev->_other_type;
        $other_cfg = $cfg;
        $other_cfg['frame']       = $other_frame_map[$ot] ?? 'green';
        $other_cfg['card_btn']    = $other_btn_map[$ot] ?? 'Join';
        $other_cfg['count_label'] = 'members';
        $other_cfg['event_type']  = $ot;
        mfe_render_event_card($ev, $other_cfg, $tp, $i);
      }
    ?>
  </div>
</div>
<?php endif; ?>

<!-- ═══ JOIN + HOST CTAs — fully colored bg + black thick bottom + white-outline button ═══ -->
<div class="mf-container" style="margin-top:60px;margin-bottom:40px">
  <div class="mfe-dual-cta">
    <a href="#" class="mfe-jh-card mfe-jh-green-filled">
      <div class="mfe-jh-icon"></div>
      <div class="mfe-jh-body">
        <h3 class="mfe-jh-title">Join a <?php echo esc_html(rtrim($cfg['this_label'],'s')); ?></h3>
        <p class="mfe-jh-desc"><?php echo esc_html($cfg['cta_join_text']); ?></p>
        <span class="mfe-jh-btn">View <?php echo esc_html(rtrim($cfg['this_label'],'s')); ?></span>
      </div>
    </a>
    <a href="<?php echo esc_url(add_query_arg('view','host',$eurl)); ?>" class="mfe-jh-card mfe-jh-blue-filled">
      <div class="mfe-jh-icon"></div>
      <div class="mfe-jh-body">
        <h3 class="mfe-jh-title">Host a <?php echo esc_html(rtrim($cfg['this_label'],'s')); ?></h3>
        <p class="mfe-jh-desc"><?php echo esc_html($cfg['cta_host_text']); ?></p>
        <span class="mfe-jh-btn">Learn How</span>
      </div>
    </a>
  </div>
</div>

<!-- ═══ EVENT DETAIL POPUP (shared with home page) ═══ -->
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
