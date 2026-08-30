<?php
if (!defined('ABSPATH')) exit;
$eurl = function_exists('mf_get_events_url') ? mf_get_events_url() : get_permalink();

global $wpdb;
$tsd = $wpdb->prefix . 'mf_special_days';

$days = $wpdb->get_results("
  SELECT * FROM $tsd
  WHERE status='published'
  ORDER BY month_number ASC, day_date ASC
");

// Group by month
$grouped = [];
foreach ($days as $d) {
  $grouped[(int)$d->month_number][] = $d;
}

$month_names = [
  1=>'January',2=>'February',3=>'March',4=>'April',5=>'May',6=>'June',
  7=>'July',8=>'August',9=>'September',10=>'October',11=>'November',12=>'December'
];

function mfe_sd_short_day($dt){ return ucfirst(strtolower(date('D', strtotime($dt)))); }
function mfe_sd_day_num($dt){ return date('d', strtotime($dt)); }
function mfe_sd_short_mon($dt){ return ucfirst(strtolower(date('M', strtotime($dt)))); }
?>

<!-- ═══ HERO ═══ -->
<div class="mf-container">
  <div style="display:flex;align-items:center;gap:14px;margin:30px 0 16px">
    <a href="<?php echo esc_url($eurl); ?>" class="mfe-back">‹ Mini-Events</a>
  </div>
  <div class="mf-hero-new">
    <div class="mf-hero-left">
      <h1 class="mf-title-contour">Mini-Special Days</h1>
      <div class="mf-hero-bars">
        <span style="background:var(--mf-red)"></span>
        <span style="background:var(--mf-yellow)"></span>
        <span style="background:var(--mf-blue)"></span>
        <span style="background:var(--mf-green)"></span>
      </div>
      <p class="mf-hero-desc">A year-round calendar of awareness days that bring attention to children's voices, communication, and inclusion.</p>
    </div>
    <div class="mf-hero-face">
      <img src="https://mini-talks.org/wp-content/uploads/2026/04/minitalks-logo-2.png" alt="Mini-Talks" />
    </div>
  </div>
</div>

<!-- ═══ MONTH NAVIGATION ═══ -->
<?php $today_month_int = (int)date('n'); $auto_month = $today_month_int; ?>
<div class="mf-container" style="margin-top:30px">
  <div class="mfe-sd-monthbar" data-auto-month="<?php echo (int)$auto_month; ?>">
    <div class="mfe-sd-monthwrap">
      <button class="mfe-sd-monthselect" type="button" id="mfe-sd-monthbtn">
        <span class="mfe-sd-monthselect-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
        </span>
        <span class="mfe-sd-monthbtn-label">Month Selection</span>
      </button>
    </div>
    <div class="mfe-sd-monthnav">
      <a href="#" class="mfe-sd-fl-chip mfe-sd-mode" data-mode="this">
        <span class="mfe-sd-fl-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
        </span>
        From This Month
      </a>
      <a href="#" class="mfe-sd-fl-chip mfe-sd-mode" data-mode="first">
        <span class="mfe-sd-fl-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l7-7 7 7M12 2v20"/></svg>
        </span>
        From First Month
      </a>
    </div>
  </div>
</div>

<!-- ═══ MONTHS LIST ═══ -->
<?php $today_month = (int)date('n'); ?>
<div class="mf-container mfe-sd-list-wrap" style="margin-top:40px">
  <?php foreach ($month_names as $mn => $mname):
    $items = $grouped[$mn] ?? [];
    $is_empty = empty($items);
    $is_past = $mn < $today_month;
    $section_classes = 'mfe-sd-month';
    if ($is_past) $section_classes .= ' mfe-sd-month-past';
    if ($is_empty) $section_classes .= ' mfe-sd-month-empty';
  ?>
  <section class="<?php echo esc_attr($section_classes); ?>" id="month-<?php echo $mn; ?>" data-month-num="<?php echo $mn; ?>">
    <div class="mfe-sd-monthhead-wide">
      <div class="mfe-sd-bars-left">
        <span class="l1-bar-red"></span>
        <span class="l1-bar-yellow"></span>
        <span class="l1-bar-blue"></span>
        <span class="l1-bar-green"></span>
      </div>
      <h2 class="mf-title-contour mfe-sd-monthtitle"><?php echo esc_html($mname . ' ' . date('Y')); ?></h2>
      <div class="mfe-sd-bars-right">
        <span class="l1-bar-red"></span>
        <span class="l1-bar-yellow"></span>
        <span class="l1-bar-blue"></span>
        <span class="l1-bar-green"></span>
      </div>
    </div>
    <div class="mfe-sd-list">
      <?php if ($is_empty): ?>
        <div class="mfe-sd-empty-card">No special days for this month yet.</div>
      <?php else: foreach ($items as $d):
        $accent = in_array($d->accent_color, ['blue','red','yellow','green','orange'], true) ? $d->accent_color : 'orange';
      ?>
      <div class="mfe-sd-row mfe-sd-row-<?php echo esc_attr($accent); ?>">
        <div class="mfe-datebox mfe-db-<?php echo esc_attr($accent); ?>">
          <span class="mfe-d-day"><?php echo esc_html(mfe_sd_short_day($d->day_date)); ?></span>
          <span class="mfe-d-num"><?php echo esc_html(mfe_sd_day_num($d->day_date)); ?></span>
          <span class="mfe-d-mon"><?php echo esc_html(mfe_sd_short_mon($d->day_date)); ?></span>
        </div>
        <div class="mfe-sd-content">
          <h3><?php echo esc_html($d->title); ?></h3>
          <div class="mfe-sd-content-desc"><?php echo wp_kses_post($d->description); ?></div>
          <?php
            $imgs = [];
            if (!empty($d->images)) {
              $decoded = json_decode($d->images, true);
              if (is_array($decoded)) $imgs = $decoded;
            }
            if (!empty($imgs)):
          ?>
          <div class="mfe-sd-photos">
            <?php foreach ($imgs as $img_url): ?>
              <span class="mfe-sd-photo" style="background-image:url('<?php echo esc_url($img_url); ?>');background-size:cover;background-position:center"></span>
            <?php endforeach; ?>
          </div>
          <?php endif; ?>
        </div>
      </div>
      <?php endforeach; endif; ?>
    </div>
  </section>
  <?php endforeach; ?>
</div>
